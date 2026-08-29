const nodemailer = require('nodemailer');

// Le transporteur est configuré via variables d'environnement (SMTP_*).
// En dev, on peut pointer vers Mailtrap / Ethereal / Mailhog.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true pour le port 465, false pour les autres
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
    `Vous avez demandé la réinitialisation de votre mot de passe.\n\n` +
    `Ce lien est valable 15 minutes et ne peut être utilisé qu'une seule fois :\n${resetUrl}\n\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.`;

  const html = `
    <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
    <p>Ce lien est valable <strong>15 minutes</strong> et ne peut être utilisé qu'une seule fois :</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>
  `;

  await getTransporter().sendMail({
    from,
    to,
    subject: 'Réinitialisation de votre mot de passe',
    text,
    html
  });
}

module.exports = {
  sendPasswordResetEmail
};
