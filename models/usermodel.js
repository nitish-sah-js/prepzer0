const mongoose  = require("mongoose");
const crypto = require('crypto')
var validator = require('validator');
const passportLocalMongoose = require('passport-local-mongoose')
const findOrCreate = require('mongoose-findorcreate');
const { random } = require("lodash");
const { calculateCurrentSemester } = require('./../utils/semesterCalculator');
const UserSchema = new mongoose.Schema({
        email : {
           type : String ,
            minlength : 4 , 
            maxlength : 55 ,
            trim : true , 
            default : "N  /  A",
            unique : true ,
        }, 
        active : {
            type : Boolean,
            default : false
        },
        USN : { //
            type : String , 
            unique : true , 
            require : true ,
        } ,
        fname : {
            type : String , 
            minlength : 0  ,
            maxlength  : 20 
           
        },
        lname : {
            type : String , 
            minlength : 0  ,
            maxlength  : 30 
           
        },
        usertype: {
            type : String ,
            default: "student",
            enum : ["student","admin","teacher"],required : true
        },
        userallowed : {
            type : Boolean, 
            default : false ,
        },

        dataid : {
            type : String 
        }
        ,
        Department :  {
            type: String,
            // Removed enum to allow dynamic departments from Department collection
             },

        // Departments that admin/teacher can manage (for exam creation)
        managedDepartments: {
            type: [String],
            // Removed enum to allow dynamic departments from Department collection
            default: []
        },

        Year : {
            type : String ,

        }
        ,
        admin_access : {
            default : false ,
            type : Boolean,
            },
        Rollno : {
            type : String ,
            
        },  
        Semester: {
            type: Number,
             min: 1, max: 8
            },

        // Override for current semester (set by admin when manually updating)
        // If set, this takes precedence over auto-calculation
        currentSemesterOverride: {
            type: Number,
            min: 1,
            max: 8,
            default: null
        },

        password : String ,
        phonecode :{
            type : String ,
            maxlength : 4
        } ,
        location :{
            type : String
        },
        phone : {
        type : Number ,
        minlength : 10 ,
        maxlength : 10
        } ,
            imageurl : {
            type : String ,
            default : "https://cdn-icons-png.flaticon.com/128/456/456212.png"
        },
        created : {
            type : Date , 
            default : Date.now()
        },
        randomurl : {
            type : String ,
        },
        passwordresettoken : String ,
        passwordresetdate : Date ,
        currentSessionId : {
            type : String,
            default : null
        },


    //USN==> location + Year + Dept + Rollno
    //1BY22CS001==> BY + 22 + CS + 001

})

// Virtual field to calculate current semester dynamically
UserSchema.virtual('CurrentSemester').get(function() {
    // If admin has manually set an override, use that
    if (this.currentSemesterOverride !== null && this.currentSemesterOverride !== undefined) {
        return this.currentSemesterOverride;
    }

    // For non-students, use stored Semester value
    if (this.usertype !== 'student') {
        return this.Semester;
    }

    // If Semester field is explicitly set (e.g., from CSV upload), use it
    // This ensures manually uploaded students show their correct semester
    if (this.Semester !== null && this.Semester !== undefined) {
        return this.Semester;
    }

    // Only auto-calculate if no Semester is set and Year exists
    if (!this.Year) {
        return this.Semester || null;
    }

    // Extract year from Year field (e.g., "2022" -> 22)
    const yearStr = this.Year.toString();
    const usnYear = parseInt(yearStr.slice(-2));

    // Auto-calculate from USN
    return calculateCurrentSemester(usnYear);
});

// Ensure virtuals are included in JSON/Object output
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

UserSchema.plugin(passportLocalMongoose, { usernameField : 'email' })
UserSchema.plugin(findOrCreate)
UserSchema.methods.createpasswordresettoken = function(){
const resetToken = crypto.randomBytes(32).toString('hex');
this.passwordresettoken = crypto
.createHash('sha256')
.update(resetToken)
.digest('hex')

this.passwordresetdate = Date.now() + 10 *60*1000
console.log(resetToken , this.passwordresettoken)


return resetToken

}
const User =  mongoose.model('User', UserSchema)
module.exports = User