import bcrypt from "bcrypt";
import redis from "@/config/redis";
import { UserModel } from "@/modules/user/user.model";
import { sendPasswordResetEmail } from "@/modules/notification/channels/email.channel";
import { hashResetOtp, passwordResetKey } from "@/utils/passwordResetOtp";
import { AuthService } from "./auth.service";

jest.mock("@/config/redis", () => ({ __esModule: true, default: { set: jest.fn(), eval: jest.fn() } }));
jest.mock("@/modules/user/user.model", () => ({ UserModel: { findOne: jest.fn(), findById: jest.fn() } }));
jest.mock("@/modules/psychologist/psychologist.model", () => ({ PsychologistModel: {} }));
jest.mock("@/modules/notification/channels/email.channel", () => ({ sendOtpEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock("@/middlewares/auth.middleware", () => ({}));
jest.mock("@/utils/logger", () => ({ logger: { info: jest.fn() } }));

const service = new AuthService();
const findOne = jest.mocked(UserModel.findOne);
const findById = jest.mocked(UserModel.findById);
const evaluate = jest.mocked(redis.eval);
const sendEmail = jest.mocked(sendPasswordResetEmail);

describe("password reset by emailed OTP", () => {
  beforeEach(() => jest.resetAllMocks());

  it("emails a six-digit code and stores only its hash for five minutes", async () => {
    findOne.mockResolvedValue({ _id: "user-1", email: "user@example.com", name: "Test User" } as never);
    await service.forgotPassword(" User@Example.com ");
    expect(findOne).toHaveBeenCalledWith({ email: "user@example.com", isActive: true });
    const otp = sendEmail.mock.calls[0][2];
    expect(otp).toMatch(/^\d{6}$/);
    const [key, value, expiryMode, ttl] = jest.mocked(redis.set).mock.calls[0];
    expect(key).toBe(passwordResetKey("user@example.com"));
    expect(JSON.parse(String(value))).toEqual({ userId: "user-1", hash: hashResetOtp(otp), attempts: 0 });
    expect(expiryMode).toBe("EX");
    expect(ttl).toBe(300);
  });

  it("returns normally without emailing an unknown account", async () => {
    findOne.mockResolvedValue(null);
    await expect(service.forgotPassword("missing@example.com")).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("removes its own pending code when email delivery fails", async () => {
    findOne.mockResolvedValue({ _id: "user-1", email: "user@example.com", name: "Test User" } as never);
    sendEmail.mockRejectedValue(new Error("Email unavailable"));
    await expect(service.forgotPassword("user@example.com")).rejects.toThrow("Email unavailable");
    expect(evaluate).toHaveBeenCalledWith(expect.stringContaining("== ARGV[1]"), 1,
      passwordResetKey("user@example.com"), jest.mocked(redis.set).mock.calls[0][1]);
  });

  it("never accesses the account when code verification fails", async () => {
    evaluate.mockResolvedValue(null);
    await expect(service.resetPassword("user@example.com", "123456", "Strongpass1"))
      .rejects.toMatchObject({ code: "OTP_INVALID", statusCode: 400 });
    expect(findById).not.toHaveBeenCalled();
  });

  it("hashes the new password and invalidates existing sessions after consuming a valid code", async () => {
    evaluate.mockResolvedValue("user-1");
    const user = { isActive: true, passwordHash: "old", authVersion: 2, save: jest.fn().mockResolvedValue(undefined) };
    findById.mockResolvedValue(user as never);
    await service.resetPassword(" USER@example.com ", "012345", "Strongpass1");
    expect(evaluate).toHaveBeenCalledWith(expect.any(String), 1, passwordResetKey("user@example.com"), hashResetOtp("012345"));
    expect(await bcrypt.compare("Strongpass1", user.passwordHash)).toBe(true);
    expect(user.authVersion).toBe(3);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it("rejects accounts deactivated after requesting the code", async () => {
    evaluate.mockResolvedValue("user-1");
    const user = { isActive: false, save: jest.fn() };
    findById.mockResolvedValue(user as never);
    await expect(service.resetPassword("user@example.com", "123456", "Strongpass1"))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(user.save).not.toHaveBeenCalled();
  });
});
