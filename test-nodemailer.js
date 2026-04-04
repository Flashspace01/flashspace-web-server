const nodemailer = require('nodemailer');
require('dotenv').config();

console.log("Testing SMTP connection with:", process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const mailOptions = {
  from: '"FlashSpace Test" <' + process.env.EMAIL_USER + '>',
  to: 'yogeshbisht12122005@gmail.com',
  subject: 'Test Email from NodeMailer',
  text: 'If you receive this, SMTP is working perfectly!'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error occurred:', error.message);
  } else {
    console.log('Email sent successfully:', info.response);
  }
});
