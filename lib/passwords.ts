import { createHash, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, storedPassword: string | null | undefined) {
  if (!storedPassword) return false;

  if (storedPassword === password) return true;

  const hashed = hashPassword(password);
  const left = Buffer.from(hashed);
  const right = Buffer.from(storedPassword);

  if (left.length !== right.length) {
    return hashed === storedPassword;
  }

  return timingSafeEqual(left, right);
}
