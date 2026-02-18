export const AUTH_CONFIG = {
  password: process.env.AUTH_PASSWORD || "admin123",
  sessionSecret: process.env.SESSION_SECRET || "super-secret-key-change-in-production-at-least-32-chars",
  sessionName: "video-gen-session",
  cookieMaxAge: 60 * 60 * 24 * 7,
};

export function isValidPassword(password: string): boolean {
  return password === AUTH_CONFIG.password;
}
