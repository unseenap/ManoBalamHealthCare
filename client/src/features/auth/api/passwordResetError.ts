import { isAxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/global.types";

export function passwordResetError(error: unknown, fallback: string): string {
  if (!isAxiosError<ApiErrorResponse>(error)) return fallback;
  const data = error.response?.data;
  if (data?.code === "RATE_LIMITED") return "Too many attempts. Please try again in 15 minutes.";
  if (data?.code === "OTP_INVALID") return data.message;
  if (data?.code === "VALIDATION_ERROR" && Array.isArray(data.details)) {
    const issue = data.details.find((item: unknown) =>
      typeof item === "object" && item !== null && "message" in item && typeof item.message === "string",
    );
    if (issue) return issue.message;
  }
  return fallback;
}
