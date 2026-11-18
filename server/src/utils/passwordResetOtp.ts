import crypto from "crypto";
import redis from "@/config/redis";

export const passwordResetKey = (email: string): string =>
  `password-reset-otp:${crypto.createHash("sha256").update(email).digest("hex")}`;

export const hashResetOtp = (otp: string): string =>
  crypto.createHash("sha256").update(otp).digest("hex");

// Check, count failed attempts, and consume the code atomically, including when
// requests arrive concurrently. A replacement code always gets a fresh record.
export const CONSUME_RESET_OTP = `
local raw = redis.call('GET', KEYS[1])
if not raw then return false end
local record = cjson.decode(raw)
if record.hash ~= ARGV[1] then
  record.attempts = record.attempts + 1
  if record.attempts >= 5 then
    redis.call('DEL', KEYS[1])
  else
    redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
  end
  return false
end
redis.call('DEL', KEYS[1])
return record.userId
`;

export const consumeResetOtp = async (email: string, otp: string): Promise<string | null> => {
  const result = await redis.eval(CONSUME_RESET_OTP, 1, passwordResetKey(email), hashResetOtp(otp));
  return typeof result === "string" ? result : null;
};
