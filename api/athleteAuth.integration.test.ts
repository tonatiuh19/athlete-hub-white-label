/**
 */
import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import {
  mountAthleteAuthScenario,
  teardownAthleteAuthScenario,
  AUTH_SCENARIO,
} from "../tests/helpers/athleteAuthHarness";
import { hashAthletePassword } from "../server/password";
import { getCapturedTestEmails } from "./testHooks";

const STRONG_PASSWORD = "AtleitaTest1!";
const NEW_PASSWORD = "NewAtleita2@";

function registerBody(email: string, overrides: Record<string, unknown> = {}) {
  return {
    email,
    firstName: "New",
    lastName: "User",
    password: STRONG_PASSWORD,
    dateOfBirth: "1995-03-10",
    ...overrides,
  };
}

async function hashForDb(password: string): Promise<string> {
  return hashAthletePassword(password);
}

async function clerkResolverFor(profile: {
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  googleId?: string | null;
}) {
  const hooks = await import("./testHooks");
  hooks.setTestClerkProfileResolver(async (token) => {
    if (token === "invalid") {
      return { error: "Invalid or expired social session. Please try again." };
    }
    return {
      profile: {
        clerkUserId: profile.clerkUserId,
        email: profile.email,
        firstName: profile.firstName ?? "Social",
        lastName: profile.lastName ?? "User",
        googleId: profile.googleId ?? "google-new-999",
        appleId: null,
        avatarUrl: null,
      },
    };
  });
}

describe("HTTP smoke: athlete password auth", () => {
  afterEach(async () => {
    await teardownAthleteAuthScenario();
  });

  it("check-email returns exists/hasPassword/hasSocialLogin flags", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({ passwordHash: hash, hasSocial: true });

    const unknown = await request(app)
      .post("/api/auth/athlete/check-email")
      .send({ email: "new@test.local" });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({
      exists: false,
      hasPassword: false,
      hasSocialLogin: false,
    });

    const known = await request(app)
      .post("/api/auth/athlete/check-email")
      .send({ email: AUTH_SCENARIO.email });
    expect(known.status).toBe(200);
    expect(known.body.exists).toBe(true);
    expect(known.body.hasPassword).toBe(true);
    expect(known.body.hasSocialLogin).toBe(true);
  });

  it("register rejects weak password and duplicate email", async () => {
    const { app } = await mountAthleteAuthScenario();

    const weak = await request(app).post("/api/auth/athlete/register").send({
      email: "new@test.local",
      firstName: "New",
      lastName: "User",
      password: "short",
      dateOfBirth: "1995-03-10",
    });
    expect(weak.status).toBe(400);

    const noDob = await request(app).post("/api/auth/athlete/register").send({
      email: "nodob@test.local",
      firstName: "New",
      lastName: "User",
      password: STRONG_PASSWORD,
    });
    expect(noDob.status).toBe(400);

    const ok = await request(app).post("/api/auth/athlete/register").send({
      email: "new@test.local",
      firstName: "New",
      lastName: "User",
      password: STRONG_PASSWORD,
      dateOfBirth: "1995-03-10",
      gender: "female",
    });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.athlete.email).toBe("new@test.local");
    expect(ok.body.athlete.dateOfBirth).toBe("1995-03-10");

    const dup = await request(app).post("/api/auth/athlete/register").send({
      email: "new@test.local",
      firstName: "Dup",
      lastName: "User",
      password: STRONG_PASSWORD,
      dateOfBirth: "1995-03-10",
    });
    expect(dup.status).toBe(409);
  });

  it("password login is disabled (use OTP)", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({ passwordHash: hash });
    const res = await request(app).post("/api/auth/athlete/login").send({
      email: AUTH_SCENARIO.email,
      password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(410);
    expect(res.body.error).toBe("password_auth_disabled");
  });

  it("forgot-password is disabled", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({ passwordHash: hash });
    const res = await request(app)
      .post("/api/auth/athlete/forgot-password")
      .send({ email: AUTH_SCENARIO.email });
    expect(res.status).toBe(410);
  });

  it("reset-password is disabled", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null });
    const res = await request(app).post("/api/auth/athlete/reset-password").send({
      email: AUTH_SCENARIO.email,
      code: "119933",
      password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(410);
  });

  it("reset-password shape checks are moot (endpoint gone)", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null });
    const missing = await request(app).post("/api/auth/athlete/reset-password").send({
      code: "123456",
      password: STRONG_PASSWORD,
    });
    expect(missing.status).toBe(410);
  });
});

describe("HTTP smoke: athlete auth — validation & edge cases", () => {
  afterEach(async () => {
    await teardownAthleteAuthScenario();
  });

  it("check-email rejects invalid and empty email", async () => {
    const { app } = await mountAthleteAuthScenario();
    const empty = await request(app).post("/api/auth/athlete/check-email").send({ email: "" });
    expect(empty.status).toBe(400);
    const bad = await request(app).post("/api/auth/athlete/check-email").send({ email: "not-an-email" });
    expect(bad.status).toBe(400);
  });

  it("password login returns 410 for any email", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({ passwordHash: hash });
    const unknown = await request(app)
      .post("/api/auth/athlete/login")
      .send({ email: "ghost@test.local", password: STRONG_PASSWORD });
    expect(unknown.status).toBe(410);
  });

  it("password login endpoint is gone", async () => {
    const { app } = await mountAthleteAuthScenario();
    const res = await request(app).post("/api/auth/athlete/login").send({ email: AUTH_SCENARIO.email });
    expect(res.status).toBe(410);
  });

  it("register rejects missing names, invalid gender, and bad dob", async () => {
    const { app } = await mountAthleteAuthScenario();

    const noName = await request(app)
      .post("/api/auth/athlete/register")
      .send(registerBody("noname@test.local", { firstName: "", lastName: "" }));
    expect(noName.status).toBe(400);

    const badGender = await request(app)
      .post("/api/auth/athlete/register")
      .send(registerBody("badgender@test.local", { gender: "invalid" }));
    expect(badGender.status).toBe(400);

    const badDob = await request(app)
      .post("/api/auth/athlete/register")
      .send(registerBody("baddob@test.local", { dateOfBirth: "03-10-1995" }));
    expect(badDob.status).toBe(400);
  });

  it("register returns social_account_exists when email is social-only", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null, hasSocial: true });
    const res = await request(app)
      .post("/api/auth/athlete/register")
      .send(registerBody(AUTH_SCENARIO.email));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("social_account_exists");
  });

  it("suspended athletes are unknown on check-email/login and can re-register", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({
      passwordHash: hash,
      status: "suspended",
    });

    const check = await request(app)
      .post("/api/auth/athlete/check-email")
      .send({ email: AUTH_SCENARIO.email });
    expect(check.status).toBe(200);
    expect(check.body.exists).toBe(false);

    const login = await request(app).post("/api/auth/athlete/login").send({
      email: AUTH_SCENARIO.email,
      password: STRONG_PASSWORD,
    });
    expect(login.status).toBe(410);

    const reactivate = await request(app)
      .post("/api/auth/athlete/register")
      .send(registerBody(AUTH_SCENARIO.email));
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.reactivated).toBe(true);
    expect(reactivate.body.athlete.dateOfBirth).toBe("1995-03-10");
  });

  it("soft-deleted athletes are unknown on check-email/login and can re-register", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({
      passwordHash: hash,
      deleted: true,
    });

    const check = await request(app)
      .post("/api/auth/athlete/check-email")
      .send({ email: AUTH_SCENARIO.email });
    expect(check.status).toBe(200);
    expect(check.body.exists).toBe(false);

    const login = await request(app).post("/api/auth/athlete/login").send({
      email: AUTH_SCENARIO.email,
      password: STRONG_PASSWORD,
    });
    expect(login.status).toBe(410);

    const reactivate = await request(app)
      .post("/api/auth/athlete/register")
      .send(registerBody(AUTH_SCENARIO.email));
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.reactivated).toBe(true);
  });

  it("forgot-password is disabled for invalid and unknown emails", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null });
    const bad = await request(app).post("/api/auth/athlete/forgot-password").send({ email: "bad" });
    expect(bad.status).toBe(410);
    const ghost = await request(app)
      .post("/api/auth/athlete/forgot-password")
      .send({ email: "ghost@test.local" });
    expect(ghost.status).toBe(410);
  });

  it("reset-password is disabled even for expired codes", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null });
    const res = await request(app).post("/api/auth/athlete/reset-password").send({
      email: AUTH_SCENARIO.email,
      code: "445566",
      password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(410);
  });
});

describe("HTTP smoke: athlete auth — onboarding & session journey", () => {
  afterEach(async () => {
    await teardownAthleteAuthScenario();
  });

  it("register → /athlete/me → logout invalidates session", async () => {
    const { app } = await mountAthleteAuthScenario();
    const reg = await request(app)
      .post("/api/auth/athlete/register")
      .send(registerBody("journey@test.local"));
    expect(reg.status).toBe(200);
    const token = reg.body.token as string;

    const me = await request(app)
      .get("/api/athlete/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.athlete.email).toBe("journey@test.local");
    expect(me.body.athlete.date_of_birth).toBe("1995-03-10");

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);

    const meAfter = await request(app)
      .get("/api/athlete/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meAfter.status).toBe(401);
  });

  it("password reset journey is disabled — OTP still works", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({ passwordHash: hash });
    const forgot = await request(app)
      .post("/api/auth/athlete/forgot-password")
      .send({ email: AUTH_SCENARIO.email });
    expect(forgot.status).toBe(410);
    const otp = await request(app)
      .post("/api/auth/athlete/request-otp")
      .send({ email: AUTH_SCENARIO.email });
    expect(otp.status).toBe(200);
  });

  it("social-only accounts use OTP; password surfaces are gone", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null, hasSocial: true });
    const forgot = await request(app)
      .post("/api/auth/athlete/forgot-password")
      .send({ email: AUTH_SCENARIO.email });
    expect(forgot.status).toBe(410);
    const login = await request(app).post("/api/auth/athlete/login").send({
      email: AUTH_SCENARIO.email,
      password: "AnyPass1!",
    });
    expect(login.status).toBe(410);
    const otp = await request(app)
      .post("/api/auth/athlete/request-otp")
      .send({ email: AUTH_SCENARIO.email });
    expect(otp.status).toBe(200);
  });
});

describe("HTTP smoke: athlete auth — social (Clerk) linking", () => {
  afterEach(async () => {
    await teardownAthleteAuthScenario();
  });

  it("Clerk athlete sync is disabled", async () => {
    const { app } = await mountAthleteAuthScenario();
    await clerkResolverFor({
      clerkUserId: "clerk-new-1",
      email: "google-new@test.local",
    });
    const res = await request(app)
      .post("/api/auth/clerk/athlete")
      .send({ sessionToken: "valid-google-token" });
    expect(res.status).toBe(410);
    expect(res.body.error).toBe("clerk_disabled");

    const missing = await request(app).post("/api/auth/clerk/athlete").send({});
    expect(missing.status).toBe(410);
  });
});

describe("HTTP smoke: athlete passwordless OTP", () => {
  afterEach(async () => {
    await teardownAthleteAuthScenario();
  });

  function otpFromEmails(): string {
    const emails = getCapturedTestEmails();
    const last = emails[emails.length - 1];
    const match = last?.text?.match(/\b(\d{6})\b/) ?? last?.html?.match(/\b(\d{6})\b/);
    if (!match?.[1]) throw new Error("OTP code not found in captured email");
    return match[1];
  }

  it("request-otp + verify-otp signs in existing athlete without password", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null });

    const missing = await request(app)
      .post("/api/auth/athlete/request-otp")
      .send({ email: "ghost@test.local" });
    expect(missing.status).toBe(404);

    const sent = await request(app)
      .post("/api/auth/athlete/request-otp")
      .send({ email: AUTH_SCENARIO.email });
    expect(sent.status).toBe(200);
    expect(sent.body.ok).toBe(true);

    const code = otpFromEmails();
    const bad = await request(app).post("/api/auth/athlete/verify-otp").send({
      email: AUTH_SCENARIO.email,
      code: "000000",
    });
    expect(bad.status).toBe(401);

    const ok = await request(app).post("/api/auth/athlete/verify-otp").send({
      email: AUTH_SCENARIO.email,
      code,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.athlete.email).toBe(AUTH_SCENARIO.email);
  });

  it("passwordless register sends OTP then issues session on verify", async () => {
    const { app } = await mountAthleteAuthScenario();

    const reg = await request(app).post("/api/auth/athlete/register").send({
      email: "otp-new@test.local",
      firstName: "Otp",
      lastName: "Newbie",
      dateOfBirth: "1998-01-15",
      gender: "male",
    });
    expect(reg.status).toBe(200);
    expect(reg.body.requiresOtp).toBe(true);
    expect(reg.body.token).toBeUndefined();

    const code = otpFromEmails();
    const verified = await request(app).post("/api/auth/athlete/verify-otp").send({
      email: "otp-new@test.local",
      code,
    });
    expect(verified.status).toBe(200);
    expect(verified.body.token).toBeTruthy();
    expect(verified.body.athlete.firstName).toBe("Otp");
  });

  it("allows OTP for social-linked accounts (Clerk disabled)", async () => {
    const { app } = await mountAthleteAuthScenario({
      passwordHash: null,
      hasSocial: true,
    });
    const res = await request(app)
      .post("/api/auth/athlete/request-otp")
      .send({ email: AUTH_SCENARIO.email });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const login = await request(app).post("/api/auth/athlete/login").send({
      email: AUTH_SCENARIO.email,
      password: "AnyPass1!",
    });
    expect(login.status).toBe(410);
  });

  it("athletes with a password can still sign in via OTP", async () => {
    const hash = await hashForDb(STRONG_PASSWORD);
    const { app } = await mountAthleteAuthScenario({ passwordHash: hash });

    const sent = await request(app)
      .post("/api/auth/athlete/request-otp")
      .send({ email: AUTH_SCENARIO.email });
    expect(sent.status).toBe(200);

    const code = otpFromEmails();
    const ok = await request(app).post("/api/auth/athlete/verify-otp").send({
      email: AUTH_SCENARIO.email,
      code,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });

  it("passwordless reactivate of suspended athlete requires OTP", async () => {
    const { app } = await mountAthleteAuthScenario({
      passwordHash: null,
      status: "suspended",
    });

    const reactivate = await request(app).post("/api/auth/athlete/register").send({
      email: AUTH_SCENARIO.email,
      firstName: "Back",
      lastName: "Again",
      dateOfBirth: "1995-03-10",
      gender: "male",
    });
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.requiresOtp).toBe(true);

    const code = otpFromEmails();
    const verified = await request(app).post("/api/auth/athlete/verify-otp").send({
      email: AUTH_SCENARIO.email,
      code,
    });
    expect(verified.status).toBe(200);
    expect(verified.body.token).toBeTruthy();
  });

  it("abandoned passwordless register recovers via request-otp", async () => {
    const { app } = await mountAthleteAuthScenario();

    const reg = await request(app).post("/api/auth/athlete/register").send({
      email: "abandon@test.local",
      firstName: "Ab",
      lastName: "Andon",
      dateOfBirth: "1999-02-02",
    });
    expect(reg.status).toBe(200);
    expect(reg.body.requiresOtp).toBe(true);

    const check = await request(app)
      .post("/api/auth/athlete/check-email")
      .send({ email: "abandon@test.local" });
    expect(check.body.exists).toBe(true);
    expect(check.body.hasPassword).toBe(false);

    const sent = await request(app)
      .post("/api/auth/athlete/request-otp")
      .send({ email: "abandon@test.local" });
    expect(sent.status).toBe(200);

    const code = otpFromEmails();
    const verified = await request(app).post("/api/auth/athlete/verify-otp").send({
      email: "abandon@test.local",
      code,
    });
    expect(verified.status).toBe(200);
    expect(verified.body.token).toBeTruthy();
  });

  it("forgot-password is disabled for passwordless athletes", async () => {
    const { app } = await mountAthleteAuthScenario({ passwordHash: null });
    const res = await request(app)
      .post("/api/auth/athlete/forgot-password")
      .send({ email: AUTH_SCENARIO.email });
    expect(res.status).toBe(410);
  });
});

describe("unit smoke: password policy", () => {
  it("enforces all strength requirements", async () => {
    const { validateAthletePassword } = await import("../shared/passwordPolicy");
    expect(validateAthletePassword("short").valid).toBe(false);
    expect(validateAthletePassword("alllowercase1!").valid).toBe(false);
    expect(validateAthletePassword("NoNumber!!").valid).toBe(false);
    expect(validateAthletePassword("AtleitaTest1!").valid).toBe(true);
  });

  it("hash + verify round-trip", async () => {
    const { hashAthletePassword, verifyAthletePassword } = await import("../server/password");
    const hash = await hashAthletePassword(STRONG_PASSWORD);
    expect(await verifyAthletePassword(STRONG_PASSWORD, hash)).toBe(true);
    expect(await verifyAthletePassword("WrongPass1!", hash)).toBe(false);
  });
});
