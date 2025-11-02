const User = require('../models/usermodel');
const {
  calculateStudentPerformance,
  getStudentsWithSubmissions
} = require('../services/performanceAnalytics');

/**
 * GET /admin/analytics
 * Display analytics dashboard with list of all students who have taken exams
 */
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    // Get all students with at least one submission
    const students = await getStudentsWithSubmissions();

    // Get total statistics
    const totalStudents = students.length;
    const totalSubmissions = students.reduce((sum, s) => sum + s.submissionCount, 0);

    res.render('analytics_dashboard', {
      title: 'Performance Analytics',
      students,
      stats: {
        totalStudents,
        totalSubmissions,
        averageSubmissionsPerStudent: totalStudents > 0
          ? (totalSubmissions / totalStudents).toFixed(1)
          : 0
      },
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (error) {
    console.error('Error loading analytics dashboard:', error);
    req.flash('error', 'Failed to load analytics dashboard. Please try again.');
    res.redirect('/admin');
  }
};

/**
 * GET /admin/analytics/student/:studentId
 * Display detailed classification-based performance report for a student
 */
exports.getStudentClassificationReport = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Fetch student details (Note: Don't use .lean() as we need the virtual field CurrentSemester)
    const student = await User.findById(studentId)
      .select('USN fname lname email Department Semester currentSemesterOverride Year usertype')
      .exec();

    if (!student) {
      req.flash('error', 'Student not found.');
      return res.redirect('/admin/analytics');
    }

    // Verify this is a student account
    if (student.usertype !== 'student') {
      req.flash('error', 'This account is not a student.');
      return res.redirect('/admin/analytics');
    }

    // Calculate performance analytics
    const performanceData = await calculateStudentPerformance(studentId);

    if (!performanceData.hasData) {
      req.flash('error', performanceData.message || 'No exam data found for this student.');
      return res.redirect('/admin/analytics');
    }

    // Render the report view
    res.render('student_classification_report', {
      title: `Performance Report - ${student.fname} ${student.lname}`,
      student: {
        _id: student._id,
        USN: student.USN,
        name: `${student.fname} ${student.lname}`,
        email: student.email,
        department: student.Department || 'N/A',
        semester: student.CurrentSemester || student.currentSemesterOverride || 'N/A'
      },
      performance: performanceData,
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (error) {
    console.error('Error generating classification report:', error);
    req.flash('error', 'Failed to generate performance report. Please try again.');
    res.redirect('/admin/analytics');
  }
};

/**
 * GET /admin/analytics/api/student/:studentId
 * API endpoint to get student performance data as JSON
 * (Useful for AJAX requests or future features)
 */
exports.getStudentPerformanceAPI = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const student = await User.findById(studentId)
      .select('USN fname lname email Department Semester currentSemesterOverride Year usertype')
      .exec();

    if (!student || student.usertype !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const performanceData = await calculateStudentPerformance(studentId);

    if (!performanceData.hasData) {
      return res.status(404).json({
        success: false,
        message: performanceData.message || 'No exam data found'
      });
    }

    res.json({
      success: true,
      student: {
        USN: student.USN,
        name: `${student.fname} ${student.lname}`,
        email: student.email,
        department: student.Department || 'N/A',
        semester: student.CurrentSemester || student.currentSemesterOverride || 'N/A'
      },
      performance: performanceData
    });

  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance data'
    });
  }
};
