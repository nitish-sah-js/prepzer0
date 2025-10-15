var nodemailer = require('nodemailer');
const sendEmails =async options =>{
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      secure: true,
      secureConnection: false, // TLS requires secureConnection to be false
      tls: {
          ciphers:'SSLv3'
      },
      requireTLS:true,
      port: process.env.EMAIL_PORT,
      debug: true,

        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      console.log("inside mailer")

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.email,
        subject : options.subject || "Passoword reset",
        html: options.html || `<h1 style="color : red;">The password reset link is :</h1>  <a href="${options.subject}"> ${options.subject}</a> `
      };
      console.log('shit it may be the reversehack')
     await transporter.sendMail(mailOptions)
}
module.exports = sendEmails