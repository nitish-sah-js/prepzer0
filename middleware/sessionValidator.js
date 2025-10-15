const User = require("../models/usermodel")

/**
 * Middleware to validate that the current session is the only active session for the user
 * If the user has logged in from another device, this will force logout
 */
const validateSingleSession = async (req, res, next) => {
  // Skip validation for non-authenticated users
  if (!req.isAuthenticated()) {
    return next()
  }

  // Skip validation for login/logout routes to avoid conflicts
  const excludedPaths = [
    "/authenticate/login",
    "/authenticate/signup",
    "/logout",
  ]
  if (excludedPaths.some((path) => req.path.includes(path))) {
    return next()
  }

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      console.log('=== SESSION VALIDATOR: User not found in database ===')
      // User not found, force logout
      return req.logout((err) => {
        if (err) return next(err)
        return res.redirect("/authenticate/login")
      })
    }

    // ONLY enforce single-device login for STUDENTS accessing EXAM routes
    const isStudent = user.usertype === 'student'
    const isExamRoute = req.path.includes('/dashboard/test') || req.path.includes('/api/check-session')

    // Skip session validation for non-students or non-exam routes
    if (!isStudent || !isExamRoute) {
      return next()
    }

    console.log('=== SESSION VALIDATOR (EXAM MODE) ===')
    console.log('Path:', req.path)
    console.log('Student:', user.email)
    console.log('Stored session ID:', user.currentSessionId)
    console.log('Current session ID:', req.sessionID)
    console.log('Match:', user.currentSessionId === req.sessionID)

    // Check if the current session ID matches the stored session ID
    if (user.currentSessionId && user.currentSessionId !== req.sessionID) {
      console.log('*** SESSION MISMATCH DETECTED - FORCING LOGOUT ***')
      // Session mismatch - user logged in from another device
      // Force logout and redirect with a message
      return req.logout((err) => {
        if (err) {
          console.error("Logout error in session validator:", err)
          return next(err)
        }

        req.session.regenerate((regenerateErr) => {
          if (regenerateErr) {
            console.error("Session regeneration error:", regenerateErr)
            return next(regenerateErr)
          }

          // Set flash message if available
          if (req.flash) {
            req.flash(
              "error",
              "You have been logged out because you logged in from another device during an exam."
            )
          }

          console.log('Session forced logout complete')
          return res.redirect("/authenticate/login")
        })
      })
    } else {
      // Session is valid, continue
      console.log('Session valid - allowing request')
      console.log('=========================')
      next()
    }
  } catch (error) {
    console.error("Session validation error:", error)
    next(error)
  }
}

module.exports = validateSingleSession
