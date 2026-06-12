"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSubmission } = require("./validation");
const functions = require("./index");

test("exports the contact HTTP function", () => {
  assert.equal(typeof functions.contact, "function");
});

test("accepts a valid party booking", () => {
  assert.deepEqual(validateSubmission({
    name: "  Gayan  ",
    email: "GAYAN@example.com",
    topic: "party",
    message: "We need music for a birthday party.",
    website: "",
  }), {
    name: "Gayan",
    email: "gayan@example.com",
    topic: "party",
    message: "We need music for a birthday party.",
  });
});

test("rejects unsupported booking types", () => {
  assert.deepEqual(validateSubmission({
    name: "Gayan",
    email: "gayan@example.com",
    topic: "licensing",
    message: "This message is long enough.",
  }), { error: "Please choose a booking type." });
});

test("silently accepts honeypot submissions", () => {
  assert.deepEqual(validateSubmission({
    name: "Bot",
    email: "bot@example.com",
    topic: "party",
    message: "This message is long enough.",
    website: "https://spam.example",
  }), { bot: true });
});
