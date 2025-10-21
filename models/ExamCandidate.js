const mongoose = require('mongoose');

const examCandidateSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  usn: {
    type: String,
    required: true
  },
  isAdditional: {
    type: Boolean,
    default: false
  },
  attendanceStatus: {
    type: String,
    enum: ['registered', 'started', 'submitted', 'absent'],
    default: 'registered'
  },
  markedAbsentAt: {
    type: Date
  },
  markedAbsentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExamCandidate', examCandidateSchema);