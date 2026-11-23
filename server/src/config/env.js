import "dotenv/config";

// All environment-driven settings in one place, read once at startup.
export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me",
  jwtExpiresIn: "12h",
  smtp: {
    host: process.env.SMTP_HOST ?? null,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? null,
    pass: process.env.SMTP_PASS ?? null,
    from: process.env.SMTP_FROM ?? "PMO Pilot <noreply@pmo-pilot.local>",
    fromAddress: process.env.SMTP_FROM_ADDRESS ?? "noreply@pmo-pilot.local",
  },
};

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set — using an insecure default. Set it in server/.env before deploying.");
}
