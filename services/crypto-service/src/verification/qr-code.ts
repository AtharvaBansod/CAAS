/**
 * QR Code Generator
 * Generates QR codes for safety number verification
 */

import { keyEncoding } from '../keys/key-encoding';
import { QRCodeData } from './types';

export class QRCodeGenerator {
  private readonly VERSION = 1;

  /**
   * Generate QR code data
   */
  async generateQRCode(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer
  ): Promise<Buffer> {
    // Generate fingerprints
    const user1Fingerprint = keyEncoding.generateShortFingerprint(
      user1IdentityKey
    );
    const user2Fingerprint = keyEncoding.generateShortFingerprint(
      user2IdentityKey
    );

    // Create QR data
    const qrData: QRCodeData = {
      version: this.VERSION,
      user1_id: user1Id,
      user2_id: user2Id,
      user1_key_fingerprint: user1Fingerprint,
      user2_key_fingerprint: user2Fingerprint,
    };

    // Serialize to JSON
    const jsonData = JSON.stringify(qrData);

    // In production, would use actual QR code library
    // For now, return the data as buffer
    return Buffer.from(jsonData);
  }

  /**
   * Generate QR code as SVG
   */
  async generateSVG(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer
  ): Promise<string> {
    const data = await this.generateQRCode(
      user1Id,
      user1IdentityKey,
      user2Id,
      user2IdentityKey
    );

    // In production, would generate actual SVG QR code
    // For now, return placeholder
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-size="12">
        QR Code: ${data.toString('base64').slice(0, 20)}...
      </text>
    </svg>`;
  }

  /**
   * Generate QR code as PNG (base64)
   */
  async generatePNG(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer
  ): Promise<string> {
    const data = await this.generateQRCode(
      user1Id,
      user1IdentityKey,
      user2Id,
      user2IdentityKey
    );

    // In production, would generate actual PNG QR code
    // For now, return placeholder base64
    return data.toString('base64');
  }

  /**
   * Parse QR code data
   */
  parseQRCode(data: Buffer): QRCodeData {
    const parsed = JSON.parse(data.toString());

    if (parsed.version !== this.VERSION) {
      throw new Error('Unsupported QR code version');
    }

    return parsed as QRCodeData;
  }

  /**
   * Verify QR code matches expected users
   */
  verifyQRCode(
    qrData: QRCodeData,
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer
  ): boolean {
    const user1Fingerprint = keyEncoding.generateShortFingerprint(
      user1IdentityKey
    );
    const user2Fingerprint = keyEncoding.generateShortFingerprint(
      user2IdentityKey
    );

    // Check both orderings
    const match1 =
      qrData.user1_id === user1Id &&
      qrData.user2_id === user2Id &&
      qrData.user1_key_fingerprint === user1Fingerprint &&
      qrData.user2_key_fingerprint === user2Fingerprint;

    const match2 =
      qrData.user1_id === user2Id &&
      qrData.user2_id === user1Id &&
      qrData.user1_key_fingerprint === user2Fingerprint &&
      qrData.user2_key_fingerprint === user1Fingerprint;

    return match1 || match2;
  }
}

export const qrCodeGenerator = new QRCodeGenerator();
