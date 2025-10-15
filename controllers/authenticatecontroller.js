const sendEmails = require('./../utils/email')
const { accountVerificationTemplate } = require('./../utils/emailTemplates')
const User = require('./../models/usermodel')
const passport =  require('passport')
const { random } = require('lodash')
const { v4: uuidv4 } = require('uuid');
const { calculateInitialSemester } = require('./../utils/semesterCalculator');
exports.getlogincontrol = (req, res) => {
    try {
        if (req.isAuthenticated()) {
            return res.redirect('/');
        }
        res.render('login', { 
            errormsg: "", 
            isStudentPage: true 
        });
    } catch (error) {
        console.error('Error in getlogincontrol:', error);
        res.status(500).render('login', { 
            errormsg: "An error occurred. Please try again.", 
            isStudentPage: true 
        });
    }   
};
exports.logincontrol = async (req, res, next) => {
    console.log('Login attempt for:', req.body.email);
    
    // Input validation
    if (!req.body.email || !req.body.password) {
        return res.render('login', { 
            errormsg: "Please provide both email and password", 
            isStudentPage: true 
        });
    }
    
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return res.status(500).render('login', { 
                errormsg: "An error occurred during login. Please try again.", 
                isStudentPage: true 
            });
        }
        
        if (!user) {
            console.log('Authentication failed for:', req.body.email, 'Reason:', info?.message);
            return res.render('login', { 
                errormsg: "Invalid email or password", 
                isStudentPage: true 
            });
        }
        
        // Successful authentication, now log in the user
        req.login(user, async (loginErr) => {
            if (loginErr) {
                console.error('Login error after authentication:', loginErr);
                return res.status(500).render('login', {
                    errormsg: "Error during login. Please try again.",
                    isStudentPage: true
                });
            }

            // Set session data
            req.session.userId = user._id;
            req.session.userEmail = user.email;

            // Save session first to get the session ID
            req.session.save(async (saveErr) => {
                if (saveErr) {
                    console.error('Session save error:', saveErr);
                    return res.status(500).render('login', {
                        errormsg: "Session error. Please try logging in again.",
                        isStudentPage: true
                    });
                }

                try {
                    // ONLY track sessions for students (for exam integrity)
                    // Teachers and admins can login from multiple devices
                    if (user.usertype === 'student') {
                        // Fetch fresh user data from database to get current session ID
                        const freshUser = await User.findById(user._id);
                        const sessionStore = req.sessionStore;
                        const oldSessionId = freshUser.currentSessionId;

                        console.log('=== STUDENT LOGIN DEBUG ===');
                        console.log('Student:', user.email);
                        console.log('Old session ID:', oldSessionId);
                        console.log('New session ID:', req.sessionID);

                        // If there's an old session, destroy it from MongoDB (AWAIT to ensure it completes)
                        if (oldSessionId && oldSessionId !== req.sessionID) {
                            await new Promise((resolve, reject) => {
                                sessionStore.destroy(oldSessionId, (destroyErr) => {
                                    if (destroyErr) {
                                        console.error('Error destroying old session:', destroyErr);
                                        reject(destroyErr);
                                    } else {
                                        console.log('Old session destroyed successfully for student:', user.email);
                                        resolve();
                                    }
                                });
                            });
                        }

                        // Update user document with new session ID
                        const updateResult = await User.updateOne(
                            { _id: user._id },
                            { currentSessionId: req.sessionID }
                        );

                        console.log('Database update result:', updateResult);
                        console.log('Student login successful - Session ID saved:', req.sessionID);
                        console.log('=========================');
                    } else {
                        console.log('Teacher/Admin login - no session tracking');
                    }

                    return res.redirect('/');

                } catch (dbErr) {
                    console.error('Database error during login:', dbErr);
                    return res.status(500).render('login', {
                        errormsg: "Login error. Please try again.",
                        isStudentPage: true
                    });
                }
            });
        });
    })(req, res, next);
};

 exports.getsignupcontrol = (req,res)=>{
    res.render('signup' , {errormsg : "", isStudentPage: true})
 }


exports.signupcontrol = async (req, res) => {
  try {
    // Form validation
    const { email, USN, password, passcode } = req.body;
    console.log(req.body)
    if (!email || !USN || !password || !passcode) {
      return res.status(400).render('signup', { 
        errormsg: "All fields are required" 
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).render('signup', { 
        errormsg: "Please enter a valid email address" 
      });
    }
    
    // Password validation
    if (password !== passcode) {
      return res.status(400).render('signup', { 
        errormsg: "Passwords do not match" 
      });
    }
    
    if (password.length < 8) {
      return res.status(400).render('signup', { 
        errormsg: "Password must be at least 8 characters long" 
      });
    }
    
    // USN validation and parsing
    const usn = USN.toLowerCase().trim();
    // Updated regex to handle any college code (not just BY)
    const regex = /^(\d{0,2})([a-z]{2})(\d{2})([a-z]{2})(\d{3})$/;
    const match = usn.match(regex);
    
    if (!match) {
      return res.status(400).render('signup', { 
        errormsg: "Invalid USN format (e.g., 1BY20CS001, 1TD19IS045)" 
      });
    }
    
    const collegeCode = match[1] + match[2];
    const year = "20" + match[3];
    const department = match[4];
    const rollNo = match[5];

    // Calculate current semester dynamically based on USN year and current date
    const usnYear = parseInt(match[3]);
    const semester = calculateInitialSemester(usnYear);
    
    // Check for existing users with same USN
    const existingUser = await User.findOne({ USN: usn });
    
    if (existingUser) {
      if (existingUser.userallowed) {
        return res.status(400).render('signup', { 
          errormsg: "USN already registered. Please login instead." 
        });
      } else {
        // Delete unverified account
        await User.deleteOne({ _id: existingUser._id });
      }
    }
    
    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).render('signup', { 
        errormsg: "Email already registered. Please login or use a different email." 
      });
    }
    
    // Generate secure random URL token (more secure than UUID)
    const crypto = require('crypto');
    const randurl = crypto.randomBytes(32).toString('hex');
    
    // Create verification URL
    const verificationUrl = `https://placement.prepzer0.co.in/authenticate/verify/${randurl}`;
    
    // Create user first (to avoid race conditions)
    const userData = {
      email,
      USN: usn,
      active: false,
      randomurl: randurl,
      Year: year,
      Department: department,
      Rollno: rollNo,
      Semester: semester, // Add the semester field
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hour expiry
    };
    
    // Register user
    try {
      await User.register(userData, password);
    } catch (error) {
      console.error("User registration error:", error);
      return res.status(500).render('signup', { 
        errormsg: "Registration failed. Please try again." 
      });
    }
    
    // Send verification email
    try {
      await sendEmails({
        email,
        subject: "Verify Your PrepZer0 Account",
        html: accountVerificationTemplate(verificationUrl)
      });

      // Set session variable
      req.session.lau = email;
      return res.redirect('/authenticate/signup?emailSent=true');
      
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      
      // Delete the user if email fails
      await User.deleteOne({ email });
      
      return res.status(500).render('signup', { 
        errormsg: "Failed to send verification email. Please try again." 
      });
    }
    
  } catch (error) {
    console.error("Signup controller error:", error);
    return res.status(500).render('signup', { 
      errormsg: "An unexpected error occurred. Please try again later." 
    });
  }
};

exports.getVerified = async (req, res) => {
    try {
      const user = await User.findOne({ randomurl: req.params.id });
      console.log(user)
      if (user) {
        res.render('verify', { check: req.params.id });
      } else {
        res.render('error', { message: 'Invalid verification link' });
      }
    } catch (error) {
      console.log(error);
      res.render('error', { message: 'Verification failed' });
    }
  }
  
exports.postVerified = async (req, res) => {
    try {
      const otp = req.body.otp;
      const updatedUser = await User.findOneAndUpdate(
        { randomurl: otp },
        { userallowed: true },
        { new: true }
      );
      
      if (updatedUser) {
        res.redirect('/authenticate/login');
      } else {
        res.render('error', { message: 'Verification failed' });
      }
    } catch (error) {
      console.log(error);
      res.render('error', { message: 'Server error during verification' });
    }
  }


 