/**
 * Secure File Upload Configuration
 * Provides validated multer configurations for different file types
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

/**
 * CSV Upload Configuration (for MCQ questions)
 * Validates file type, size, and MIME type
 */
const csvStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        // Generate secure random filename
        const randomName = crypto.randomBytes(16).toString('hex');
        cb(null, `mcq-${randomName}.csv`);
    }
});

const csvUpload = multer({
    storage: csvStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
        files: 1 // Only one file
    },
    fileFilter: function(req, file, cb) {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.csv') {
            return cb(new Error('Only CSV files are allowed'), false);
        }

        // Check MIME type (accept both common MIME types for CSV)
        const allowedMimes = [
            'text/csv',
            'application/csv',
            'text/comma-separated-values',
            'application/vnd.ms-excel'
        ];

        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only CSV files are accepted.'), false);
        }

        cb(null, true);
    }
});

/**
 * Image Upload Configuration (for integrity monitoring)
 * Validates file type, size, and uses memory storage for S3 upload
 */
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max
        files: 1
    },
    fileFilter: function(req, file, cb) {
        // Check MIME type first (most reliable)
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
        }

        // Check file extension as secondary validation
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

        if (!allowedExts.includes(ext)) {
            return cb(new Error('Invalid image file extension'), false);
        }

        cb(null, true);
    }
});

/**
 * Excel Upload Configuration (for exam candidates)
 * Validates Excel files (.xlsx, .xls)
 */
const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 1
    },
    fileFilter: function(req, file, cb) {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.xlsx', '.xls'];

        if (!allowedExts.includes(ext)) {
            return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
        }

        // Check MIME type
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];

        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('Invalid Excel file type'), false);
        }

        cb(null, true);
    }
});

/**
 * Error handler for multer errors
 * Provides user-friendly error messages
 */
function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File is too large. Maximum size allowed is 5MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Only one file allowed.'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name. Please check your form.'
            });
        }

        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    } else if (err) {
        // Custom file filter errors
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
}

module.exports = {
    csvUpload,
    imageUpload,
    excelUpload,
    handleUploadError
};
