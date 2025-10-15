//modules
require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const ejs = require('ejs')
const User = require('./models/usermodel')
const fs = require("fs")

// declaring passport and sessions
const flash = require('connect-flash');
const session = require('express-session')
const _ = require("lodash");
const passport = require('passport')
const LocalStrategy = require('passport-local')
const path = require('path')
// configuring s3 bucket
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
//adding rate-linits and other security mechanism
const rateLimit = require('express-rate-limit')
const mongoSanitize = require('express-mongo-sanitize')
const hpp = require('hpp')
const xss = require('xss-clean')


// setting view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//database configure ("monodb/mongoose")
const mongoose = require('mongoose')
const MongoStore = require('connect-mongo');
const dbname = process.env.DB_NAME || "codingplatform"
const dburl = process.env.MONGODB_URI

mongoose.connect(dburl,
{useNewUrlParser: true},
{useCreateIndex :true}).then(()=>{
    console.log("connected to database")
})
app.use('/uploads', express.static('uploads'));
const multer = require('multer')
//using middlewares
//app.use(helmet())
app.use(mongoSanitize())
app.use(hpp())
app.use(xss())
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json())
app.use(bodyParser.json({ limit: '100mb', parameterLimit: 100000  })); // Adjust the limit as needed
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));
//configuring sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true, // Required for secure cookies behind load balancers
  cookie: {
      secure: process.env.NODE_ENV === 'production', // Only use secure in production
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  store: MongoStore.create({
      mongoUrl: dburl,
      touchAfter: 24 * 3600, // Only update once in 24 hours
      crypto: {
          secret: process.env.SESSION_CRYPTO_SECRET // Add an encryption key for the session data
      }
  }),
}))
app.use(flash());
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('success');
    next();
});
//using passport middlewares
app.use(passport.initialize());
app.use(passport.session())

// Single device login enforcement middleware
const validateSingleSession = require('./middleware/sessionValidator');
app.use(validateSingleSession);

const { send, type } = require('express/lib/response');
const { authenticate } = require('passport');
const { result } = require('lodash');
const { buffer } = require('stream/consumers');
passport.use(User.createStrategy());

// passport.use(new LocalStrategy({usernameField : 'email'},User.authenticate()));

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
     
      const user = await User.findOne({ email: email });
      if (!user) {
          return done(null, false, { message: 'No user found with this email' });
      }
      
      // Special check for teachers - they must have verified their email (active: true)
      if (user.usertype === 'teacher' && !user.active) {
          return done(null, false, { message: 'Please verify your email before logging in' });
      }
      if (user.usertype === 'admin' && !user.admin_access) {
          return done(null, false, { message: 'login access not allowwed' });
      }

      
      // Check if user is allowed to access the platform
      if (!user.userallowed) {
          if (user.usertype === 'teacher') {
              return done(null, false, { message: 'Your teacher account is pending administrator approval. You will be notified once approved.' });
          } else {
              return done(null, false, { message: 'Verify your account to log in' });
          }
      }
      
      user.authenticate(password, (err, user, msg) => {
          if (err) {
              return done(err);
          }
          if (!user) {
              return done(null, false, { message: msg || 'Incorrect password' });
          }

          return done(null, user);
      });
      
  } catch (err) {
      return done(err);
  }
}));

//serializing and deserializing passport
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
//Routes handler
const home = require('./routes/home')
const dashboard = require('./routes/dashboard');
const admin = require('./routes/admin')
const authenticateing = require('./routes/authenticate')
const profile = require('./routes/profile')
const userauth = require('./routes/userauth')
const supadmin = require('./routes/supadmin')

app.get('/logout', async (req, res, next) => {
  // Store user info before logout
  const userId = req.user ? req.user._id : null;
  const userType = req.user ? req.user.usertype : null;

  // Clear both the session and authentication
  req.logout(async (err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }

    // Clear the currentSessionId from user document (ONLY for students)
    if (userId && userType === 'student') {
      try {
        await User.updateOne(
          { _id: userId },
          { currentSessionId: null }
        );
        console.log('Session ID cleared for student:', userId);
      } catch (dbErr) {
        console.error('Error clearing session ID:', dbErr);
      }
    }

    // Force session regeneration to ensure complete cleanup
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.error("Session regeneration error:", regenerateErr);
        return next(regenerateErr);
      }

      res.redirect('/');
    });
  });
});
app.get("/check", async (req,res)=>{
  const user = await User.find();
  console.log(user)
})

// API endpoint to check if current session is still valid
app.get('/api/check-session', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.json({ valid: false, reason: 'not_authenticated' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.json({ valid: false, reason: 'user_not_found' });
    }

    // Check if current session matches stored session
    if (user.currentSessionId && user.currentSessionId !== req.sessionID) {
      return res.json({ valid: false, reason: 'session_mismatch' });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error('Session check error:', error);
    return res.json({ valid: false, reason: 'error' });
  }
});

const upload = multer({ storage: multer.memoryStorage() });
const Integrity = require('./models/Integrity');
app.post('/update-integrity', async (req, res) => {
  console.log("came to the page intrigrity upadte:    ---------------------------")
  const { examId, userId, eventType } = req.body;
  const eventFieldMap = {
    tabChanges: "tabChanges",
    mouseOuts: "mouseOuts",
    fullscreenExits: "fullscreenExits",
    copyAttempts: "copyAttempts",
    pasteAttempts: "pasteAttempts",
    focusChanges: "focusChanges"
};

if (!eventFieldMap[eventType]) {
    return res.status(400).json({ success: false, message: "Invalid event type." });
}

const updateField = eventFieldMap[eventType];
console.log(eventFieldMap)
try {
    await Integrity.updateOne(
        { examId, userId },
        { 
            $inc: { [updateField]: 1 }, 
            $set: { lastEvent: eventType }
        },
        { upsert: true }  
    );
    res.json({ success: true, message: `Integrity event '${eventType}' updated.` });
} catch (error) {
    console.error("Error updating integrity event:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
}
});


app.post('/save-image', upload.single('image'), async (req, res) => {
  try {
    const { userId, examId } = req.body;
    
    const user = await User.findById(userId);
    console.log(user)
    const usn = user.USN;
    const fileName = `captured-${Date.now()}.jpg`;
    const s3Key = `integrity/${usn}/${examId}/${fileName}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: "image/jpeg"
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    res.json({ message: 'Image uploaded to S3!', path: s3Key });
  } catch (err) {
    console.error('Error uploading image to S3:', err);
    res.status(500).send('Server error');
  }
});

app.use('/',home )
app.use('/supadmin', supadmin)
app.use('/dashboard',dashboard)
app.use('/admin' ,admin)
app.use('/authenticate',authenticateing)
app.use('/profile',profile)
app.use('/user' , userauth)
app.all('*', async (req,res,next)=>{
    res.render('pagenotfound')
    next();
})
module.exports = app
