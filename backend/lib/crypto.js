'use strict';

const crypto = require('crypto');

const ALGO = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * Get encryption key from env, ensure 32 bytes.
 * If ENCRYPTION_KEY is hex, use first 32 bytes.
 * Otherwise derive via SHA-256.
 */
function getKey() {
  const envKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-me';
  // If hex string of 64 chars → use directly
  if (/^[0-9a-f]{64}$/i.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  // Otherwise SHA-256 derive
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypt plaintext → "iv:encryptedHex" string
 */
function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt "iv:encryptedHex" → plaintext
 */
function decrypt(data) {
  const key = getKey();
  const [ivHex, encryptedHex] = data.split(':');
  if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
