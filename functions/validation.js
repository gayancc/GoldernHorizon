"use strict";

const allowedTopics = new Map([
  ["party", "Private party"],
  ["pub", "Pub or bar performance"],
]);

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMessage(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);
}

function validateSubmission(body) {
  const name = cleanText(body?.name, 100);
  const email = cleanText(body?.email, 200).toLowerCase();
  const topic = cleanText(body?.topic, 20);
  const message = cleanMessage(body?.message, 3000);
  const website = cleanText(body?.website, 200);
  const company = cleanText(body?.company, 200);
  const startedAt = Number(body?.startedAt);
  const turnstileToken = cleanText(body?.turnstileToken, 2048);

  if (website || company) return { bot: true };
  if (name.length < 2) return { error: "Please enter your name." };
  if (/https?:\/\/|www\./i.test(name)) return { bot: true };
  if (!isEmail(email)) return { error: "Please enter a valid email address." };
  if (!allowedTopics.has(topic)) return { error: "Please choose a booking type." };
  if (message.length < 10) return { error: "Please include a few details about the booking." };
  if ((message.match(/https?:\/\/|www\./gi) || []).length > 2) return { bot: true };
  if (/(.)\1{14,}/u.test(message)) return { bot: true };
  if (!Number.isFinite(startedAt)) return { bot: true };
  if (!turnstileToken) return { error: "Please complete the anti-spam check." };

  return { name, email, topic, message, startedAt, turnstileToken };
}

module.exports = {
  allowedTopics,
  cleanText,
  cleanMessage,
  isEmail,
  escapeHtml,
  validateSubmission,
};
