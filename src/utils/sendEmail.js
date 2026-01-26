import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
   
    try {
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
    } catch (error) {
        console.error("Email error:", error);
        throw error;
    }
};