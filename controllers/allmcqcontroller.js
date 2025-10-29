// controllers/mcqQuestionController.js
const MCQQuestion = require('../models/MCQQuestion');
const AllMCQQuestion = require('../models/MCQschema');
const Classification = require('../models/Classification');
const Exam = require('../models/Exam');
const fs = require('fs');
const csv = require('csv-parser');
const { result } = require('lodash');
const mongoose = require('mongoose');


exports.getAllMCQQuestions = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Show 20 questions per page
        const skip = (page - 1) * limit;

        // Filter parameters
        const classificationFilter = req.query.classification || '';
        const levelFilter = req.query.level || '';

        // Build filter query
        const filterQuery = {};
        if (classificationFilter) {
            filterQuery.classification = classificationFilter;
        }
        if (levelFilter) {
            filterQuery.level = levelFilter;
        }

        // Get total count for pagination
        const totalQuestions = await AllMCQQuestion.countDocuments(filterQuery);
        const totalPages = Math.ceil(totalQuestions / limit);

        // Fetch paginated questions
        const mcqQuestions = await AllMCQQuestion.find(filterQuery)
            .sort({ createdAt: -1, level: 1 })
            .skip(skip)
            .limit(limit);

        // Get ALL classifications from Classification model for filter dropdown
        // This ensures all classifications are shown, not just ones with existing questions
        const classificationDocs = await Classification.find({ active: true }).sort({ name: 1 });
        const allClassifications = classificationDocs.map(c => c.name);

        // Render the EJS template with pagination data
        res.render("allMCQQuestion", {
            mcqQuestions: mcqQuestions,
            classifications: allClassifications,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalQuestions: totalQuestions,
                limit: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filters: {
                classification: classificationFilter,
                level: levelFilter
            }
        });
    } catch (error) {
        console.error('Error fetching MCQ questions:', error);
        res.status(500).send("Error loading MCQ questions.");
    }
};




exports.csvPage = async (req, res) => {
    res.render("csv", {examId: req.params.examId});
}








exports.uploadMCQCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const createdBy = req.body.createdBy;
    const examId = req.params.examId;

    console.log("Received examId:", examId); // Debugging log


    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push({
          classification: data.classification,
          question: data.question,
          options: [data.option1, data.option2, data.option3, data.option4],
          correctAnswer: data.correctAnswer,
          level: data.level,
          marks: parseInt(data.marks, 10),
          createdBy: createdBy,
          examId: examId
        });
      })
      .on('end', async () => {
        for (const item of results) {
          try {
            const mcqQuestion = new MCQQuestion({ ...item, examId });
            await mcqQuestion.validate();
            await mcqQuestion.save();
            await Exam.findByIdAndUpdate(examId, {
              $push: { mcqQuestions: mcqQuestion._id }
            });

            // Save to AllMCQQuestion if not already present
            const exists = await AllMCQQuestion.findOne({ question: item.question });
            if (!exists) {
              const newAllQuestion = new AllMCQQuestion(item);
              await newAllQuestion.save();
            }

          } catch (error) {
            errors.push({
              question: item.question,
              error: error.message
            });
          }
        }

        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });

        const exam = await Exam.findById(examId)
          .populate("mcqQuestions")
          .lean();

        console.log(exam);

        if (!exam) {
          return res.status(404).send("Exam not found");
        }

        res.render("view_questions", {
          exam,
          mcqQuestions: exam.mcqQuestions || [],
          codingQuestions: exam.codingQuestions || []
        });
      });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    res.status(500).send('Error processing file: ' + error.message);
  }
};

/**
 * Render the Add MCQ Question form
 * GET /admin/mcq-questions/add
 */
exports.getAddMCQForm = async (req, res) => {
    try {
        // Get all active classifications from the database
        const classifications = await Classification.find({ active: true }).sort({ name: 1 });

        res.render("add_global_mcq", {
            classifications: classifications,
            errorMsg: req.flash ? req.flash('error') : '',
            successMsg: req.flash ? req.flash('success') : ''
        });
    } catch (error) {
        console.error('Error loading add MCQ form:', error);
        res.status(500).send("Error loading the form.");
    }
};

/**
 * Handle adding a new global MCQ question
 * POST /admin/mcq-questions/add
 */
exports.addGlobalMCQQuestion = async (req, res) => {
    try {
        const {
            classification,
            question,
            option1,
            option2,
            option3,
            option4,
            correctAnswer,
            level,
            marks
        } = req.body;

        // Validate required fields
        if (!question || !option1 || !option2 || !option3 || !option4 || !correctAnswer || !level) {
            if (req.flash) {
                req.flash('error', 'All fields are required');
            }
            return res.redirect('/admin/mcq-questions/add');
        }

        // Create options array
        const optionsArray = [option1.trim(), option2.trim(), option3.trim(), option4.trim()];

        // Convert correctAnswer from index (0,1,2,3) to actual text
        // The form sends the index, but we need to store the actual answer text
        const correctAnswerIndex = parseInt(correctAnswer);
        const correctAnswerText = optionsArray[correctAnswerIndex];

        if (!correctAnswerText) {
            if (req.flash) {
                req.flash('error', 'Invalid correct answer selection');
            }
            return res.redirect('/admin/mcq-questions/add');
        }

        // Create new MCQ question
        const newMCQQuestion = new AllMCQQuestion({
            classification: classification || 'General',
            question: question.trim(),
            options: optionsArray,
            correctAnswer: correctAnswerText,
            level: level,
            marks: parseInt(marks) || 1,
            questionType: 'mcq',
            createdBy: req.user ? (req.user.fname + ' ' + req.user.lname) : 'Admin'
        });

        await newMCQQuestion.save();

        console.log('✅ MCQ Question saved successfully:', {
            id: newMCQQuestion._id,
            classification: newMCQQuestion.classification,
            question: newMCQQuestion.question.substring(0, 50) + '...'
        });

        if (req.flash) {
            req.flash('success', 'MCQ question added successfully!');
        }
        res.redirect('/admin/mcq-questions');

    } catch (error) {
        console.error('❌ Error adding MCQ question:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        if (req.flash) {
            req.flash('error', 'Error adding question: ' + error.message);
        }
        res.redirect('/admin/mcq-questions/add');
    }
};

/**
 * Handle deleting a global MCQ question
 * DELETE /admin/mcq-questions/:id
 */
exports.deleteGlobalMCQQuestion = async (req, res) => {
    try {
        const questionId = req.params.id;

        // Check if question exists
        const question = await AllMCQQuestion.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        // Delete the question
        await AllMCQQuestion.findByIdAndDelete(questionId);

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting MCQ question:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting question'
        });
    }
};

