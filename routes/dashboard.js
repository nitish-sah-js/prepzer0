const express = require('express');
const router = express.Router()

//calling homecontroller from controller
const dashboardcontroller =  require('./../controllers/dashboardcontroller')
const activityController = require('../controllers/activeSessionController');
const { requireStudent, requireAuthAPI } = require('../middleware/auth');

// API routes - use requireAuthAPI (returns JSON on auth failure)
// Endpoint to receive activity pings
router.post('/see-active', requireAuthAPI, activityController.trackUserActivity);
// Endpoint to mark student as left when they leave the exam
router.post('/leave-exam', requireAuthAPI, activityController.markStudentLeft);
// Endpoint to save partial submission when student leaves
router.post('/save-partial', requireAuthAPI, dashboardcontroller.savePartialSubmission);

// Page routes - use requireStudent (renders error page on auth failure)
// Apply requireStudent only to routes that render pages
router.route("/").get(requireStudent, dashboardcontroller.getcontrol)
router.route("/start-test/:examId").get(requireStudent, dashboardcontroller.getStartExam)
router.route("/submit-test").post(requireStudent, dashboardcontroller.postStartExam)

module.exports=router
