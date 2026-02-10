import nodemailer from 'nodemailer';
import { DateTime } from 'luxon';

export interface MeetingEmailOptions {
    to: string;
    fullName: string;
    meetingDate: Date;
    meetLink: string;
    duration?: number; // in minutes
}

export class MeetingEmailUtil {
    private static transporter: nodemailer.Transporter | null = null;
    private static isInitialized = false;

    static initialize() {
        const service = process.env.EMAIL_SERVICE?.toLowerCase();

        if (service === 'gmail') {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });
            console.log('✅ Meeting email service initialized (Gmail)');
            this.isInitialized = true;
        } else {
            console.log('📧 Meeting email service disabled - emails will be logged only');
            this.isInitialized = true;
        }
    }

    private static async sendEmail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
        const service = process.env.EMAIL_SERVICE?.toLowerCase();

        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            if (service === 'gmail') {
                if (!this.transporter) {
                    throw new Error('Email transporter not initialized');
                }

                await this.transporter.sendMail({
                    from: `"FlashSpace" <${process.env.EMAIL_USER}>`,
                    to: options.to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                });
                console.log('✅ Meeting email sent successfully via Gmail');
            } else {
                console.log('📧 Meeting email logged (sending disabled):');
                console.log('   To:', options.to);
                console.log('   Subject:', options.subject);
            }
        } catch (error: any) {
            console.error('❌ Error sending meeting email:', error);
            console.log('⚠️ Email sending failed but continuing...');
        }
    }

    static async sendMeetingConfirmation(options: MeetingEmailOptions): Promise<void> {
        const meetingDateTime = DateTime.fromJSDate(options.meetingDate).setZone('Asia/Kolkata');
        const formattedDate = meetingDateTime.toFormat('cccc, LLLL d, yyyy');
        const formattedTime = meetingDateTime.toFormat('h:mm a');
        const duration = options.duration || 30;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Confirmed - FlashSpace</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-box { background: white; border: 2px solid #667eea; padding: 25px; margin: 25px 0; border-radius: 10px; text-align: center; }
          .meeting-date { font-size: 18px; color: #667eea; font-weight: bold; margin-bottom: 10px; }
          .meeting-time { font-size: 28px; color: #333; font-weight: bold; margin-bottom: 15px; }
          .duration { color: #666; font-size: 14px; margin-bottom: 20px; }
          .meet-button { display: inline-block; background: #00897B; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; }
          .meet-button:hover { background: #00796B; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info-box { background: #e8f5e9; border: 1px solid #a5d6a7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Meeting Confirmed!</h1>
          </div>
          <div class="content">
            <h2>Hello ${options.fullName},</h2>
            <p>Your meeting with the FlashSpace sales team has been scheduled successfully.</p>
            
            <div class="meeting-box">
              <div class="meeting-date">${formattedDate}</div>
              <div class="meeting-time">${formattedTime} IST</div>
              <div class="duration">${duration} minutes</div>
              <a href="${options.meetLink}" class="meet-button">🎥 Join Google Meet</a>
            </div>
            
            <div class="info-box">
              <strong>Meeting Link:</strong>
              <p style="word-break: break-all; color: #00897B; margin: 5px 0;">${options.meetLink}</p>
            </div>
            
            <div class="warning">
              <strong>Reminder:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Please join the meeting on time</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Have your questions ready for our sales team</li>
              </ul>
            </div>
            
            <p>If you need to reschedule or have any questions, please reply to this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 FlashSpace. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Meeting Confirmed - FlashSpace
      
      Hello ${options.fullName},
      
      Your meeting with the FlashSpace sales team has been scheduled successfully.
      
      Date: ${formattedDate}
      Time: ${formattedTime} IST
      Duration: ${duration} minutes
      
      Join via Google Meet: ${options.meetLink}
      
      Reminder:
      • Please join the meeting on time
      • Ensure you have a stable internet connection
      • Have your questions ready for our sales team
      
      If you need to reschedule or have any questions, please reply to this email.
      
      © 2024 FlashSpace. All rights reserved.
    `;

        await this.sendEmail({
            to: options.to,
            subject: '📅 Meeting Confirmed - FlashSpace Sales Team',
            html,
            text,
        });
    }
}
