"use strict";

const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");
const { onRequest } = require("firebase-functions/v1/https");
const config = require("./mail.config");
const securityConfig = require("./security.config");
const {
  getTurnstileSecret,
  hasAllowedOrigin,
  submissionFingerprint,
  verifyTurnstile,
} = require("./security");
const {
  allowedTopics,
  escapeHtml,
  validateSubmission,
} = require("./validation");

const requestLog = new Map();
const emailLog = new Map();
const duplicateLog = new Map();
let transporter;

function exceedsLimit(log, key, limit, windowMs, now = Date.now()) {
  const recent = (log.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  log.set(key, recent);

  if (log.size > 500) {
    for (const [storedKey, timestamps] of log) {
      if (!timestamps.some((timestamp) => now - timestamp < windowMs)) log.delete(storedKey);
    }
  }

  return recent.length > limit;
}

function isDuplicate(fingerprint, now = Date.now()) {
  const previous = duplicateLog.get(fingerprint);
  return Boolean(previous && now - previous < 12 * 60 * 60 * 1000);
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

exports.contact = onRequest(async (request, response) => {
  response.set({
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });

  if (request.method !== "POST") {
    response.set("Allow", "POST").status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!hasAllowedOrigin(request) || request.get("x-gh-form") !== "booking") {
    response.status(403).json({ error: "Request rejected." });
    return;
  }
  const fetchSite = request.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    response.status(403).json({ error: "Request rejected." });
    return;
  }

  const contentType = request.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    response.status(415).json({ error: "Expected a JSON request." });
    return;
  }
  if ((request.rawBody?.length || 0) > 12000) {
    response.status(413).json({ error: "Request is too large." });
    return;
  }

  const ip = request.ip || request.get("x-forwarded-for") || "unknown";
  if (exceedsLimit(requestLog, ip, 6, 15 * 60 * 1000)) {
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

  const { name, email, topic, message, startedAt, turnstileToken } = submission;
  const formAge = Date.now() - startedAt;
  if (formAge < 3000 || formAge > 2 * 60 * 60 * 1000) {
    response.status(400).json({ error: "Please refresh the page and try again." });
    return;
  }
  const fingerprint = submissionFingerprint(submission);
  const topicLabel = allowedTopics.get(topic);
  const reference = crypto.randomUUID().slice(0, 8).toUpperCase();
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br>");

  let human = false;
  try {
    const secretKey = getTurnstileSecret(request, securityConfig);
    human = await verifyTurnstile({ token: turnstileToken, ip, secretKey });
  } catch (error) {
    logger.error("Anti-spam verification unavailable.", { error: error.message });
    response.status(503).json({ error: "Anti-spam verification is unavailable. Please try again." });
    return;
  }
  if (!human) {
    response.status(403).json({ error: "Anti-spam verification failed. Please try again." });
    return;
  }
  if (exceedsLimit(emailLog, email, 2, 6 * 60 * 60 * 1000)) {
    response.status(429).json({ error: "Too many requests for this email address." });
    return;
  }
  if (isDuplicate(fingerprint)) {
    response.status(200).json({ ok: true });
    return;
  }

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

    duplicateLog.set(fingerprint, Date.now());
    response.status(200).json({ ok: true, reference });
  } catch (error) {
    logger.error("Contact email failed.", { reference, error: error.message });
    response.status(502).json({ error: "We could not send your message. Please try again." });
  }
});
