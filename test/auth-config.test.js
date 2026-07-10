const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("auth config does not create a Mongo connection at module import", () => {
  const source = readFileSync(path.join(__dirname, "../src/auth.ts"), "utf8");

  assert.equal(source.includes("@auth/mongodb-adapter"), false);
  assert.equal(source.includes("@/lib/db"), false);
});

test("auth exchange sends the server-side shared secret when configured", () => {
  const source = readFileSync(path.join(__dirname, "../src/auth.ts"), "utf8");

  assert.equal(source.includes("process.env.AUTH_EXCHANGE_SECRET"), true);
  assert.equal(source.includes("x-giggle-auth-exchange-secret"), true);
});

test("auth exchange rejects non-ok backend responses before mutating token", () => {
  const source = readFileSync(path.join(__dirname, "../src/auth.ts"), "utf8");

  assert.equal(source.includes("if (!res.ok || data?.ok === false)"), true);
  assert.equal(source.includes("throw new Error(`Auth exchange failed"), true);
});

test("auth exchange failures fail closed instead of creating a partial session", () => {
  const source = readFileSync(path.join(__dirname, "../src/auth.ts"), "utf8");

  assert.equal(source.includes("console.error(\"Auth exchange failed:\", err);"), true);
  assert.equal(source.includes("throw err;"), true);
});

test("admin page does not hard-code a personal admin email", () => {
  const source = readFileSync(path.join(__dirname, "../src/app/admin/page.tsx"), "utf8");
  const forbiddenPersonalEmail = ["himanshu", "builds@gmail.com"].join(".");

  assert.equal(source.includes(forbiddenPersonalEmail), false);
  assert.equal(source.includes("NEXT_PUBLIC_ADMIN_EMAIL"), true);
});

test("admin approval checks backend ok field before showing success", () => {
  const source = readFileSync(path.join(__dirname, "../src/app/admin/page.tsx"), "utf8");

  assert.equal(source.includes("const data = await res.json();"), true);
  assert.equal(source.includes("if (!res.ok || data?.ok === false)"), true);
  assert.equal(source.includes("setMessage(data?.error?.message || \"Approval failed. Please try again.\")"), true);
});

test("approval gate cannot be bypassed by a public client env flag", () => {
  const source = readFileSync(path.join(__dirname, "../src/app/page.tsx"), "utf8");

  assert.equal(source.includes("NEXT_PUBLIC_BYPASS_APPROVAL"), false);
  assert.equal(source.includes("!session.user.isApproved"), true);
});

test("socket client uses the shared backend URL config", () => {
  const source = readFileSync(path.join(__dirname, "../src/lib/socket.ts"), "utf8");

  assert.equal(source.includes('import { BACKEND_URL } from "@/config/appConfig";'), true);
  assert.equal(source.includes("process.env.NEXT_PUBLIC_BACKEND_URL"), false);
  assert.equal(source.includes("io(BACKEND_URL"), true);
});

test("web backend URL config fails fast when production env is missing", () => {
  const source = readFileSync(path.join(__dirname, "../src/config/appConfig.ts"), "utf8");

  assert.equal(source.includes('process.env.NODE_ENV === "production"'), true);
  assert.equal(source.includes("NEXT_PUBLIC_BACKEND_URL is required in production"), true);
});

test("legacy web premium copy does not advertise queue priority", () => {
  const source = readFileSync(path.join(__dirname, "../src/app/page.tsx"), "utf8");

  assert.equal(source.includes("Fast Pass"), false);
  assert.equal(source.includes("prioritizes your squad"), false);
  assert.equal(source.includes("faster"), false);
  assert.equal(source.includes("1080p"), false);
  assert.equal(source.includes("high-bitrate video"), false);
});
