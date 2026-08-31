const nodemailer = require('nodemailer');

// The transporter is configured through environment variables (SMTP_*).
// In development, it can point to Mailtrap, Ethereal, or MailHog.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // Use `true` for port 465 (SMTPS), and `false` for all other ports.
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });

  return transporter;
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const from = process.env.MAIL_FROM || 'no-reply@example.com';

  const text =
    `You requested a password reset.\n\n` +
    `This link is valid for 15 minutes and can only be used once :\n${resetUrl}\n\n` +
    `If you did not make this request, simply ignore this email.`;

  const html = `
    <p>You requested a password reset.</p>
    <p>This link is valid for <strong>15 minutes</strong> and can only be used once :</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you did not make this request, simply ignore this email.</p>
  `;

  await getTransporter().sendMail({
    from,
    to,
    subject: 'Password Reset Request',
    text,
    html
  });
}

module.exports = {
  sendPasswordResetEmail
};
