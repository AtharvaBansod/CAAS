#!/usr/bin/env node
/**
 * Generate JWT RSA keys for development if they don't exist.
 * Run: node scripts/generate-jwt-keys.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const keysDir = path.join(__dirname, '..', 'keys');
const privPath = path.join(keysDir, 'private.pem');
const pubPath = path.join(keysDir, 'public.pem');

if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
  process.exit(0);
}

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(privPath, privateKey);
fs.writeFileSync(pubPath, publicKey);
console.log('Generated JWT keys in', keysDir);
