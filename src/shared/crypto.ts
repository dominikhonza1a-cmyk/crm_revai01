import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { loadConfig } from "@/config/app.config";

/**
 * Symetrické šifrování citlivých hodnot v DB (OAuth refresh tokeny). AES-256-GCM,
 * klíč = SHA-256(TOKEN_ENCRYPTION_KEY). Formát: base64(iv[12] | authTag[16] | ciphertext).
 */
function key(): Buffer {
  const secret = loadConfig().TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY není nastaven — nutný pro šifrování OAuth tokenů.");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
