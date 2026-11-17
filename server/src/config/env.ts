import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  MONGO_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  REDIS_URL: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_DELIVERY_MODE: z.enum(["resend", "smtp", "console"]).default("resend"),
  EMAIL_FROM: z.string().min(3).optional(),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().optional(),
  MSG91_API_KEY: z.string().optional(),
  METERED_TURN_CREDENTIALS_URL: z.string().url(),
  CLIENT_ORIGIN: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(32),
}).superRefine((data, context) => {
  if (data.NODE_ENV === "production" && data.EMAIL_DELIVERY_MODE === "console") {
    context.addIssue({
      code: "custom",
      path: ["EMAIL_DELIVERY_MODE"],
      message: "Production email delivery must use resend or smtp",
    });
  }
  if (
    (data.EMAIL_DELIVERY_MODE === "smtp" ||
      (data.NODE_ENV === "production" && data.EMAIL_DELIVERY_MODE === "resend")) &&
    (!data.EMAIL_FROM?.trim() || data.EMAIL_FROM.toLowerCase().includes("@resend.dev"))
  ) {
    context.addIssue({
      code: "custom",
      path: ["EMAIL_FROM"],
      message: "EMAIL_FROM must be an address authorized by your email provider",
    });
  }
  if (data.EMAIL_DELIVERY_MODE === "resend" && !data.RESEND_API_KEY) {
    context.addIssue({
      code: "custom",
      path: ["RESEND_API_KEY"],
      message: "RESEND_API_KEY is required in resend mode",
    });
  }
  if (data.EMAIL_DELIVERY_MODE === "smtp") {
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const) {
      if (!data[key]?.trim()) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required in smtp mode`,
        });
      }
    }
  }
  if (
    data.NODE_ENV === "production" &&
    data.RAZORPAY_WEBHOOK_SECRET.toLowerCase().includes("your-razorpay")
  ) {
    context.addIssue({
      code: "custom",
      path: ["RAZORPAY_WEBHOOK_SECRET"],
      message: "Production requires the real Razorpay webhook signing secret",
    });
  }
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;
