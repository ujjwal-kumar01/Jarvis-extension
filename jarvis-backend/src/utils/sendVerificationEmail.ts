import { Resend } from 'resend';
import VerificationEmail from '../emails/VerificationEmail.js';

export async function sendVerificationEmail(
  email: string,
  username: string,
  verifyCode: string
): Promise<{ success: boolean; message: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    console.log(verifyCode,email)
    await resend.emails.send({
      from: "Jarvis <onboarding@resend.dev>",
      to: email,
      subject: 'Mystery Message Verification Code',
      react: VerificationEmail({ username, otp: verifyCode }),
    });
    return { success: true, message: 'Verification email sent successfully.' };
  } catch (emailError) {
    console.error('Error sending verification email:', emailError);
    return { success: false, message: 'Failed to send verification email.' };
  }
}
