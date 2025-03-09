import { EmailTemplate } from './baseEmail';

/**
 * Password reset email template
 * This provides both HTML and text versions of the email
 */
export const getPasswordResetEmail = (
  username: string, 
  resetLink: string
): EmailTemplate => ({
  subject: 'Gainz - Password Reset Request',
  text: `
Hello ${username},

You requested a password reset for your Gainz account.

Please use the following link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

The Gainz Team
  `,
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0;">Gainz</h1>
    </div>
    <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
      <p>Hello ${username},</p>
      <p>You requested a password reset for your Gainz account.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>The Gainz Team</p>
    </div>
    <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
      <p>&copy; ${new Date().getFullYear()} Gainz. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
});
