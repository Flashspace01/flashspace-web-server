import { Request, Response } from "express";
import { Types } from "mongoose";
import { PartnerInquiryModel } from "./partnerInquiry.model";
import { EmailUtil } from "../authModule/utils/email.util";

export const createPartnerInquiry = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, company, partnershipType, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !partnershipType) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields (name, email, phone, partnershipType)",
                data: {},
                error: "Missing required fields",
            });
        }

        const inquiry = await PartnerInquiryModel.create({
            name,
            email,
            phone,
            company,
            partnershipType,
            message,
            status: 'pending'
        });

        if (!inquiry) {
            return res.status(400).json({
                success: false,
                message: "Failed to save inquiry",
                data: {},
                error: "Database error",
            });
        }

        // Admin Email
        const adminEmailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 650px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    
                    <!-- Alert Header -->
                    <div style="background: linear-gradient(135deg, #000000 0%, #2c2c2c 100%); padding: 30px; text-align: center; border-bottom: 4px solid #EDB003;">
                        <h1 style="color: #EDB003; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">
                            NEW PARTNERSHIP INQUIRY
                        </h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 600; letter-spacing: 1px;">
                            ACTION REQUIRED WITHIN 24 HOURS
                        </p>
                    </div>

                    <!-- Main Alert Box -->
                    <div style="background: linear-gradient(to right, #FFF9E6, #FFF3CD); border-left: 5px solid #EDB003; padding: 20px; margin: 0;">
                        <p style="margin: 0; color: #000000; font-size: 16px; font-weight: 600; text-align: center;">
                            A new partner inquiry from <strong style="color: #EDB003;">${company || name}</strong> is waiting for your review!
                        </p>
                    </div>

                    <!-- Partner Information -->
                    <div style="padding: 30px;">
                        
                        <!-- Company/Partner Highlight -->
                        <div style="background: linear-gradient(135deg, #EDB003 0%, #F5C842 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 15px rgba(237,176,3,0.2);">
                            <h2 style="color: #000000; margin: 0; font-size: 24px; font-weight: 700;">
                                ${company || 'Individual Partner'}
                            </h2>
                            <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px; opacity: 0.8; font-weight: 600;">
                                ${partnershipType}
                            </p>
                        </div>

                        <!-- Contact Details Card -->
                        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 2px solid #EDB003;">
                            <h3 style="color: #000000; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; border-bottom: 2px solid #EDB003; padding-bottom: 10px;">
                                Contact Information
                            </h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 12px 10px; border-bottom: 1px solid #dee2e6; width: 30%; color: #6c757d; font-size: 14px; font-weight: 600;">
                                        Name:
                                    </td>
                                    <td style="padding: 12px 10px; border-bottom: 1px solid #dee2e6; color: #212529; font-size: 15px; font-weight: 600;">
                                        ${name}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 10px; border-bottom: 1px solid #dee2e6; color: #6c757d; font-size: 14px; font-weight: 600;">
                                        Email:
                                    </td>
                                    <td style="padding: 12px 10px; border-bottom: 1px solid #dee2e6;">
                                        <a href="mailto:${email}" style="color: #007bff; text-decoration: none; font-weight: 600; font-size: 15px;">
                                            ${email}
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 10px; border-bottom: 1px solid #dee2e6; color: #6c757d; font-size: 14px; font-weight: 600;">
                                        Phone:
                                    </td>
                                    <td style="padding: 12px 10px; border-bottom: 1px solid #dee2e6;">
                                        <a href="tel:${phone}" style="color: #28a745; text-decoration: none; font-weight: 600; font-size: 15px;">
                                            ${phone}
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 10px; color: #6c757d; font-size: 14px; font-weight: 600;">
                                        Company:
                                    </td>
                                    <td style="padding: 12px 10px; color: #212529; font-size: 15px; font-weight: 600;">
                                        ${company || 'Not Provided'}
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Partnership Details Card -->
                        <div style="background-color: #FFFBF0; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #EDB003;">
                            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                Partnership Type
                            </h3>
                            <p style="margin: 0; color: #000000; font-size: 18px; font-weight: 700; background-color: #ffffff; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #EDB003;">
                                ${partnershipType}
                            </p>
                        </div>

                        <!-- Message Card -->
                        ${message ? `
                        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #000000;">
                            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                Partner's Message
                            </h3>
                            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px solid #FFB74D;">
                                <p style="margin: 0; color: #424242; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">
                                    ${message}
                                </p>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Submission Details -->
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 2px solid #dee2e6;">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600;">
                                        Submitted On:
                                    </td>
                                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 700; text-align: right;">
                                        ${new Date().toLocaleString('en-IN', { 
                                            timeZone: 'Asia/Kolkata',
                                            dateStyle: 'full',
                                            timeStyle: 'medium'
                                        })}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600;">
                                        Inquiry ID:
                                    </td>
                                    <td style="padding: 8px 0; color: #EDB003; font-size: 13px; font-weight: 700; text-align: right; font-family: monospace;">
                                        ${inquiry._id}
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Action Buttons -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="mailto:${email}?subject=Re: Partnership Inquiry - ${company || name}&body=Dear ${name},%0D%0A%0D%0AThank you for your partnership inquiry with FlashSpace." 
                               style="display: inline-block; background: linear-gradient(135deg, #EDB003 0%, #F5C842 100%); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 10px; box-shadow: 0 4px 15px rgba(237,176,3,0.4); transition: all 0.3s;">
                                Reply to ${name}
                            </a>
                            <a href="tel:${phone}" 
                               style="display: inline-block; background: linear-gradient(135deg, #000000 0%, #2c2c2c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                                Call Now
                            </a>
                        </div>

                        <!-- Priority Notice -->
                        <div style="background-color: #FFF9E6; border: 2px dashed #EDB003; padding: 20px; border-radius: 12px; text-align: center; margin-top: 25px;">
                            <p style="margin: 0; color: #000000; font-size: 15px; font-weight: 600;">
                                <strong>PRIORITY:</strong> Please respond within 24 hours to maintain partner satisfaction
                            </p>
                        </div>

                    </div>

                    <!-- Footer -->
                    <div style="background-color: #212529; padding: 25px; text-align: center;">
                        <p style="margin: 0 0 5px 0; color: #EDB003; font-size: 14px; font-weight: 700;">
                            FlashSpace Partnership Management System
                        </p>
                        <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                            © ${new Date().getFullYear()} FlashSpace. All rights reserved.
                        </p>
                    </div>

                </div>
            </body>
            </html>
        `;

        // Partner Confirmation Email
        const partnerEmailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 650px; margin: 50px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">
                    
                    <!-- Header Section -->
                    <div style="background: linear-gradient(135deg, #EDB003 0%, #F5C842 100%); padding: 30px 30px; text-align: center;">
                        <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 700;">
                            Welcome to FlashSpace
                        </h1>
                        <p style="color: #000000; margin: 8px 0 0 0; font-size: 14px; font-weight: 600; opacity: 0.85;">
                            Thank You for Your Partnership Interest
                        </p>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 45px 40px;">
                        <p style="color: #2c3e50; font-size: 17px; line-height: 1.6; margin: 0 0 25px 0;">
                            Dear <strong style="color: #EDB003; font-size: 18px;">${name}</strong>,
                        </p>
                        
                        <p style="color: #555; font-size: 16px; line-height: 1.8; margin: 0 0 35px 0;">
                            Thank you for expressing interest in partnering with <strong>FlashSpace</strong>! We're excited to explore collaboration opportunities with you for <strong style="color: #EDB003;">${partnershipType}</strong>.
                        </p>

                        <!-- What Happens Next Section -->
                        <div style="background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%); padding: 30px; border-radius: 16px; margin: 35px 0; border-left: 6px solid #EDB003; box-shadow: 0 4px 15px rgba(237,176,3,0.1);">
                            <h3 style="color: #000000; margin: 0 0 20px 0; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
                                <span style="background: #EDB003; color: #000; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 18px;">⚡</span>
                                What Happens Next?
                            </h3>
                            <ul style="margin: 0; padding-left: 0; list-style: none; color: #555; line-height: 2;">
                                <li style="margin-bottom: 15px; padding-left: 35px; position: relative;">
                                    <span style="position: absolute; left: 0; top: 3px; color: #EDB003; font-size: 20px; font-weight: bold;">1.</span>
                                    <strong style="color: #000000;">Review:</strong> Our partnership team will carefully review your inquiry within <strong style="color: #EDB003;">24 hours</strong>
                                </li>
                                <li style="margin-bottom: 15px; padding-left: 35px; position: relative;">
                                    <span style="position: absolute; left: 0; top: 3px; color: #EDB003; font-size: 20px; font-weight: bold;">2.</span>
                                    <strong style="color: #000000;">Contact:</strong> We'll reach out to you via email or phone to discuss opportunities
                                </li>
                                <li style="margin-bottom: 15px; padding-left: 35px; position: relative;">
                                    <span style="position: absolute; left: 0; top: 3px; color: #EDB003; font-size: 20px; font-weight: bold;">3.</span>
                                    <strong style="color: #000000;">Discussion:</strong> We'll explore partnership opportunities tailored to your needs
                                </li>
                                <li style="margin-bottom: 0; padding-left: 35px; position: relative;">
                                    <span style="position: absolute; left: 0; top: 3px; color: #EDB003; font-size: 20px; font-weight: bold;">4.</span>
                                    <strong style="color: #000000;">Onboarding:</strong> Upon mutual agreement, we'll proceed with the partnership process
                                </li>
                            </ul>
                        </div>

                        <!-- Inquiry Summary -->
                        <div style="background: linear-gradient(to bottom right, #ffffff 0%, #f8f9fa 100%); padding: 30px; border-radius: 16px; margin: 35px 0; border: 3px solid #EDB003; box-shadow: 0 8px 25px rgba(0,0,0,0.08);">
                            <h3 style="color: #000000; margin: 0 0 20px 0; font-size: 20px; font-weight: 700; text-align: center; display: flex; align-items: center; justify-content: center;">
                                <span style="margin-right: 10px; font-size: 24px;">📋</span>
                                Your Inquiry Summary
                            </h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="border-bottom: 1px solid #e0e0e0;">
                                    <td style="padding: 15px 0; color: #666; font-size: 15px; width: 40%;">Partnership Type:</td>
                                    <td style="padding: 15px 0; color: #000; font-size: 15px; font-weight: 700;">${partnershipType}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e0e0e0;">
                                    <td style="padding: 15px 0; color: #666; font-size: 15px;">Company:</td>
                                    <td style="padding: 15px 0; color: #000; font-size: 15px; font-weight: 700;">${company || 'Individual Partner'}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e0e0e0;">
                                    <td style="padding: 15px 0; color: #666; font-size: 15px;">Submitted:</td>
                                    <td style="padding: 15px 0; color: #000; font-size: 15px; font-weight: 700;">${new Date().toLocaleString('en-IN', { 
                                        timeZone: 'Asia/Kolkata',
                                        dateStyle: 'long',
                                        timeStyle: 'short'
                                    })}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0; color: #666; font-size: 15px;">Reference ID:</td>
                                    <td style="padding: 15px 0; color: #EDB003; font-size: 15px; font-weight: 700; font-family: monospace;">${inquiry._id}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Contact Section -->
                        <div style="background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%); padding: 30px; border-radius: 16px; text-align: center; margin: 35px 0; border: 3px solid #EDB003; box-shadow: 0 4px 15px rgba(237,176,3,0.1);">
                            <h3 style="color: #000000; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">
                                💬 Have Questions?
                            </h3>
                            <p style="margin: 0 0 20px 0; color: #555; font-size: 15px; line-height: 1.6;">
                                Our team is here to help! Feel free to reach out anytime:
                            </p>
                            <div style="margin-top: 20px;">
                                <a href="mailto:partners@flashspace.co" style="display: inline-block; background: linear-gradient(135deg, #EDB003 0%, #FFD700 100%); color: #000000; text-decoration: none; padding: 14px 35px; border-radius: 30px; font-weight: 700; margin: 8px; font-size: 15px; box-shadow: 0 4px 15px rgba(237,176,3,0.4); transition: transform 0.2s;">
                                    📧 Email Us
                                </a>
                                <a href="tel:+918100888777" style="display: inline-block; background: linear-gradient(135deg, #2c3e50 0%, #000000 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 30px; font-weight: 700; margin: 8px; font-size: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); transition: transform 0.2s;">
                                    📞 Call Us
                                </a>
                            </div>
                        </div>

                        <!-- Why Partner Section -->
                        <div style="margin: 35px 0; padding: 30px; background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%); border-radius: 16px; border: 2px solid #dee2e6; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                            <h3 style="color: #000000; margin: 0 0 25px 0; font-size: 20px; text-align: center; font-weight: 700;">
                                ✨ Why Partner with FlashSpace?
                            </h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
                                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 12px; border: 2px solid #EDB003; box-shadow: 0 4px 12px rgba(237,176,3,0.15);">
                                    <div style="color: #EDB003; font-size: 30px; margin-bottom: 8px;">📈</div>
                                    <div style="color: #EDB003; font-size: 17px; font-weight: 700; margin-bottom: 6px;">Rapid Growth</div>
                                    <div style="color: #666; font-size: 13px;">Expand your business</div>
                                </div>
                                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 12px; border: 2px solid #EDB003; box-shadow: 0 4px 12px rgba(237,176,3,0.15);">
                                    <div style="color: #EDB003; font-size: 30px; margin-bottom: 8px;">🎯</div>
                                    <div style="color: #EDB003; font-size: 17px; font-weight: 700; margin-bottom: 6px;">Expert Support</div>
                                    <div style="color: #666; font-size: 13px;">Dedicated assistance</div>
                                </div>
                                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 12px; border: 2px solid #EDB003; box-shadow: 0 4px 12px rgba(237,176,3,0.15);">
                                    <div style="color: #EDB003; font-size: 30px; margin-bottom: 8px;">⭐</div>
                                    <div style="color: #EDB003; font-size: 17px; font-weight: 700; margin-bottom: 6px;">Premium Brand</div>
                                    <div style="color: #666; font-size: 13px;">Trusted reputation</div>
                                </div>
                                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 12px; border: 2px solid #EDB003; box-shadow: 0 4px 12px rgba(237,176,3,0.15);">
                                    <div style="color: #EDB003; font-size: 30px; margin-bottom: 8px;">💰</div>
                                    <div style="color: #EDB003; font-size: 17px; font-weight: 700; margin-bottom: 6px;">Revenue Growth</div>
                                    <div style="color: #666; font-size: 13px;">Increase earnings</div>
                                </div>
                            </div>
                        </div>

                        <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 35px 0 0 0; text-align: center; font-weight: 500;">
                            🤝 We look forward to building a successful partnership together!
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: linear-gradient(to right, #2c3e50 0%, #000000 100%); padding: 30px 40px; text-align: center;">
                        <p style="margin: 0 0 8px 0; color: #EDB003; font-size: 16px; font-weight: 700;">
                            FlashSpace
                        </p>
                        <p style="margin: 0 0 12px 0; color: #ffffff; font-size: 13px; opacity: 0.9;">
                            India's Leading Flexible Workspace Solutions Provider
                        </p>
                        <p style="margin: 0; color: #999; font-size: 12px;">
                            © ${new Date().getFullYear()} FlashSpace. All rights reserved.
                        </p>
                    </div>

                </div>
            </body>
</html>
        `;

        // Send emails (non-blocking)
        Promise.all([
            EmailUtil.sendEmail({
                to: process.env.ADMIN_EMAIL || 'admin@flashspace.com',
                subject: `🤝 New Partnership Inquiry - ${partnershipType} from ${name}`,
                html: adminEmailContent
            }),
            EmailUtil.sendEmail({
                to: email,
                subject: '🎉 Partnership Inquiry Received - FlashSpace',
                html: partnerEmailContent
            })
        ]).catch(emailError => {
            console.error('Error sending emails:', emailError);
        });

        res.status(201).json({
            success: true,
            message: "Thank you for your interest! Our partnership team will contact you within 24 hours.",
            data: inquiry,
            error: {},
        });

    } catch (err) {
        console.error('Partner inquiry error:', err);
        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again.",
            data: {},
            error: err,
        });
    }
};

export const getAllPartnerInquiries = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        let query: any = { isDeleted: false };
        
        if (status) {
            query.status = status;
        }

        const inquiries = await PartnerInquiryModel.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Inquiries retrieved successfully",
            data: inquiries,
            error: {},
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve inquiries",
            data: {},
            error: err,
        });
    }
};

export const updatePartnerInquiryStatus = async (req: Request, res: Response) => {
    try {
        const { inquiryId } = req.params;
        const { status } = req.body;

        if (!Types.ObjectId.isValid(inquiryId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid inquiry ID",
                data: {},
                error: "Invalid ObjectId",
            });
        }

        const updatedInquiry = await PartnerInquiryModel.findByIdAndUpdate(
            inquiryId,
            { status },
            { new: true }
        );

        if (!updatedInquiry) {
            return res.status(404).json({
                success: false,
                message: "Inquiry not found",
                data: {},
                error: "Not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Inquiry status updated",
            data: updatedInquiry,
            error: {},
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to update inquiry",
            data: {},
            error: err,
        });
    }
};
