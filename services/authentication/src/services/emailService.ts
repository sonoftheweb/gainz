import nodemailer from 'nodemailer';
import { EmailTemplate } from '../templates/emails/baseEmail';
import { getPasswordResetEmail } from '../templates/emails/passwordReset';
import { getEmailVerificationEmail } from '../templates/emails/emailVerification';
import transporter from '../config/mailConfig';
import logger from '../utils/logger';
import { InternalServerError } from '../utils/errors';

/**
 * Service for handling all email-related functionality
 * Uses nodemailer with the configured transporter
 */
class EmailService {
  private from: string;
  
  constructor() {
    this.from = process.env.EMAIL_FROM || 'no-reply@gainz.com';
  }
  
  /**
   * Send an email using the provided template
   */
  async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    try {
      await transporter.sendMail({
        from: this.from,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html
      });
      
      logger.info(`Email sent to ${to}`, { subject: template.subject });
    } catch (error) {
      logger.error('Failed to send email', { error, to });
      throw new InternalServerError('Failed to send email');
    }
  }
  
  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    to: string, 
    username: string,
    resetToken: string
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const template = getPasswordResetEmail(username, resetLink);
    await this.sendEmail(to, template);
  }
  
  /**
   * Send an email verification email with OTP
   */
  async sendEmailVerificationOTP(
    to: string,
    otp: string
  ): Promise<void> {
    // Extract username from email (everything before @)
    const username = to.split('@')[0];
    
    const template = getEmailVerificationEmail(username, otp);
    await this.sendEmail(to, template);
  }
  
  // Additional email types can be added here
}

// Export a singleton instance
export default new EmailService();
