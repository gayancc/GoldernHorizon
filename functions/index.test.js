"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSubmission } = require("./validation");
const {
  TEST_SECRET_KEY,
  getTurnstileSecret,
  hasAllowedOrigin,
  submissionFingerprint,
  verifyTurnstile,
} = require("./security");
const functions = require("./index");

function validSubmission(overrides = {}) {
  return {
    name: "Gayan",
    email: "gayan@example.com",
    topic: "party",
    message: "We need music for a birthday party.",
    website: "",
    company: "",
    startedAt: Date.now() - 5000,
    turnstileToken: "valid-token",
    ...overrides,
  };
}

test("exports the contact HTTP function", () => {
  assert.equal(typeof functions.contact, "function");
});

test("accepts a valid party booking", () => {
  const startedAt = Date.now() - 5000;
  assert.deepEqual(validateSubmission(validSubmission({
    name: "  Gayan  ",
    email: "GAYAN@example.com",
    startedAt,
  })), {
    name: "Gayan",
    email: "gayan@example.com",
    topic: "party",
    message: "We need music for a birthday party.",
    startedAt,
    turnstileToken: "valid-token",
  });
});

test("rejects unsupported booking types", () => {
  assert.deepEqual(validateSubmission(validSubmission({
    topic: "licensing",
  })), { error: "Please choose a booking type." });
});

test("silently accepts honeypot submissions", () => {
  assert.deepEqual(validateSubmission(validSubmission({
    website: "https://spam.example",
  })), { bot: true });
});

test("silently rejects URL-heavy submissions", () => {
  assert.deepEqual(validateSubmission(validSubmission({
    message: "Visit https://one.example https://two.example https://three.example",
  })), { bot: true });
});

test("requires a Turnstile token", () => {
  assert.deepEqual(validateSubmission(validSubmission({
    turnstileToken: "",
  })), { error: "Please complete the anti-spam check." });
});

test("uses the official Turnstile test secret for local requests", () => {
  const request = {
    get(name) {
      return name === "host" ? "127.0.0.1:5001" : "";
    },
  };
  assert.equal(getTurnstileSecret(request, {
    turnstile: { secretKey: "replace-with-secret" },
  }), TEST_SECRET_KEY);
});

test("rejects placeholder Turnstile secrets in production", () => {
  const request = {
    get(name) {
      return name === "host" ? "golden-horizon-band.web.app" : "";
    },
  };
  assert.throws(() => getTurnstileSecret(request, {
    turnstile: { secretKey: "replace-with-secret" },
  }), /security\.config\.js/);
});

test("requires matching request origin", () => {
  const headers = {
    origin: "https://goldenhorizon.web.app",
    "x-forwarded-host": "goldenhorizon.web.app",
  };
  assert.equal(hasAllowedOrigin({ get: (name) => headers[name] || "" }), true);
  headers.origin = "https://attacker.example";
  assert.equal(hasAllowedOrigin({ get: (name) => headers[name] || "" }), false);
});

test("verifies Turnstile server-side", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ success: true, action: "contact" }),
  });
  assert.equal(await verifyTurnstile({
    token: "token",
    ip: "127.0.0.1",
    secretKey: "secret",
    fetchImpl,
  }), true);
});

test("rejects a Turnstile token for the wrong action", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ success: true, action: "login" }),
  });
  assert.equal(await verifyTurnstile({
    token: "token",
    ip: "127.0.0.1",
    secretKey: "secret",
    fetchImpl,
  }), false);
});

test("creates stable submission fingerprints", () => {
  assert.equal(
    submissionFingerprint(validSubmission()),
    submissionFingerprint(validSubmission({
      message: "WE NEED MUSIC FOR A BIRTHDAY PARTY.",
    })),
  );
});
