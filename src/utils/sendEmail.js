import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (options) => {
    try {
        await resend.emails.send({
            from: 'VideoTube <onboarding@resend.dev>',
            to: options.to,
            subject: options.subject,
            html: options.message,
        });
    } catch (error) {
        console.error("Email error:", error);
        throw error;
    }
};