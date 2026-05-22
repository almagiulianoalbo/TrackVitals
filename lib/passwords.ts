import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const SCHEME = "pbkdf2_sha256";
const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("base64url");

  return `${SCHEME}$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedPassword: string) {
  if (!storedPassword) {
    return false;
  }

  if (!storedPassword.startsWith(`${SCHEME}$`)) {
    return safeStringCompare(password, storedPassword);
  }

  const [scheme, iterationsValue, salt, expectedHash] = storedPassword.split("$");

  if (scheme !== SCHEME || !iterationsValue || !salt || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsValue);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const actualHash = pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST);
  const expectedBuffer = Buffer.from(expectedHash, "base64url");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}

function safeStringCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
