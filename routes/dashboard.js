const express = require('express');
const router = express.Router()

//calling homecontroller from controller
const dashboardcontroller =  require('./../controllers/dashboardcontroller')
const activityController = require('../controllers/activeSessionController');
const { requireStudent, requireAuthAPI } = require('../middleware/auth');

// Apply authentication middleware to ALL dashboard routes
// All dashboard routes require student access
router.use(requireStudent);

// Add this route to your existing routes file
// Endpoint to receive activity pings
router.post('/see-active', requireAuthAPI, activityController.trackUserActivity);
router.route("/").get(dashboardcontroller.getcontrol)
router.route("/start-test/:examId").get(dashboardcontroller.getStartExam)
router.route("/submit-test").post(dashboardcontroller.postStartExam)

module.exports=router
