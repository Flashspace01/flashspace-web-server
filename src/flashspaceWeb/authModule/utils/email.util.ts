import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailUtil {
  private static transporter: nodemailer.Transporter | null = null;
  private static contactTransporter: nodemailer.Transporter | null = null;
  private static isInitialized = false;
  private static isContactInitialized = false;
  private static initializationError: Error | null = null;
  private static readonly localServices = new Set([
    "nodemailer",
    "local",
    "log",
    "disabled",
    "sendgrid",
  ]);

  private static getService(): string {
    const configuredService = process.env.EMAIL_SERVICE?.trim().toLowerCase();

    if (configuredService) {
      return configuredService;
    }

    return "nodemailer";
  }

  private static getFromAddress(): string {
    const fromAddress =
      process.env.EMAIL_FROM ||
      (process.env.SMTP_USER
        ? `"FlashSpace" <${process.env.SMTP_USER}>`
        : process.env.EMAIL_USER
          ? `"FlashSpace" <${process.env.EMAIL_USER}>`
          : "FlashSpace <noreply@flashspace.co>");

    return fromAddress.includes("<")
      ? fromAddress
      : `"FlashSpace" <${fromAddress}>`;
  }

  private static getReplyToAddress(): string | undefined {
    return process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  }

  private static failInitialization(message: string): void {
    this.transporter = null;
    this.isInitialized = false;
    this.initializationError = new Error(message);
    console.error(`Email service configuration error: ${message}`);
  }

  private static initializeLocalTransport(): void {
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: "unix",
    });
    this.isInitialized = true;
    console.log(
      "Nodemailer local email service initialized - messages are generated and logged only",
    );
  }

  private static isLocalService(service = this.getService()): boolean {
    return this.localServices.has(service);
  }

  static initialize() {
    const service = this.getService();
    this.transporter = null;
    this.initializationError = null;

    if (this.isLocalService(service)) {
      if (service === "sendgrid") {
        console.warn(
          "EMAIL_SERVICE=sendgrid is ignored. Using Nodemailer local transport instead.",
        );
      }
      this.initializeLocalTransport();
    } else if (service === 'gmail') {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        this.failInitialization("EMAIL_USER and EMAIL_PASSWORD are required when EMAIL_SERVICE=gmail");
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER.trim(),
          pass: process.env.EMAIL_PASSWORD.replace(/\s+/g, ""),
        },
      });
      console.log('✅ Gmail email service initialized');
      this.isInitialized = true;
    } else if (service === 'smtp') {
      if (!process.env.SMTP_HOST) {
        this.failInitialization("SMTP_HOST is required when EMAIL_SERVICE=smtp");
        return;
      }

      const smtpUser =
        process.env.SMTP_USER ||
        (process.env.SMTP_HOST.includes("sendgrid") ? "apikey" : undefined);
      const smtpPass =
        process.env.SMTP_PASS ||
        (process.env.SMTP_HOST.includes("sendgrid")
          ? process.env.SENDGRID_API_KEY
          : undefined);

      if (!smtpUser || !smtpPass) {
        this.failInitialization("SMTP_USER and SMTP_PASS are required when EMAIL_SERVICE=smtp");
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      console.log('✅ SMTP email service initialized');
      this.isInitialized = true;
    } else {
      this.initializeLocalTransport();
    }

    this.initializeContact();
  }

  static initializeContact() {
    if (process.env.SMTP_CONTACT_HOST) {
      this.contactTransporter = nodemailer.createTransport({
        host: process.env.SMTP_CONTACT_HOST,
        port: parseInt(process.env.SMTP_CONTACT_PORT || '587'),
        secure: process.env.SMTP_CONTACT_SECURE === 'true',
        auth: {
          user: process.env.SMTP_CONTACT_USER,
          pass: process.env.SMTP_CONTACT_PASS,
        },
      });
      console.log('✅ Contact SMTP email service initialized');
      this.isContactInitialized = true;
    }
  }

  static async sendEmail(options: EmailOptions): Promise<void> {
    const service = this.getService();

    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      if (!this.isInitialized) {
        throw this.initializationError || new Error("Email service is not initialized");
      }

      if (this.isLocalService(service) && service !== "sendgrid") {
        if (!this.transporter) {
          this.initializeLocalTransport();
        }

        await this.transporter!.sendMail({
          from: this.getFromAddress(),
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        console.log("Email generated by Nodemailer local transport:");
        console.log("   To:", options.to);
        console.log("   Subject:", options.subject);
        return;
      }

      if (this.isLocalService(service)) {
        const msg = {
          to: options.to,
          from: this.getFromAddress(),
          subject: options.subject,
          text: options.text || options.html.replace(/<[^>]*>/g, ''),
          html: options.html,
        };

        if (!this.transporter) {
          this.initializeLocalTransport();
        }
        await this.transporter!.sendMail(msg);
        console.log("Email generated by Nodemailer local transport for:", options.to);
        return;
      } else if (service === 'gmail' || service === 'smtp') {
        if (!this.transporter) {
          throw new Error(`${service} transporter not initialized`);
        }

        const info = await this.transporter.sendMail({
          from: this.getFromAddress(),
          to: options.to,
          replyTo: this.getReplyToAddress(),
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        console.log(`Email sent successfully via ${service}`);
        console.log("   Message ID:", info.messageId);
        console.log("   Accepted:", info.accepted);
        console.log("   Response:", info.response);
        if (info.rejected?.length) {
          console.warn("   Rejected:", info.rejected);
        }
      } else {
        // Log email instead of sending (for development/when no service configured)
        console.log('📧 Email logged (sending disabled):');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
      }
    } catch (error: any) {
      console.error('Error sending email:', error?.message || error);

      if (service === 'sendgrid' && error.response?.body) {
        console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      }

      throw error;
      console.error('❌ Error sending email:', error);

      // COMMENTED OUT - SendGrid error logging
      // if (service === 'sendgrid' && error.response?.body) {
      //   console.error('📝 SendGrid Error Details:', JSON.stringify(error.response.body, null, 2));
      // }

      // Don't throw error - just log it so app continues working
      console.log('⚠️ Email sending failed but continuing...');
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
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

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

    if (this.isLocalService()) {
      console.log("Password reset link:", resetUrl);
    }
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

  static async sendContactFormNotification(contactData: {
    fullName: string;
    email: string;
    phoneNumber: string;
    companyName?: string;
    serviceInterest?: string;
    message: string;
  }): Promise<void> {
    const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'team@flashspace.co';
    
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">New Contact Inquiry</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">FlashSpace Contact Form</p>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
            <p style="color: #666; margin: 0 0 5px 0; font-size: 13px; text-transform: uppercase; font-weight: bold;">Full Name</p>
            <p style="color: #333; margin: 0; font-size: 16px; font-weight: 500;">${contactData.fullName}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 13px; text-transform: uppercase; font-weight: bold;">Email Address</p>
              <p style="color: #1e3c72; margin: 0; font-size: 16px; font-weight: 500;">${contactData.email}</p>
            </div>
            <div>
              <p style="color: #666; margin: 0 0 5px 0; font-size: 13px; text-transform: uppercase; font-weight: bold;">Phone Number</p>
              <p style="color: #333; margin: 0; font-size: 16px; font-weight: 500;">${contactData.phoneNumber}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
            <p style="color: #666; margin: 0 0 5px 0; font-size: 13px; text-transform: uppercase; font-weight: bold;">Company Name</p>
            <p style="color: #333; margin: 0; font-size: 16px; font-weight: 500;">${contactData.companyName || 'Not Provided'}</p>
          </div>
          
          <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
            <p style="color: #666; margin: 0 0 5px 0; font-size: 13px; text-transform: uppercase; font-weight: bold;">Service Interest</p>
            <p style="color: #333; margin: 0; font-size: 16px; font-weight: 500;">${contactData.serviceInterest || 'Not Provided'}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #1e3c72;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; font-weight: bold;">Message</p>
            <p style="color: #333; margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${contactData.message}</p>
          </div>
        </div>
        
        <div style="background-color: #f1f3f5; padding: 20px; text-align: center; color: #777; font-size: 12px;">
          <p style="margin: 0;">This email was sent from the FlashSpace Contact Form.</p>
          <p style="margin: 5px 0 0 0;">&copy; 2024 FlashSpace Tech. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
      NEW CONTACT INQUIRY
      -------------------
      Full Name: ${contactData.fullName}
      Email: ${contactData.email}
      Phone: ${contactData.phoneNumber}
      Company: ${contactData.companyName || 'N/A'}
      Service Interest: ${contactData.serviceInterest || 'N/A'}
      
      Message:
      ${contactData.message}
      
      - FlashSpace Team
    `;

    // Try to use dedicated contact transporter first
    if (!this.isContactInitialized) {
      this.initializeContact();
    }

    if (this.contactTransporter) {
      try {
        await this.contactTransporter.sendMail({
          from: process.env.SMTP_CONTACT_FROM || process.env.EMAIL_FROM || `"FlashSpace Contact" <${process.env.SMTP_CONTACT_USER}>`,
          to: receiverEmail,
          subject: `📧 New Contact: ${contactData.fullName} - ${contactData.serviceInterest || 'Query'}`,
          html,
          text,
        });
        console.log('✅ Contact notification sent via dedicated SMTP');
        return;
      } catch (error) {
        console.error('❌ Failed to send contact notification via dedicated SMTP, falling back to primary:', error);
      }
    }

    // Fallback to primary email service
    await this.sendEmail({
      to: receiverEmail,
      subject: `📧 New Contact: ${contactData.fullName} - ${contactData.serviceInterest || 'Query'}`,
      html,
      text,
    });
  }

  static async testConnection(): Promise<boolean> {
    const service = this.getService();

    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      if (!this.isInitialized) {
        throw this.initializationError || new Error("Email service is not initialized");
      }

      if (this.isLocalService(service)) {
        // Local Nodemailer transport does not require a network verification.
        console.log("Nodemailer local email transport ready");
        return true;
      } else if (service === 'gmail' || service === 'smtp') {
        if (!this.transporter) {
          throw new Error(`${service} transporter not initialized`);
        }
        await this.transporter.verify();
        console.log(`✅ ${service} connection verified!`);
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
  static async sendMailRecordEmail(email: string, fullName: string, mailData: { sender: string; type: string; office: string }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #35503F; color: #FEF8C3; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">New Mail Received</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello ${fullName},</p>
          <p>A new mail item has been received at your virtual office.</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Sender:</strong> ${mailData.sender}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${mailData.type}</p>
            <p style="margin: 5px 0;"><strong>Office:</strong> ${mailData.office}</p>
          </div>
          <p>You can view more details and request forwarding from your dashboard.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/mail-records" style="background: #35503F; color: #FEF8C3; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Mail Records</a>
          </div>
        </div>
        <div style="background: #f1f3f5; padding: 15px; text-align: center; color: #777; font-size: 12px;">
          <p>&copy; 2024 FlashSpace Tech. All rights reserved.</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: `📧 New Mail: ${mailData.sender} - FlashSpace`,
      html,
    });
  }

  static async sendVisitRecordEmail(email: string, fullName: string, visitData: { visitor: string; purpose: string; office: string }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #35503F; color: #FEF8C3; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">New Visitor Logged</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello ${fullName},</p>
          <p>A new visitor entry has been logged at your virtual office.</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Visitor:</strong> ${visitData.visitor}</p>
            <p style="margin: 5px 0;"><strong>Purpose:</strong> ${visitData.purpose}</p>
            <p style="margin: 5px 0;"><strong>Office:</strong> ${visitData.office}</p>
          </div>
          <p>Please log in to your dashboard to acknowledge/verify this visit.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/visit-records" style="background: #35503F; color: #FEF8C3; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Visit Records</a>
          </div>
        </div>
        <div style="background: #f1f3f5; padding: 15px; text-align: center; color: #777; font-size: 12px;">
          <p>&copy; 2024 FlashSpace Tech. All rights reserved.</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: `🤝 New Visitor: ${visitData.visitor} - FlashSpace`,
      html,
    });
  }
}
