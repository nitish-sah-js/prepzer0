const mongoose = require("mongoose");

const MCQSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true }, // Links to Exam
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "MCQQuestion", index: true },
    classification: {
        type: String,
        trim: true
        // Enum removed to allow dynamic classifications
    },
    question: { type: String, required: true },
    options: [{ type: String, required: true }], // Array of options
    correctAnswer: { type: String, required: true }, // The correct option
    level: {type: String, required: true, enum: ['easy', 'medium', 'hard'], default: 'easy'},
    marks: { type: Number, default: 0 }, // Marks assigned to the question
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }


});

// Index for performance analytics - improves query performance when filtering by exam and classification
MCQSchema.index({ examId: 1, classification: 1 });

module.exports = mongoose.model("MCQ", MCQSchema);
