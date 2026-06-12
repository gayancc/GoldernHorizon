"use strict";

const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v2/https");
const config = require("./mail.config");
const {
  allowedTopics,
  escapeHtml,
  validateSubmission,
} = require("./validation");

const requestLog = new Map();
let transporter;

function isRateLimited(ip, now = Date.now()) {
  const windowMs = 10 * 60 * 1000;
  const limit = 5;
  const recent = (requestLog.get(ip) || []).filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  requestLog.set(ip, recent);

  if (requestLog.size > 500) {
    for (const [key, timestamps] of requestLog) {
      if (!timestamps.some((timestamp) => now - timestamp < windowMs)) requestLog.delete(key);
    }
  }

  return recent.length > limit;
}

function getTransporter() {
  if (transporter) return transporter;

  const { host, port, user, pass } = config.smtp;
  const values = [host, user, pass, config.mail.from, config.mail.to];
  if (values.some((value) => !value || value.includes("your-"))) {
    throw new Error("Complete functions/mail.config.js before sending email.");
  }
  if (!Number.isInteger(port)) {
    throw new Error("The SMTP port in functions/mail.config.js must be a number.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

exports.contact = onRequest({
  region: "northamerica-northeast1",
  memory: "256MiB",
  timeoutSeconds: 30,
  maxInstances: 3,
}, async (request, response) => {
  response.set("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.set("Allow", "POST").status(405).json({ error: "Method not allowed." });
    return;
  }

  const contentType = request.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    response.status(415).json({ error: "Expected a JSON request." });
    return;
  }

  const ip = request.ip || request.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    response.status(429).json({ error: "Too many requests. Please try again shortly." });
    return;
  }

  const submission = validateSubmission(request.body);
  if (submission.bot) {
    response.status(200).json({ ok: true });
    return;
  }
  if (submission.error) {
    response.status(400).json({ error: submission.error });
    return;
  }

  const { name, email, topic, message } = submission;
  const topicLabel = allowedTopics.get(topic);
  const reference = crypto.randomUUID().slice(0, 8).toUpperCase();
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br>");

  try {
    const transport = getTransporter();
    const { from, to: recipient } = config.mail;

    await transport.sendMail({
      from,
      to: recipient,
      replyTo: email,
      subject: `[${reference}] Golden Horizon booking: ${topicLabel}`,
      text: [
        `Booking reference: ${reference}`,
        `Type: ${topicLabel}`,
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        message,
      ].join("\n"),
      html: `
        <h2>New Golden Horizon booking inquiry</h2>
        <p><strong>Reference:</strong> ${reference}</p>
        <p><strong>Type:</strong> ${topicLabel}<br>
        <strong>Name:</strong> ${escapedName}<br>
        <strong>Email:</strong> ${escapedEmail}</p>
        <p>${escapedMessage}</p>
      `,
    });

    try {
      await transport.sendMail({
        from,
        to: email,
        replyTo: recipient,
        subject: `We received your Golden Horizon booking inquiry [${reference}]`,
        text: [
          `Hi ${name},`,
          "",
          `Thanks for contacting Golden Horizon about your ${topicLabel.toLowerCase()}.`,
          "We received your message and will reply within two business days.",
          "",
          `Booking reference: ${reference}`,
          "",
          "Golden Horizon",
        ].join("\n"),
        html: `
          <p>Hi ${escapedName},</p>
          <p>Thanks for contacting Golden Horizon about your ${topicLabel.toLowerCase()}.</p>
          <p>We received your message and will reply within two business days.</p>
          <p><strong>Booking reference:</strong> ${reference}</p>
          <p>Golden Horizon</p>
        `,
      });
    } catch (acknowledgementError) {
      logger.warn("Booking received, but acknowledgement email failed.", {
        reference,
        error: acknowledgementError.message,
      });
    }

    response.status(200).json({ ok: true, reference });
  } catch (error) {
    logger.error("Contact email failed.", { reference, error: error.message });
    response.status(502).json({ error: "We could not send your message. Please try again." });
  }
});
