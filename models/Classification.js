const mongoose = require('mongoose');

const ClassificationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500,
        default: ''
    },
    active: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp on save
ClassificationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Add index for faster queries
ClassificationSchema.index({ name: 1 });
ClassificationSchema.index({ active: 1 });

const Classification = mongoose.model('Classification', ClassificationSchema);

module.exports = Classification;