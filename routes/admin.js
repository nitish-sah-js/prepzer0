const express = require("express")
const router = express.Router()

const admincontroller = require("./../controllers/admincontroller")
const authenticatecontroller = require("./../controllers/authenticatecontroller")
const examController = require("../controllers/examcontroller")
const questionController = require("../controllers/questioncontroller")
const mcqquestions = require("../controllers/allmcqcontroller")
const reportController = require("../controllers/reportController")
const databaseController = require("../controllers/dbQuestionsController")
const departmentController = require("../controllers/departmentcontroller")
const bulkStudentController = require("../controllers/bulkStudentController")
const classificationController = require("../controllers/classificationController")
const { requireAdmin, requireAdminAPI } = require("../middleware/auth")

// Apply authentication middleware to ALL admin routes
// Public routes (login/signup) are defined separately below
router.use((req, res, next) => {
  // Skip auth for login, signup, and verification routes
  if (
    req.path === "/login" ||
    req.path === "/signup" ||
    req.path.startsWith("/verify/")
  ) {
    return next()
  }
  // All other routes require admin/teacher access
  return requireAdmin(req, res, next)
})

router
  .route("/")
  .get(admincontroller.getcontrol)
  .post(admincontroller.postcontrol)

router
  .route("/exam/:examId")
  .get(examController.getEditExam)
  .post(examController.postEditExam)
router.route("/exam/delete/:examId").post(examController.deleteExam)

router.route("/exam/questions/:examId").get(questionController.getQuestion)
router
  .route("/exam/:examId/add/mcq")
  .get(questionController.getaddmcqQuestion)
  .post(questionController.postaddmcqQuestion)
router
  .route("/exam/:examId/edit/mcq/:mcqId")
  .get(questionController.getEditmcqQuestion)
  .post(questionController.postEditmcqQuestion)
router
  .route("/exam/:examId/delete/mcq/:mcqId")
  .post(questionController.deleteMCQ)

router
  .route("/create_exam")
  .get(examController.getExam)
  .post(examController.createExam)
router
  .route("/login")
  .get(admincontroller.logingetcontrol)
  .post(admincontroller.loginpostcontrol)
router
  .route("/signup")
  .get(admincontroller.signupgetcontrol)
  .post(admincontroller.signuppostcontrol)
router
  .route("/verify/:id")
  .get(authenticatecontroller.getVerified)
  .post(authenticatecontroller.postVerified)

router.route("/mcq-questions").get(mcqquestions.getAllMCQQuestions)
router.route("/mcq-questions/add")
  .get(mcqquestions.getAddMCQForm)
  .post(mcqquestions.addGlobalMCQQuestion)
router.route("/mcq-questions/:id/delete").delete(mcqquestions.deleteGlobalMCQQuestion)

router.route("/profile/students").get(admincontroller.allStudents)
router.route("/students/:studentId/exams").get(admincontroller.getStudentExams)
router.route("/students/:studentId/edit").post(admincontroller.editStudent)
router.route("/students/:studentId/delete").delete(admincontroller.deleteStudent)
router.route("/students/bulk-delete").post(admincontroller.bulkDeleteStudents)

router.route("/exam/candidates/:examId").get(admincontroller.examCandidates)
router.route("/exam/:examId/attendance").get(admincontroller.getAttendancePage)
router.route("/exam/absent/:examId").get(admincontroller.getAbsentStudents)
router.route("/exam/:examId/mark-absent").post(admincontroller.markStudentsAbsent)
router.route("/exam/:examId/export-submitted").get(admincontroller.exportSubmittedToCSV)
router.post(
  "/api/submission/delete",
  requireAdminAPI,
  reportController.deleteSubmission
)
router
  .route("/exam/submission/:submissionId")
  .get(reportController.viewAssessmentReport)

router.route("/search_student").get(examController.searchStudent)

// Get eligible students for an exam
router
  .route("/exam/:examId/eligible-students")
  .get(examController.getEligibleStudents)
router.route("/validate_excel_usns").post(examController.validateExcelUSNs)

// Secure file upload configuration
const { csvUpload, handleUploadError } = require("../config/upload")

// Bulk student upload routes (must be after csvUpload import)
router.route("/addbulckstudent").get(bulkStudentController.getBulkStudentUpload)
router.route("/addbulckstudent").post(
    csvUpload.single("csvFile"),
    handleUploadError,
    bulkStudentController.postBulkStudentUpload
)
router.route("/download-student-template").get(bulkStudentController.downloadTemplate)

// Routes
router.route("/exam/:examId/csv").get(mcqquestions.csvPage)

// Use secure CSV upload with error handling
router
  .route("/exam/:examId/upload-mcq-csv")
  .post(
    csvUpload.single("csvFile"),
    handleUploadError,
    mcqquestions.uploadMCQCSV
  )

router.route("/exam/:examId/report").get(examController.exportExamReport)

// Show database questions page
router
  .route("/exam/:examId/database")
  .get(databaseController.showDatabaseQuestions)

// Add manually selected questions
router
  .route("/exam/:examId/database/add")
  .post(databaseController.addSelectedQuestions)

// Add randomly selected questions
router
  .route("/exam/:examId/database/random")
  .post(databaseController.addRandomQuestions)

// Add new classification
router
  .route("/exam/:examId/database/classification/add")
  .post(databaseController.addClassification)

// Department management routes (old user-based)
router
  .route("/manage-departments")
  .get(admincontroller.getManageDepartments)
  .post(admincontroller.postManageDepartments)

// Department CRUD routes (new schema-based)
router.route("/departments").get(departmentController.getDepartments)
router.route("/departments/create").post(departmentController.createDepartment)
router.route("/departments/:id").put(departmentController.updateDepartment)
router.route("/departments/:id").delete(departmentController.deleteDepartment)
router
  .route("/departments/:id/toggle")
  .patch(departmentController.toggleDepartmentStatus)

// API route for getting active departments
router
  .route("/api/departments/active")
  .get(departmentController.getActiveDepartments)

// Classification management routes
router
  .route("/classifications")
  .get(classificationController.getClassifications)

router
  .route("/classifications/add")
  .post(classificationController.addClassification)

router
  .route("/classifications/:id")
  .put(classificationController.updateClassification)
  .delete(classificationController.deleteClassification)

router
  .route("/api/classifications")
  .get(classificationController.getActiveClassifications)

// Semester upgrade route
router.route("/upgrade-semester").post(admincontroller.upgradeSemester)

// Partial submission routes
router
  .route("/exam/:examId/partial-submissions")
  .get(admincontroller.getPartialSubmissions)

router
  .route("/partial-submission/:submissionId")
  .get(admincontroller.viewPartialSubmission)

module.exports = router
