import { EmailTemplate } from './baseEmail';

/**
 * Generates an email template for email verification with OTP
 * 
 * @param username Email address or username
 * @param otp One-time password for email verification
 * @returns Email template object
 */
export const getEmailVerificationEmail = (username: string, otp: string): EmailTemplate => {
  const subject = 'Verify Your Email Address for Gainz';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
      <h2 style="color: #333;">Email Verification</h2>
      <p>Hello ${username},</p>
      <p>Thank you for registering with Gainz. To complete your registration, please enter the verification code below in the app:</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold;">
        ${otp}
      </div>
      
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this verification, please ignore this email.</p>
      <p>Thank you,<br/>The Gainz Team</p>
    </div>
  `;
  
  const text = `
    Email Verification
    
    Hello ${username},
    
    Thank you for registering with Gainz. To complete your registration, please enter the verification code below in the app:
    
    ${otp}
    
    This code will expire in 10 minutes.
    
    If you did not request this verification, please ignore this email.
    
    Thank you,
    The Gainz Team
  `;
  
  return {
    subject,
    html,
    text
  };
};
