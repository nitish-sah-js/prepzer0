/**
 * Bulk Student Upload Controller
 * Handles CSV upload for creating multiple student accounts
 */

const User = require('../models/usermodel');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { calculateInitialSemester } = require('../utils/semesterCalculator');

/**
 * GET /admin/addbulckstudent
 * Renders the bulk student upload form
 */
exports.getBulkStudentUpload = (req, res) => {
    try {
        res.render('bulk_student_upload', {
            user: req.user,
            errorMsg: '',
            successMsg: ''
        });
    } catch (error) {
        console.error('Error rendering bulk student upload page:', error);
        res.status(500).send('Error loading page');
    }
};

/**
 * POST /admin/addbulckstudent
 * Processes CSV file and creates student accounts
 */
exports.postBulkStudentUpload = async (req, res) => {
    try {
        // Validate file upload
        if (!req.file) {
            return res.render('bulk_student_upload', {
                user: req.user,
                errorMsg: 'Please upload a CSV file',
                successMsg: ''
            });
        }

        // Validate password
        const { password } = req.body;
        if (!password || password.trim().length < 6) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            return res.render('bulk_student_upload', {
                user: req.user,
                errorMsg: 'Password must be at least 6 characters long',
                successMsg: ''
            });
        }

        const students = [];
        const errors = [];
        const filePath = req.file.path;

        // Parse CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({
                    mapHeaders: ({ header }) => header.trim().toLowerCase()
                }))
                .on('data', (row) => {
                    students.push(row);
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                });
        });

        // Validate that we have data
        if (students.length === 0) {
            fs.unlinkSync(filePath);
            return res.render('bulk_student_upload', {
                user: req.user,
                errorMsg: 'CSV file is empty or invalid',
                successMsg: ''
            });
        }

        let successCount = 0;
        let skipCount = 0;

        // Process each student
        for (let i = 0; i < students.length; i++) {
            const row = students[i];
            const lineNumber = i + 2; // CSV line number (header is line 1)

            try {
                // Validate required fields
                const email = row.email?.trim();
                const usn = row.usn?.trim().toUpperCase();
                const department = row.department?.trim().toLowerCase();
                const semester = parseInt(row.semester);

                if (!email || !usn || !department || !semester) {
                    errors.push(`Line ${lineNumber}: Missing required fields (email, usn, department, or semester)`);
                    skipCount++;
                    continue;
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    errors.push(`Line ${lineNumber}: Invalid email format - ${email}`);
                    skipCount++;
                    continue;
                }

                // Validate semester range
                if (semester < 1 || semester > 8 || isNaN(semester)) {
                    errors.push(`Line ${lineNumber}: Semester must be between 1 and 8 - ${semester}`);
                    skipCount++;
                    continue;
                }

                // Check if user already exists
                const existingUser = await User.findOne({
                    $or: [{ email: email }, { USN: usn }]
                });

                if (existingUser) {
                    errors.push(`Line ${lineNumber}: User already exists with email ${email} or USN ${usn}`);
                    skipCount++;
                    continue;
                }

                // Extract optional fields
                const fname = row.fname?.trim() || row.firstname?.trim() || '';
                const lname = row.lname?.trim() || row.lastname?.trim() || '';
                const phone = row.phone?.trim() ? parseInt(row.phone.trim()) : null;
                const imageurl = row.imageurl?.trim() || row.profilepicture?.trim() || undefined;

                // Extract year from USN (format: 1BY22CS001)
                // Year is at positions 3-4 (e.g., "22" from "1BY22CS001")
                // NOTE: Department is NOT extracted from USN - it MUST be provided in CSV
                let year = '';
                if (usn.length >= 6) {
                    const usnYear = usn.substring(3, 5); // Extract "22" from "1BY22CS001"
                    if (!isNaN(usnYear)) {
                        year = '20' + usnYear; // Convert "22" to "2022"
                    }
                }

                // Create user data object
                // Department comes from CSV file (required field), NOT from USN
                const userData = {
                    email: email,
                    USN: usn,
                    Department: department, // From CSV file (required)
                    Semester: semester,     // From CSV file (required)
                    Year: year,             // Extracted from USN
                    usertype: 'student',
                    userallowed: true,      // Auto-approve bulk uploaded students
                    active: true,           // Skip email verification for bulk uploads
                };

                // Add optional fields if provided
                if (fname) userData.fname = fname;
                if (lname) userData.lname = lname;
                if (phone && !isNaN(phone)) userData.phone = phone;
                if (imageurl) userData.imageurl = imageurl;

                // Create user with passport-local-mongoose register method
                const newUser = new User(userData);
                await User.register(newUser, password);

                successCount++;

            } catch (error) {
                console.error(`Error processing line ${lineNumber}:`, error);
                errors.push(`Line ${lineNumber}: ${error.message}`);
                skipCount++;
            }
        }

        // Delete uploaded file after processing
        fs.unlinkSync(filePath);

        // Prepare result message
        let resultMsg = `Successfully created ${successCount} student account(s).`;
        if (skipCount > 0) {
            resultMsg += ` Skipped ${skipCount} row(s) due to errors.`;
        }

        // Render result page with details
        res.render('bulk_student_upload', {
            user: req.user,
            errorMsg: errors.length > 0 ? errors : '',
            successMsg: resultMsg,
            details: {
                total: students.length,
                success: successCount,
                skipped: skipCount
            }
        });

    } catch (error) {
        console.error('Error processing bulk student upload:', error);

        // Clean up uploaded file if exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }

        res.render('bulk_student_upload', {
            user: req.user,
            errorMsg: 'Server error: ' + error.message,
            successMsg: ''
        });
    }
};

/**
 * GET /admin/download-student-template
 * Downloads a sample CSV template for bulk student upload
 */
exports.downloadTemplate = (req, res) => {
    try {
        const templatePath = path.join(__dirname, '../templates/student_upload_template.csv');

        // Check if template exists, if not create it
        if (!fs.existsSync(path.dirname(templatePath))) {
            fs.mkdirSync(path.dirname(templatePath), { recursive: true });
        }

        if (!fs.existsSync(templatePath)) {
            // Create sample template
            const templateContent = `email,usn,department,semester,fname,lname,phone,imageurl
student1@example.com,1BY22CS001,cs,1,John,Doe,9876543210,
student2@example.com,1BY22CS002,cs,1,Jane,Smith,9876543211,https://example.com/profile.jpg
student3@example.com,1BY22IS003,is,2,Bob,Johnson,9876543212,`;

            fs.writeFileSync(templatePath, templateContent);
        }

        res.download(templatePath, 'student_upload_template.csv', (err) => {
            if (err) {
                console.error('Error downloading template:', err);
                res.status(500).send('Error downloading template');
            }
        });

    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).send('Error creating template');
    }
};
