import nodemailer from "nodemailer";

const smtpUser = process.env.GMAIL_USER?.trim();
const smtpPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

if (!smtpUser || !smtpPass) {
  console.warn("GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables");
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});
