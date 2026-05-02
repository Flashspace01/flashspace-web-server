const nodemailer = require('nodemailer');
require('dotenv').config();

const service = (process.env.EMAIL_SERVICE || 'gmail').toLowerCase();
const recipient = process.env.TEST_EMAIL_TO || process.env.EMAIL_USER;

if (!recipient) {
  throw new Error('Set TEST_EMAIL_TO or EMAIL_USER before running this test.');
}

const transporter =
  service === 'smtp'
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

const from =
  process.env.EMAIL_FROM ||
  (service === 'smtp'
    ? `"FlashSpace Test" <${process.env.SMTP_USER}>`
    : `"FlashSpace Test" <${process.env.EMAIL_USER}>`);

transporter
  .sendMail({
    from,
    to: recipient,
    subject: 'Test Email via Nodemailer',
    text: 'If you receive this, Nodemailer email delivery is working.',
  })
  .then((info) => {
    console.log('Email sent successfully:', info.response);
  })
  .catch((error) => {
    console.error('Error sending email via Nodemailer:', error.message);
    process.exitCode = 1;
  });
