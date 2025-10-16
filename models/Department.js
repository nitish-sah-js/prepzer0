const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Department code is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [2, 'Department code must be at least 2 characters'],
        maxlength: [10, 'Department code must be less than 10 characters']
    },
    name: {
        type: String,
        required: [true, 'Department name is required'],
        trim: true,
        minlength: [3, 'Department name must be at least 3 characters'],
        maxlength: [100, 'Department name must be less than 100 characters']
    },
    fullName: {
        type: String,
        trim: true,
        maxlength: [150, 'Full name must be less than 150 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description must be less than 500 characters']
    },
    active: {
        type: Boolean,
        default: true
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

// Update the updatedAt timestamp before saving
DepartmentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for display name (returns code in uppercase)
DepartmentSchema.virtual('displayCode').get(function() {
    return this.code.toUpperCase();
});

// Ensure virtuals are included when converting to JSON
DepartmentSchema.set('toJSON', { virtuals: true });
DepartmentSchema.set('toObject', { virtuals: true });

const Department = mongoose.model('Department', DepartmentSchema);

module.exports = Department;
