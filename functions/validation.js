"use strict";

const allowedTopics = new Map([
  ["party", "Private party"],
  ["pub", "Pub or bar performance"],
]);

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMessage(value, maxLength) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, maxLength);
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

  if (website) return { bot: true };
  if (name.length < 2) return { error: "Please enter your name." };
  if (!isEmail(email)) return { error: "Please enter a valid email address." };
  if (!allowedTopics.has(topic)) return { error: "Please choose a booking type." };
  if (message.length < 10) return { error: "Please include a few details about the booking." };

  return { name, email, topic, message };
}

module.exports = {
  allowedTopics,
  cleanText,
  cleanMessage,
  isEmail,
  escapeHtml,
  validateSubmission,
};
