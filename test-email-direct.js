const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'yogeshbisht12122005@gmail.com', // Change to your recipient
  from: process.env.EMAIL_FROM || 'team@flashspace.co', // Change to your verified sender
  subject: 'Test Email via Sendgrid',
  text: 'Just testing if Sendgrid is working or dead.',
};

sgMail
  .send(msg)
  .then(() => {
    console.log('Email sent successfully!');
  })
  .catch((error) => {
    console.error('Error sending email. SendGrid might be blocked or inactive.');
    if (error.response) {
      console.error(error.response.body);
    }
  });
