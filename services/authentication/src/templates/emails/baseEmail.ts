/**
 * Base email template interface
 * Defines the common structure for all email templates
 */
export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}
