import nodemailer from "nodemailer";


/**
 * Utility to send emails
 * @param {Object} options - Contains to, subject, and message (html)
 */
export const sendEmail = async (options) => {
   
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `VideoTube Support <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.message, 
    };

    await transporter.sendMail(mailOptions);
};