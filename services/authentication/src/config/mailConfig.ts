import nodemailer from 'nodemailer';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'mailpit',
  port: 1025,
  secure: false, // use TLS
  auth: {
    user: '', // no auth in Mailpit
    pass: ''
  }
});

export default transporter;
