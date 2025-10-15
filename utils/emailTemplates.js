/**
 * Professional Email Templates for PrepZer0
 * Provides consistent, branded HTML email templates
 */

const currentYear = new Date().getFullYear();

/**
 * Base email template with consistent styling
 * @param {string} content - HTML content to insert into template
 * @param {boolean} includeDisclaimer - Whether to include security disclaimer
 */
function getBaseTemplate(content, includeDisclaimer = true) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PrepZer0 Notification</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f8fa; color: #333;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">PrepZer0</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Online Examination Platform</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px;">
      ${content}
    </div>

    ${includeDisclaimer ? `
    <!-- Security Disclaimer -->
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px 40px; margin: 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #856404;">
        <strong>⚠️ Security Notice</strong>
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #856404;">
        <strong>Do not share this email or any links within it with anyone.</strong> These links are uniquely generated for your account and should be kept confidential. If you believe someone else has accessed this email, please contact your administrator immediately.
      </p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e9ecef;">
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #6c757d; line-height: 1.6;">
        This is an automated message from PrepZer0. Please do not reply to this email.
      </p>
      <p style="margin: 0; font-size: 12px; color: #adb5bd;">
        &copy; ${currentYear} PrepZer0. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Password Reset Email Template
 * @param {string} resetUrl - Password reset URL
 * @param {string} userName - User's name (optional)
 */
function passwordResetTemplate(resetUrl, userName = '') {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">
      Password Reset Request
    </h2>

    ${userName ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #495057;">
      Hi <strong>${userName}</strong>,
    </p>` : ''}

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #495057;">
      We received a request to reset your password for your PrepZer0 account. Click the button below to create a new password:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
        Reset Your Password
      </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #6c757d;">
      Or copy and paste this link into your browser:
    </p>

    <div style="background-color: #f8f9fa; padding: 12px 16px; border-radius: 6px; border: 1px solid #dee2e6; word-break: break-all; margin: 0 0 24px 0;">
      <a href="${resetUrl}" style="color: #667eea; text-decoration: none; font-size: 13px;">${resetUrl}</a>
    </div>

    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #495057;">
      <strong>This link will expire in 10 minutes</strong> for security reasons.
    </p>

    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6c757d;">
      If you didn't request a password reset, please ignore this email or contact support if you have concerns.
    </p>
  `;

  return getBaseTemplate(content, true);
}

/**
 * Account Verification Email Template
 * @param {string} verificationUrl - Email verification URL
 * @param {string} userName - User's name (optional)
 */
function accountVerificationTemplate(verificationUrl, userName = '') {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">
      Welcome to PrepZer0! 🎯
    </h2>

    ${userName ? `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #495057;">
      Hi <strong>${userName}</strong>,
    </p>` : ''}

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #495057;">
      Thank you for signing up! You're one step away from accessing your personalized examination dashboard.
    </p>

    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #495057;">
      <strong>Please verify your email address to activate your account:</strong>
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
        Verify My Email
      </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #6c757d;">
      Or copy and paste this link into your browser:
    </p>

    <div style="background-color: #f8f9fa; padding: 12px 16px; border-radius: 6px; border: 1px solid #dee2e6; word-break: break-all; margin: 0 0 24px 0;">
      <a href="${verificationUrl}" style="color: #667eea; text-decoration: none; font-size: 13px;">${verificationUrl}</a>
    </div>

    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #495057;">
      <strong>This verification link will expire in 24 hours.</strong>
    </p>

    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6c757d;">
      If you didn't create an account with PrepZer0, you can safely ignore this email.
    </p>
  `;

  return getBaseTemplate(content, true);
}

/**
 * Exam Reminder Email Template
 * @param {object} examDetails - Exam details object
 * @param {string} examDetails.examName - Name of the exam
 * @param {string} examDetails.studentName - Student's name
 * @param {string} examDetails.startTime - Formatted start time
 * @param {number} examDetails.duration - Duration in minutes
 * @param {string} examDetails.questionType - Type of questions
 */
function examReminderTemplate(examDetails) {
  const { examName, studentName, startTime, duration, questionType } = examDetails;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #dc3545; font-size: 24px; font-weight: 600;">
      ⏰ Exam Reminder
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #495057;">
      Hello <strong>${studentName}</strong>,
    </p>

    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #495057;">
      This is a reminder that your exam <strong style="color: #2c3e50;">"${examName}"</strong> will start in <strong style="color: #dc3545;">15 minutes</strong>.
    </p>

    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 24px; border-radius: 8px; border-left: 4px solid #667eea; margin: 0 0 24px 0;">
      <h3 style="margin: 0 0 16px 0; color: #2c3e50; font-size: 18px; font-weight: 600;">
        📋 Exam Details
      </h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6c757d; width: 40%;">
            <strong>Start Time:</strong>
          </td>
          <td style="padding: 8px 0; font-size: 14px; color: #2c3e50;">
            ${startTime}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6c757d;">
            <strong>Duration:</strong>
          </td>
          <td style="padding: 8px 0; font-size: 14px; color: #2c3e50;">
            ${duration} minutes
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6c757d;">
            <strong>Question Type:</strong>
          </td>
          <td style="padding: 8px 0; font-size: 14px; color: #2c3e50;">
            ${questionType}
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 16px; border-radius: 6px; margin: 0 0 24px 0;">
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #0c5460;">
        <strong>💡 Important:</strong> Please log in to the PrepZer0 platform a few minutes before the exam starts. Ensure you have a stable internet connection and your webcam is working properly for integrity monitoring.
      </p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #495057;">
      <strong>Good luck with your exam!</strong>
    </p>

    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6c757d;">
      Best regards,<br/>
      <strong>The PrepZer0 Team</strong>
    </p>
  `;

  return getBaseTemplate(content, false); // No security disclaimer for exam reminders
}

/**
 * Simple notification template (for generic notifications)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
function notificationTemplate(title, message) {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">
      ${title}
    </h2>

    <div style="margin: 0; font-size: 15px; line-height: 1.6; color: #495057;">
      ${message}
    </div>
  `;

  return getBaseTemplate(content, false);
}

module.exports = {
  passwordResetTemplate,
  accountVerificationTemplate,
  examReminderTemplate,
  notificationTemplate
};
