const Submission = require('../models/SubmissionSchema');
const MCQ = require('../models/MCQQuestion');
const Exam = require('../models/Exam');
const User = require('../models/usermodel');

/**
 * Calculate comprehensive performance analytics for a student across all exams
 * @param {String} studentId - MongoDB ObjectId of the student
 * @returns {Object} Performance data including classification stats and overall metrics
 */
async function calculateStudentPerformance(studentId) {
  try {
    // Fetch all submissions for the student
    const submissions = await Submission.find({ student: studentId })
      .populate('exam')
      .sort({ submittedAt: -1 })
      .lean()
      .exec();

    if (!submissions || submissions.length === 0) {
      return {
        hasData: false,
        message: 'No exam submissions found for this student'
      };
    }

    // Initialize classification statistics object
    const classificationStats = {};
    let totalQuestionsAttempted = 0;
    let totalQuestionsCorrect = 0;
    let totalMarksObtained = 0;
    let totalMarksAvailable = 0;

    // Process each submission
    for (const submission of submissions) {
      if (!submission.exam || !submission.exam.mcqQuestions) continue;

      // Fetch MCQ questions for this exam
      const mcqQuestions = await MCQ.find({
        _id: { $in: submission.exam.mcqQuestions }
      })
        .select('_id classification correctAnswer marks options')
        .lean()
        .exec();

      // Create a map for quick question lookup
      const questionMap = {};
      mcqQuestions.forEach(q => {
        questionMap[q._id.toString()] = q;
      });

      // Process each answer
      if (submission.mcqAnswers && Array.isArray(submission.mcqAnswers)) {
        for (const answer of submission.mcqAnswers) {
          const question = questionMap[answer.questionId.toString()];

          if (!question) continue;

          // Get classification (default to "Unclassified" if not set)
          const classification = question.classification || 'Unclassified';

          // Initialize classification stats if not exists
          if (!classificationStats[classification]) {
            classificationStats[classification] = {
              classification: classification,
              totalAttempted: 0,
              correctAnswers: 0,
              incorrectAnswers: 0,
              totalMarks: 0,
              obtainedMarks: 0,
              accuracy: 0,
              scorePercentage: 0
            };
          }

          // Check if answer is correct
          const isCorrect = checkAnswerCorrectness(
            answer.selectedOption,
            question.correctAnswer,
            question.options
          );

          // Update classification statistics
          classificationStats[classification].totalAttempted++;
          totalQuestionsAttempted++;

          if (isCorrect) {
            classificationStats[classification].correctAnswers++;
            totalQuestionsCorrect++;
            const marks = question.marks || 1;
            classificationStats[classification].obtainedMarks += marks;
            totalMarksObtained += marks;
          } else {
            classificationStats[classification].incorrectAnswers++;
          }

          const marks = question.marks || 1;
          classificationStats[classification].totalMarks += marks;
          totalMarksAvailable += marks;
        }
      }
    }

    // Calculate percentages and categorize performance for each classification
    const classificationArray = [];
    for (const [classification, stats] of Object.entries(classificationStats)) {
      stats.accuracy = stats.totalAttempted > 0
        ? (stats.correctAnswers / stats.totalAttempted) * 100
        : 0;

      stats.scorePercentage = stats.totalMarks > 0
        ? (stats.obtainedMarks / stats.totalMarks) * 100
        : 0;

      stats.performanceLevel = categorizePerformance(stats.accuracy);
      stats.performanceColor = getPerformanceColor(stats.accuracy);

      classificationArray.push(stats);
    }

    // Sort by accuracy (highest first)
    classificationArray.sort((a, b) => b.accuracy - a.accuracy);

    // Categorize into performance groups
    const strongAreas = classificationArray.filter(c => c.accuracy >= 80);
    const moderateAreas = classificationArray.filter(c => c.accuracy >= 60 && c.accuracy < 80);
    const weakAreas = classificationArray.filter(c => c.accuracy < 60);

    // Calculate overall metrics
    const overallAccuracy = totalQuestionsAttempted > 0
      ? (totalQuestionsCorrect / totalQuestionsAttempted) * 100
      : 0;

    const overallScorePercentage = totalMarksAvailable > 0
      ? (totalMarksObtained / totalMarksAvailable) * 100
      : 0;

    return {
      hasData: true,
      overall: {
        totalExams: submissions.length,
        totalQuestionsAttempted,
        totalQuestionsCorrect,
        totalQuestionsIncorrect: totalQuestionsAttempted - totalQuestionsCorrect,
        totalMarksObtained,
        totalMarksAvailable,
        overallAccuracy: parseFloat(overallAccuracy.toFixed(2)),
        overallScorePercentage: parseFloat(overallScorePercentage.toFixed(2)),
        averageScore: parseFloat((totalMarksObtained / submissions.length).toFixed(2))
      },
      classifications: {
        all: classificationArray,
        strong: strongAreas,
        moderate: moderateAreas,
        weak: weakAreas
      },
      chartData: formatChartData(classificationArray)
    };

  } catch (error) {
    console.error('Error calculating student performance:', error);
    throw error;
  }
}

/**
 * Check if student's answer is correct
 * Handles multiple answer formats (index, text, string numbers)
 */
function checkAnswerCorrectness(selectedOption, correctAnswer, options) {
  if (!selectedOption || !correctAnswer) return false;

  // Handle different answer formats
  const selected = String(selectedOption).trim();
  const correct = String(correctAnswer).trim();

  // Direct match
  if (selected === correct) return true;

  // Check if selected is an index and convert to text
  if (/^\d+$/.test(selected)) {
    const index = parseInt(selected);
    if (options && options[index]) {
      return options[index].trim() === correct;
    }
  }

  // Check if correct answer is an index
  if (/^\d+$/.test(correct)) {
    const index = parseInt(correct);
    if (options && options[index]) {
      return selected === options[index].trim();
    }
  }

  return false;
}

/**
 * Categorize performance level based on accuracy percentage
 */
function categorizePerformance(accuracy) {
  if (accuracy >= 80) return 'Excellent';
  if (accuracy >= 70) return 'Good';
  if (accuracy >= 60) return 'Average';
  if (accuracy >= 50) return 'Needs Practice';
  return 'Needs Improvement';
}

/**
 * Get color code based on performance level
 */
function getPerformanceColor(accuracy) {
  if (accuracy >= 80) return '#10b981'; // Green
  if (accuracy >= 70) return '#84cc16'; // Light green
  if (accuracy >= 60) return '#eab308'; // Yellow
  if (accuracy >= 50) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

/**
 * Format data for Chart.js visualizations
 */
function formatChartData(classificationArray) {
  const labels = classificationArray.map(c => c.classification);
  const accuracyData = classificationArray.map(c => parseFloat(c.accuracy.toFixed(2)));
  const colors = classificationArray.map(c => c.performanceColor);

  return {
    radar: {
      labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyData,
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(79, 70, 229, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(79, 70, 229, 1)'
      }]
    },
    bar: {
      labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyData,
        backgroundColor: colors,
        borderColor: colors.map(c => c),
        borderWidth: 1
      }]
    }
  };
}

/**
 * Get all students who have taken at least one exam
 * @returns {Array} Array of students with submission count
 */
async function getStudentsWithSubmissions() {
  try {
    const students = await Submission.aggregate([
      {
        $group: {
          _id: '$student',
          submissionCount: { $sum: 1 },
          lastSubmission: { $max: '$submittedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentData'
        }
      },
      {
        $unwind: '$studentData'
      },
      {
        $match: {
          'studentData.usertype': 'student'
        }
      },
      {
        $project: {
          _id: 1,
          USN: '$studentData.USN',
          fname: '$studentData.fname',
          lname: '$studentData.lname',
          email: '$studentData.email',
          Department: '$studentData.Department',
          currentSemesterOverride: '$studentData.currentSemesterOverride',
          submissionCount: 1,
          lastSubmission: 1
        }
      },
      {
        $sort: { lastSubmission: -1 }
      }
    ]);

    return students;
  } catch (error) {
    console.error('Error fetching students with submissions:', error);
    throw error;
  }
}

module.exports = {
  calculateStudentPerformance,
  getStudentsWithSubmissions,
  categorizePerformance,
  getPerformanceColor,
  formatChartData
};
