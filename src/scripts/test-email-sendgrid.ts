import dotenv from 'dotenv';
import path from 'path';
import { MeetingEmailUtil } from '../flashspaceWeb/meetingSchedulerModule/email.util';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  console.log('Testing Meeting Email Service (Nodemailer)...');

  const options = {
    to: process.env.TEST_EMAIL_TO || process.env.EMAIL_USER || 'sumit@flashspace.ai',
    fullName: 'Test User',
    meetingDate: new Date(),
    meetLink: 'https://meet.google.com/abc-defg-hij',
    duration: 30,
  };

  console.log(`Attempting to send email to: ${options.to}`);
  console.log(`Using Service: ${process.env.EMAIL_SERVICE}`);
  console.log(`From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}`);

  try {
    await MeetingEmailUtil.sendMeetingConfirmation(options);
    console.log('Test execution completed. Check your inbox.');
  } catch (error) {
    console.error('Test failed:', error);
    process.exitCode = 1;
  }
};

run();
