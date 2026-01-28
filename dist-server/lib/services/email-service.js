"use strict";
/**
 * Email Service
 *
 * Centralized email service with:
 * - Nodemailer with Gmail SMTP
 * - Retry logic with exponential backoff
 * - Fallback mechanisms
 * - Error handling and logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._internal = void 0;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendOTPEmail = sendOTPEmail;
exports.sendPasswordResetConfirmation = sendPasswordResetConfirmation;
exports.sendEmailVerifiedConfirmation = sendEmailVerifiedConfirmation;
exports.isEmailServiceConfigured = isEmailServiceConfigured;
const nodemailer_1 = __importDefault(require("nodemailer"));
const email_templates_1 = require("../templates/email-templates");
// Environment configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const SENDER_NAME = 'Business Orbit';
// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
// Create transporter
let transporter = null;
function getTransporter() {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn('[EmailService] EMAIL_USER or EMAIL_PASS not configured');
        return null;
    }
    if (!transporter) {
        // Remove spaces from password just in case (common with Gmail App Passwords)
        // The password in .env might look like "abcd efgh ijkl mnop"
        const cleanPass = EMAIL_PASS.replace(/\s+/g, '');
        transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: cleanPass,
            },
        });
    }
    return transporter;
}
/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Core email sending function with nodemailer
 */
async function sendWithNodemailer(options) {
    const transport = getTransporter();
    if (!transport) {
        console.warn('[EmailService] Email service not configured - logging email instead');
        console.log('[EmailService] Would send email:', {
            to: options.to,
            subject: options.subject,
        });
        // Return success so the flow continues (OTP will still be created)
        return {
            success: true,
            messageId: 'not-sent-no-config',
            error: 'Email service not configured (logged instead)'
        };
    }
    const mailOptions = {
        from: `"${SENDER_NAME}" <${EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
    };
    try {
        const info = await transport.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId,
        };
    }
    catch (error) {
        console.error('[EmailService] Nodemailer error:', error);
        throw error;
    }
}
/**
 * Send email with retry logic and exponential backoff
 */
async function sendEmail(options) {
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[EmailService] Sending email to ${options.to} (attempt ${attempt}/${MAX_RETRIES})`);
            const result = await sendWithNodemailer(options);
            if (result.success) {
                console.log(`[EmailService] Email sent successfully to ${options.to}`);
                return result;
            }
            lastError = new Error(result.error || 'Unknown error');
        }
        catch (err) {
            lastError = err;
            console.error(`[EmailService] Attempt ${attempt} failed:`, err.message);
            // Don't retry on certain errors
            if (err.message.includes('invalid') || err.message.includes('rejected')) {
                break;
            }
        }
        // Exponential backoff before next retry
        if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
            console.log(`[EmailService] Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    console.error(`[EmailService] All retry attempts failed for ${options.to}`);
    return {
        success: false,
        error: lastError?.message || 'Failed to send email after multiple attempts'
    };
}
// ============================================
// PUBLIC API - Email Sending Functions
// ============================================
/**
 * Send welcome email after signup
 */
async function sendWelcomeEmail(email, userName) {
    const template = (0, email_templates_1.welcomeEmailTemplate)(userName);
    return sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
    });
}
/**
 * Send OTP verification email
 */
async function sendOTPEmail(email, userName, otp, purpose, expiryMinutes = 10) {
    const template = (0, email_templates_1.otpEmailTemplate)(userName, otp, purpose, expiryMinutes);
    return sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
    });
}
/**
 * Send password reset confirmation email
 */
async function sendPasswordResetConfirmation(email, userName) {
    const template = (0, email_templates_1.passwordResetConfirmationTemplate)(userName);
    return sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
    });
}
/**
 * Send email verified confirmation
 */
async function sendEmailVerifiedConfirmation(email, userName) {
    const template = (0, email_templates_1.emailVerifiedTemplate)(userName);
    return sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
    });
}
/**
 * Check if email service is configured
 */
function isEmailServiceConfigured() {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}
/**
 * Export for testing
 */
exports._internal = {
    sendWithNodemailer,
    sendEmail
};
