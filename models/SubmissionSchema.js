const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mcqAnswers: [{ questionId: mongoose.Schema.Types.ObjectId, selectedOption: String }],
    score: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
});

// Index for performance analytics - improves query performance when fetching all submissions for a student
SubmissionSchema.index({ student: 1, submittedAt: -1 });

module.exports = mongoose.model("Submission", SubmissionSchema);
