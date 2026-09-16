const { Resend } = require("resend");

const resendApiKey =
  process.env.RESEND_API_KEY;

const fromEmail =
  process.env.RESEND_FROM_EMAIL;

if (!resendApiKey) {
  throw new Error(
    "RESEND_API_KEY is missing from .env"
  );
}

if (!fromEmail) {
  throw new Error(
    "RESEND_FROM_EMAIL is missing from .env"
  );
}

const resend =
  new Resend(resendApiKey);

async function sendEmail({
  to,
  subject,
  text,
  html
}) {
  if (!to) {
    throw new Error(
      "Email recipient is required"
    );
  }

  if (!subject) {
    throw new Error(
      "Email subject is required"
    );
  }

  if (!text && !html) {
    throw new Error(
      "Email text or HTML content is required"
    );
  }

  const result =
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text,
      html
    });

  if (result.error) {
    throw new Error(
      `Email sending failed: ${result.error.message}`
    );
  }

  return result.data;
}

module.exports = {
  sendEmail
};