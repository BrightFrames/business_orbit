"use strict";
/**
 * Email Templates for Business Orbit
 * Version 1.0
 *
 * All templates are brand-aligned and mobile-responsive.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.welcomeEmailTemplate = welcomeEmailTemplate;
exports.otpEmailTemplate = otpEmailTemplate;
exports.passwordResetConfirmationTemplate = passwordResetConfirmationTemplate;
exports.emailVerifiedTemplate = emailVerifiedTemplate;
exports.bookingConfirmationTemplate = bookingConfirmationTemplate;
exports.premiumWelcomeTemplate = premiumWelcomeTemplate;
const BRAND_COLOR = '#2563eb'; // Primary blue
const BRAND_NAME = 'Business Orbit';
const SUPPORT_EMAIL = 'support@businessorbit.org';
/**
 * Base email wrapper with consistent styling
 */
function wrapInTemplate(content, preheader = '') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${BRAND_NAME}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Preheader text (hidden, appears in email preview) -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        ${preheader}
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLOR};">
                                🚀 ${BRAND_NAME}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                                This email was sent by ${BRAND_NAME}
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                If you didn't request this email, please ignore it or contact 
                                <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLOR};">support</a>.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
/**
 * Welcome Email - Sent after successful signup
 * NO OTP inside this email (security requirement)
 */
function welcomeEmailTemplate(userName) {
    const firstName = userName.split(' ')[0];
    const content = `
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
            Welcome to ${BRAND_NAME}, ${firstName}! 👋
        </h2>
        
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
            We're thrilled to have you join our professional network. ${BRAND_NAME} connects you with like-minded professionals, exciting opportunities, and a community that helps you grow.
        </p>
        
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
            Here's what you can do next:
        </p>
        
        <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #374151;">
            <li>Complete your profile to stand out</li>
            <li>Connect with professionals in your field</li>
            <li>Join chapters and groups</li>
            <li>Explore upcoming events</li>
        </ul>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://businessorbit.org/product/feed" 
               style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                Get Started
            </a>
        </div>
        
        <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
            Welcome aboard! 🎉
        </p>
    `;
    return {
        subject: `Welcome to ${BRAND_NAME}, ${firstName}! 🚀`,
        html: wrapInTemplate(content, `Welcome to ${BRAND_NAME}! Start connecting with professionals today.`),
        text: `Welcome to ${BRAND_NAME}, ${firstName}!\n\nWe're thrilled to have you join our professional network.\n\nGet started: https://businessorbit.org/product/feed\n\nBest,\nThe ${BRAND_NAME} Team`
    };
}
/**
 * OTP Verification Email
 * Used for: Email verification, Forgot password
 */
function otpEmailTemplate(userName, otp, purpose, expiryMinutes = 10) {
    const firstName = userName.split(' ')[0] || 'there';
    const purposeTexts = {
        verify_email: {
            title: 'Verify Your Email',
            description: 'Please use the code below to verify your email address.',
            subject: `Your ${BRAND_NAME} Verification Code: ${otp}`
        },
        forgot_password: {
            title: 'Reset Your Password',
            description: 'You requested to reset your password. Use the code below to proceed.',
            subject: `Your ${BRAND_NAME} Password Reset Code: ${otp}`
        },
        sensitive_action: {
            title: 'Confirm Your Action',
            description: 'Please use the code below to confirm this action.',
            subject: `Your ${BRAND_NAME} Confirmation Code: ${otp}`
        },
        signup_verification: {
            title: 'Complete Your Registration',
            description: 'You\'re almost there! Use the code below to verify your email and complete your account registration.',
            subject: `Complete Your ${BRAND_NAME} Registration: ${otp}`
        }
    };
    const { title, description, subject } = purposeTexts[purpose];
    const content = `
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
            ${title}
        </h2>
        
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
            Hi ${firstName}, ${description}
        </p>
        
        <!-- OTP Box -->
        <div style="margin: 32px 0; text-align: center;">
            <div style="display: inline-block; padding: 20px 40px; background-color: #f3f4f6; border-radius: 12px; border: 2px dashed #d1d5db;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${BRAND_COLOR}; font-family: 'Courier New', monospace;">
                    ${otp}
                </span>
            </div>
        </div>
        
        <!-- Warning -->
        <div style="margin: 24px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
                ⏰ <strong>This code expires in ${expiryMinutes} minutes.</strong><br>
                🔒 Never share this code with anyone. ${BRAND_NAME} will never ask for it.
            </p>
        </div>
        
        <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
            If you didn't request this code, you can safely ignore this email. Someone may have entered your email by mistake.
        </p>
    `;
    return {
        subject,
        html: wrapInTemplate(content, `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`),
        text: `Hi ${firstName},\n\n${description}\n\nYour verification code: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nNever share this code with anyone.\n\nIf you didn't request this, please ignore this email.\n\n${BRAND_NAME}`
    };
}
/**
 * Password Reset Confirmation Email
 * Sent AFTER successful password reset
 */
function passwordResetConfirmationTemplate(userName) {
    const firstName = userName.split(' ')[0] || 'there';
    const content = `
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
            Password Successfully Reset ✅
        </h2>
        
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
            Hi ${firstName}, your password has been successfully reset. You can now log in with your new password.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://businessorbit.org/auth/login" 
               style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                Log In Now
            </a>
        </div>
        
        <!-- Security Warning -->
        <div style="margin: 24px 0; padding: 16px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
                🚨 <strong>If you didn't reset your password:</strong><br>
                Please contact our support team immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color: #dc2626;">${SUPPORT_EMAIL}</a>
            </p>
        </div>
        
        <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
            For security, all your other sessions have been logged out.
        </p>
    `;
    return {
        subject: `Your ${BRAND_NAME} Password Was Reset`,
        html: wrapInTemplate(content, 'Your password was successfully reset. If this wasn\'t you, contact support immediately.'),
        text: `Hi ${firstName},\n\nYour password has been successfully reset.\n\nLog in: https://businessorbit.org/auth/login\n\nIf you didn't reset your password, please contact support immediately at ${SUPPORT_EMAIL}.\n\nFor security, all your other sessions have been logged out.\n\n${BRAND_NAME}`
    };
}
/**
 * Email Verified Confirmation
 * Sent after successful email verification
 */
function emailVerifiedTemplate(userName) {
    const firstName = userName.split(' ')[0] || 'there';
    const content = `
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
            Email Verified! 🎉
        </h2>
        
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
            Hi ${firstName}, your email has been successfully verified. You now have full access to all ${BRAND_NAME} features.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://businessorbit.org/product/feed" 
               style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                Explore ${BRAND_NAME}
            </a>
        </div>
    `;
    return {
        subject: `Email Verified - Welcome to ${BRAND_NAME}!`,
        html: wrapInTemplate(content, 'Your email is verified! Start exploring Business Orbit.'),
        text: `Hi ${firstName},\n\nYour email has been successfully verified!\n\nExplore: https://businessorbit.org/product/feed\n\n${BRAND_NAME}`
    };
}
function bookingConfirmationTemplate(userName, otherPartyName, date, type) {
    const isClient = type === 'Client';
    const title = isClient ? 'Consultation Confirmed' : 'New Consultation Booking';
    const message = isClient
        ? `Your consultation with <strong>${otherPartyName}</strong> has been successfully booked.`
        : `You have a new consultation booked with <strong>${otherPartyName}</strong>.`;
    const content = `
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">${title}</h2>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">Hello ${userName},</p>
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">${message}</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 16px; color: #374151;"><strong>Date & Time:</strong> ${date}</p>
            <p style="margin: 0; font-size: 16px; color: #374151;">
                <strong>Meeting Link:</strong> <a href="#" style="color: ${BRAND_COLOR};">Join Meeting</a><br>
                <span style="font-size: 14px; color: #6b7280;">(Link will be active 10 mins before time)</span>
            </p>
        </div>
        <p style="margin: 24px 0 0; font-size: 14px; text-align: center; color: #6b7280;">Please log in to your dashboard to view more details.</p>
    `;
    return {
        subject: `${title} - ${BRAND_NAME}`,
        html: wrapInTemplate(content, `${title} - ${date}`),
        text: `Hello ${userName}, ${message} Date: ${date}. Check your dashboard for details.`
    };
}
function premiumWelcomeTemplate(userName) {
    const firstName = userName.split(' ')[0] || 'there';
    const content = `
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #d97706;">Welcome to Premium! 🌟</h2>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">Hello ${firstName},</p>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
            Thank you for upgrading to Business Orbit Premium. You've just unlocked a suite of powerful tools to accelerate your growth.
        </p>
        <div style="margin: 24px 0;">
            <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">Your exclusive benefits:</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #374151;">
                <li>Exclusive access to top industry experts</li>
                <li>Priority support for all your queries</li>
                <li>Advanced analytics for your profile</li>
                <li>Premium badge on your profile</li>
            </ul>
        </div>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;">Enjoy your new features and keep growing!</p>
    `;
    return {
        subject: `Welcome to Premium - ${BRAND_NAME}`,
        html: wrapInTemplate(content, 'Welcome to Premium! You now have access to exclusive features.'),
        text: `Hello ${firstName}, Welcome to Premium! You now have access to exclusive features.`
    };
}
