const User = require("./../models/usermodel")
const Exam = require("../models/Exam")
const Submission = require("./../models/SubmissionSchema")
const { redirect } = require("express/lib/response")
const MCQQuestion = require("./../models/MCQQuestion")
const ExamCandidate = require("../models/ExamCandidate")
const PartialSubmission = require("../models/PartialSubmission")
const mongoose = require("mongoose")

exports.getcontrol = async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const student = await User.findById(req.user._id)

      // Extra safety check - redirect non-students to admin
      // (The requireStudent middleware should already prevent this, but this is a UX enhancement)
      if (student && student.usertype !== "student") {
        return res.redirect("/admin")
      }

      if (student) {
        // Student exists, proceed with rendering dashboard

        const currentTime = new Date()

        // Find ALL exams that match the student's semester and department
        // const exams = await Exam.find({
        //     semester: student.Semester,
        //     departments: student.Department
        // });

        // Calculate current semester dynamically
        const currentSemester = student.CurrentSemester || student.Semester;

        const exams = await Exam.find({
          $or: [
            // Regular exams created with department and semester selection
            {
              semester: currentSemester,
              departments: student.Department,
            },
            // Exams created via Excel sheet (find via ExamCandidate)
            {
              _id: {
                $in: await ExamCandidate.find({
                  usn: student.USN, // Assuming student has USN field
                }).distinct("exam"),
              },
            },
          ],
        })

        // Fetch submissions with exam details
        const submissions = await Submission.find({ student: req.user._id })
          .populate("exam")
          .exec()

        // Create a map of exam ID to submission data
        const submissionMap = {}
        submissions.forEach((submission) => {
          // Check if exam exists and is not null before accessing its _id
          if (submission.exam && submission.exam._id) {
            submissionMap[submission.exam._id.toString()] = {
              submittedAt: submission.submittedAt,
              score: submission.score,
              submissionId: submission._id,
            }
          } else {
            // Log the problematic submission for debugging
            console.warn("Found submission with null or missing exam:", {
              submissionId: submission._id,
              examField: submission.exam,
              studentId: submission.student,
            })
          }
        })

        // Add status properties to each exam
        const examsWithStatus = exams.map((exam) => {
          const examObj = exam.toObject()
          const submission = submissionMap[exam._id.toString()]

          return {
            ...examObj,
            alreadyGiven: !!submission,
            isExpired: new Date(exam.scheduleTill) < currentTime,
            // Add submission data if exists
            submissionData: submission || null,
          }
        })

        console.log(examsWithStatus)

        const Userprofile = await User.findById(req.user.id)
        res.render("dashboard", {
          pic: Userprofile.imageurl,
          logged_in: "true",
          exams: examsWithStatus,
          user: req.user,
        })
      }
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: "Server Error" })
    }
  } else {
    res.redirect("/")
  }
}

exports.getStartExam = async (req, res) => {
  try {
    const currentTime = new Date()
    const examId = req.params.examId
    const studentId = req.user._id

    // Check if the user has already taken the exam
    const existingSubmission = await Submission.findOne({
      exam: examId,
      student: studentId,
    })

    if (existingSubmission) {
      return res
        .status(403)
        .send("You have already taken this exam and cannot attempt it again.")
    }
    // Find the exam and populate mcqQuestions in one query
    let exam = await Exam.findById(req.params.examId)
      .populate({
        path: 'mcqQuestions',
        model: 'MCQ'
      });

    if (!exam) {
      return res.status(404).send("Exam not found")
    }

    // Log to debug
    console.log("Exam loaded:", {
      examId: exam._id,
      name: exam.name,
      questionType: exam.questionType,
      mcqQuestionsCount: exam.mcqQuestions ? exam.mcqQuestions.length : 0,
      firstMcqQuestion: exam.mcqQuestions && exam.mcqQuestions[0] ? exam.mcqQuestions[0] : "No questions"
    });

    // Extra validation for MCQ exams
    if (exam.questionType === "mcq" && (!exam.mcqQuestions || exam.mcqQuestions.length === 0)) {
      console.error("CRITICAL: MCQ exam has no questions populated!");
      return res.status(500).send("Error: This exam has no questions. Please contact your administrator.");
    }

    // Convert to plain object and ensure questions are included
    const examData = exam.toObject();

    // Double-check questions are there
    if (examData.questionType === "mcq" && (!examData.mcqQuestions || examData.mcqQuestions.length === 0)) {
      console.error("WARNING: MCQ exam has no questions!");
      // You might want to redirect or show an error here
    }
    if (currentTime < exam.scheduledAt) {
      // Assuming 'scheduleFrom' is the start time field
      return res
        .status(403)
        .send(
          "This exam has not started yet. Please wait until the scheduled time."
        )
    }

    // Check if the exam is still available
    if (currentTime > exam.scheduleTill) {
      return res.status(403).send("This exam is no longer available.")
    }

    // Mark student as 'started' in ExamCandidate when they begin the exam
    const student = await User.findById(req.user._id)
    if (student && student.USN) {
      await ExamCandidate.findOneAndUpdate(
        { exam: examId, usn: student.USN },
        {
          $set: { attendanceStatus: 'started' }
        }
      )
    }

    // Check for partial submission
    const partialSubmission = await PartialSubmission.findOne({
      exam: examId,
      student: req.user._id
    });

    let savedAnswers = null;
    let timeRemaining = null;

    if (partialSubmission) {
      // Convert partial submission to the format expected by frontend
      savedAnswers = {
        mcq: {},
        coding: {}
      };

      // Convert MCQ answers
      if (partialSubmission.mcqAnswers && partialSubmission.mcqAnswers.length > 0) {
        partialSubmission.mcqAnswers.forEach(answer => {
          savedAnswers.mcq[answer.questionId] = {
            value: answer.selectedOption,
            index: answer.selectedOption
          };
        });
      }

      // Convert coding answers
      if (partialSubmission.codingAnswers && partialSubmission.codingAnswers.length > 0) {
        partialSubmission.codingAnswers.forEach(answer => {
          savedAnswers.coding[answer.questionId] = {
            code: answer.code,
            language: answer.language
          };
        });
      }

      timeRemaining = partialSubmission.timeRemaining;

      console.log(`Found partial submission for student ${req.user._id} in exam ${examId}`);
      console.log('Saved answers count:', Object.keys(savedAnswers.mcq).length, 'MCQ answers');
      console.log('Time remaining:', timeRemaining, 'seconds');
    }

    console.log()
    if (exam.questionType == "coding") {
      res.render("test3", {
        user: req.user,
        exam: examData,
        examId: exam._id,
        studentId: req.user._id,
        savedAnswers: savedAnswers,
        timeRemaining: timeRemaining
      })
    } else if (exam.questionType == "mcq") {
      res.render("test3", {
        user: req.user,
        exam: examData,
        examId: exam._id,
        studentId: req.user._id,
        savedAnswers: savedAnswers,
        timeRemaining: timeRemaining
      })
    } else {
      res.render("test3", {
        user: req.user,
        exam: examData,
        examId: exam._id,
        studentId: req.user._id,
        savedAnswers: savedAnswers,
        timeRemaining: timeRemaining
      })
    }
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error")
  }
}

exports.savePartialSubmission = async (req, res) => {
  try {
    const { examId, answers, timeRemaining } = req.body;
    const userId = req.user._id; // Get user ID from authenticated session

    // Validate the data
    if (!examId || !answers) {
      return res.status(400).json({
        error: "Missing required data for partial submission"
      });
    }

    // Format MCQ answers properly
    const mcqAnswers = [];
    if (answers.mcq && Object.keys(answers.mcq).length > 0) {
      for (const questionId in answers.mcq) {
        const answerData = answers.mcq[questionId];
        mcqAnswers.push({
          questionId: questionId,
          selectedOption: answerData.value || answerData.index?.toString() || answerData
        });
      }
    }

    // Format coding answers if present
    const codingAnswers = [];
    if (answers.coding && Object.keys(answers.coding).length > 0) {
      for (const questionId in answers.coding) {
        codingAnswers.push({
          questionId: questionId,
          code: answers.coding[questionId].code || '',
          language: answers.coding[questionId].language || 'javascript'
        });
      }
    }

    // Save or update the partial submission
    const partialSubmission = await PartialSubmission.findOneAndUpdate(
      { exam: examId, student: userId },
      {
        exam: examId,
        student: userId,
        mcqAnswers: mcqAnswers,
        codingAnswers: codingAnswers,
        timeRemaining: timeRemaining || 0,
        isPartial: true,
        lastSavedAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`Partial submission saved for student ${userId} in exam ${examId}`);

    res.status(200).json({
      success: true,
      message: "Answers auto-saved",
      savedAt: partialSubmission.lastSavedAt
    });

  } catch (error) {
    console.error("Error saving partial submission:", error);
    res.status(500).json({
      error: "Failed to save partial submission"
    });
  }
};

exports.postStartExam = async (req, res) => {
  try {
    const { exam: examId, mcqAnswers, codingAnswers } = req.body
    console.log(codingAnswers)
    const studentId = req.user._id
    console.log(studentId)
    // Validate exam ID
    if (!examId) {
      return res.status(400).json({ error: "Exam ID is required" })
    }

    // Find the exam
    const exam = await Exam.findById(examId)
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" })
    }

    // Get student ID from session

    if (!studentId) {
      return res.status(401).json({ error: "User not authenticated" })
    }

    // Calculate MCQ score automatically
    let totalScore = 0

    // Grade MCQ questions
    if (mcqAnswers && mcqAnswers.length > 0) {
      for (const answer of mcqAnswers) {
        const question = await MCQQuestion.findById(answer.questionId)
        // Both correctAnswer and selectedOption are strings, compare as strings
        if (question && question.correctAnswer === answer.selectedOption) {
          totalScore += question.marks || 1
        }
      }
    }

    // Create new submission with calculated score
    const newSubmission = new Submission({
      exam: examId,
      student: studentId,
      mcqAnswers: mcqAnswers || [],
      codingAnswers: codingAnswers || [],
      score: totalScore, // Save the calculated score
      submittedAt: new Date(),
    })

    // Save the submission
    await newSubmission.save()

    // Update ExamCandidate attendance status to 'submitted'
    const student = await User.findById(studentId)
    if (student && student.USN) {
      await ExamCandidate.findOneAndUpdate(
        { exam: examId, usn: student.USN },
        { attendanceStatus: 'submitted' }
      )
    }

    // Delete any partial submission since exam is now fully submitted
    await PartialSubmission.findOneAndDelete({
      exam: examId,
      student: studentId
    })

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Exam submitted successfully",
      redirectUrl: "/dashboard",
    })
  } catch (error) {
    console.error("Error in exam submission:", error)
    return res.status(500).json({ error: "Server error during submission" })
  }
}
