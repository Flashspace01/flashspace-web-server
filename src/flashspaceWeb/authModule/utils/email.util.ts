import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailUtil {
  private static transporter: nodemailer.Transporter | null = null;
  private static isInitialized = false;

  static initialize() {
    const service = process.env.EMAIL_SERVICE?.toLowerCase();

    if (service === 'sendgrid') {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ SENDGRID_API_KEY not configured');
        return;
      }
      sgMail.setApiKey(apiKey);
      console.log('✅ SendGrid email service initialized');
      this.isInitialized = true;
    } else if (service === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      console.log('✅ Gmail email service initialized');
      this.isInitialized = true;
    } else {
      console.warn('⚠️ No email service configured. Set EMAIL_SERVICE in .env');
    }
  }

  static async sendEmail(options: EmailOptions): Promise<void> {
    const service = process.env.EMAIL_SERVICE?.toLowerCase();

    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      if (service === 'sendgrid') {
        const msg = {
          to: options.to,
          from: process.env.EMAIL_FROM || 'noreply@flashspace.co',
          subject: options.subject,
          text: options.text || options.html.replace(/<[^>]*>/g, ''),
          html: options.html,
        };

        const result = await sgMail.send(msg);
        console.log('✅ Email sent successfully via SendGrid to:', options.to);
        return;
      } else if (service === 'gmail') {
        if (!this.transporter) {
          throw new Error('Gmail transporter not initialized');
        }

        await this.transporter.sendMail({
          from: `"FlashSpace" <${process.env.EMAIL_USER}>`,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        console.log('✅ Email sent successfully via Gmail');
      } else {
        console.log('📧 Email would be sent (no service configured):', options.subject);
      }
    } catch (error: any) {
      console.error('❌ Error sending email:', error);
      
      // Log detailed error for SendGrid
      if (service === 'sendgrid' && error.response?.body) {
        console.error('📝 SendGrid Error Details:', JSON.stringify(error.response.body, null, 2));
      }
      
      // Re-throw the original error with more context
      throw error;
    }
  }

  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async sendVerificationEmail(email: string, token: string, fullName: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - FlashSpace</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to FlashSpace!</h1>
          </div>
          <div class="content">
            <h2>Hello ${fullName},</h2>
            <p>Thank you for signing up with FlashSpace. To complete your registration, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p><strong>Note:</strong> This verification link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with FlashSpace, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 FlashSpace. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to FlashSpace!
      
      Hello ${fullName},
      
      Thank you for signing up with FlashSpace. To complete your registration, please verify your email address by visiting this link:
      
      ${verificationUrl}
      
      Note: This verification link will expire in 24 hours for security reasons.
      
      If you didn't create an account with FlashSpace, please ignore this email.
      
      © 2024 FlashSpace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - FlashSpace',
      html,
      text,
    });
  }

  static async sendPasswordResetEmail(email: string, token: string, fullName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - FlashSpace</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${fullName},</h2>
            <p>We received a request to reset your password for your FlashSpace account. If you made this request, click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
            <div class="warning">
              <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 FlashSpace. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request - FlashSpace
      
      Hello ${fullName},
      
      We received a request to reset your password for your FlashSpace account. If you made this request, visit this link to reset your password:
      
      ${resetUrl}
      
      Important: This password reset link will expire in 1 hour for security reasons.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      
      © 2024 FlashSpace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - FlashSpace',
      html,
      text,
    });
  }

  static async sendEmailVerificationOTP(email: string, otp: string, fullName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - FlashSpace</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; margin: 25px 0; text-align: center; border-radius: 8px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${fullName},</h2>
            <p>Thank you for signing up with FlashSpace! To complete your registration, please use the verification code below:</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Your Verification Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">Valid for 10 minutes</p>
            </div>
            
            <p>Enter this code on the verification page to activate your account.</p>
            
            <div class="warning">
              <strong>Security Note:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This code will expire in <strong>10 minutes</strong></li>
                <li>You have <strong>3 attempts</strong> to enter the correct code</li>
                <li>Never share this code with anyone</li>
              </ul>
            </div>
            
            <p>If you didn't create an account with FlashSpace, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 FlashSpace. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Email Verification - FlashSpace
      
      Hello ${fullName},
      
      Thank you for signing up with FlashSpace! To complete your registration, please use the verification code below:
      
      Verification Code: ${otp}
      
      This code will expire in 10 minutes.
      
      Enter this code on the verification page to activate your account.
      
      Security Note:
      • This code will expire in 10 minutes
      • You have 3 attempts to enter the correct code
      • Never share this code with anyone
      
      If you didn't create an account with FlashSpace, please ignore this email.
      
      © 2024 FlashSpace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: '🔐 Your FlashSpace Verification Code',
      html,
      text,
    });
  }

  static async sendLoginOTP(email: string, otp: string, fullName: string, location?: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Verification - FlashSpace</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #f5576c; padding: 20px; margin: 25px 0; text-align: center; border-radius: 8px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #f5576c; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info-box { background: #e3f2fd; border: 1px solid #90caf9; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Login Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${fullName},</h2>
            <p>We detected a login attempt to your FlashSpace account. Use the code below to complete your login:</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Your Login Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">Valid for 5 minutes</p>
            </div>
            
            ${location ? `
            <div class="info-box">
              <strong>Login Details:</strong>
              <p style="margin: 5px 0;">Location: ${location}</p>
              <p style="margin: 5px 0;">Time: ${new Date().toLocaleString()}</p>
            </div>
            ` : ''}
            
            <p><strong>Did not request this?</strong> If you didn't try to log in, please ignore this email and consider changing your password.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 FlashSpace. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Login Verification - FlashSpace
      
      Hello ${fullName},
      
      We detected a login attempt to your FlashSpace account. Use the code below to complete your login:
      
      Login Code: ${otp}
      
      This code will expire in 5 minutes.
      
      ${location ? `Location: ${location}\nTime: ${new Date().toLocaleString()}` : ''}
      
      Did not request this? If you didn't try to log in, please ignore this email and consider changing your password.
      
      © 2024 FlashSpace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: '🔒 Your FlashSpace Login Code',
      html,
      text,
    });
  }

  static async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to FlashSpace!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4facfe; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to FlashSpace!</h1>
          </div>
          <div class="content">
            <h2>Hello ${fullName},</h2>
            <p>Congratulations! Your email has been successfully verified and your FlashSpace account is now active.</p>
            
            <div class="feature">
              <h3>🏢 Explore Workspaces</h3>
              <p>Discover amazing coworking spaces and virtual offices tailored to your needs.</p>
            </div>
            
            <div class="feature">
              <h3>📅 Easy Booking</h3>
              <p>Book your workspace instantly with our simple booking system.</p>
            </div>
            
            <div class="feature">
              <h3>🤝 Connect & Network</h3>
              <p>Join our community and connect with like-minded professionals.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">Get Started</a>
            </div>
            
            <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 FlashSpace. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to FlashSpace!
      
      Hello ${fullName},
      
      Congratulations! Your email has been successfully verified and your FlashSpace account is now active.
      
      What you can do now:
      • Explore amazing coworking spaces and virtual offices
      • Book your workspace instantly with our simple booking system
      • Join our community and connect with like-minded professionals
      
      Get started: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard
      
      If you have any questions or need assistance, feel free to reach out to our support team.
      
      © 2024 FlashSpace. All rights reserved.
    `;

    await this.sendEmail({
      to: email,
      subject: '🎉 Welcome to FlashSpace - Your Account is Active!',
      html,
      text,
    });
  }

  static async testConnection(): Promise<boolean> {
    const service = process.env.EMAIL_SERVICE?.toLowerCase();

    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      if (service === 'sendgrid') {
        // SendGrid doesn't have a verify method, we'll try to send a test
        console.log('✅ SendGrid connection configured');
        return true;
      } else if (service === 'gmail') {
        if (!this.transporter) {
          throw new Error('Gmail transporter not initialized');
        }
        await this.transporter.verify();
        console.log('✅ Gmail connection verified!');
        return true;
      } else {
        console.warn('⚠️ No email service configured');
        return false;
      }
    } catch (error) {
      console.error('❌ Email connection failed:', error);
      return false;
    }
  }
}