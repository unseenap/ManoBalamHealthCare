import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation";

describe("authentication validation", () => {
  it("requires a verified email-capable registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Test Psychologist",
      email: "psychologist@example.com",
      password: "SecurePass1",
      role: "psychologist",
      country: "IN",
      timezone: "Asia/Kolkata",
    });
    expect(result.success).toBe(true);
  });

  it("rejects phone-only registration until an SMS provider is supported", () => {
    const result = registerSchema.safeParse({
      name: "Test Psychologist",
      phone: "+911234567890",
      password: "SecurePass1",
      role: "psychologist",
      country: "IN",
      timezone: "Asia/Kolkata",
    });
    expect(result.success).toBe(false);
  });

  it("enforces password reset strength", () => {
    const credentials = { email: "user@example.com", otp: "012345" };
    expect(resetPasswordSchema.safeParse({ ...credentials, password: "weakpass" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...credentials, password: "Strongpass1" }).success).toBe(true);
  });

  it("requires an email and exactly six numeric OTP digits instead of a link token", () => {
    const payload = { email: "user@example.com", otp: "012345", password: "Strongpass1" };
    for (const otp of ["12345", "1234567", "12a456", ""]) {
      expect(resetPasswordSchema.safeParse({ ...payload, otp }).success).toBe(false);
    }
    expect(resetPasswordSchema.safeParse({ ...payload, email: "invalid" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "a".repeat(64), password: "Strongpass1" }).success).toBe(false);
  });

  it("normalizes reset emails and preserves leading zeroes in the OTP", () => {
    expect(forgotPasswordSchema.parse({ email: " User@Example.com " })).toEqual({ email: "user@example.com" });
    expect(resetPasswordSchema.parse({ email: " User@Example.com ", otp: "012345", password: "Strongpass1" })).toEqual({
      email: "user@example.com", otp: "012345", password: "Strongpass1",
    });
  });
});
