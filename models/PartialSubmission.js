const mongoose = require('mongoose');

const PartialSubmissionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mcqAnswers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MCQQuestion'
    },
    selectedOption: String
  }],
  codingAnswers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingQuestion'
    },
    code: String,
    language: String
  }],
  timeRemaining: {
    type: Number, // Time remaining in seconds
    default: 0
  },
  isPartial: {
    type: Boolean,
    default: true
  },
  lastSavedAt: {
    type: Date,
    default: Date.now
  },
  examStartedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index for quick lookups
PartialSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

// Method to clean up old partial submissions (optional)
PartialSubmissionSchema.statics.cleanupOldPartials = async function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return await this.deleteMany({
    isPartial: true,
    lastSavedAt: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('PartialSubmission', PartialSubmissionSchema);