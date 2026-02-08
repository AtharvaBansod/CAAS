/**
 * QR Code Generator
 * Phase 2 - Authentication - Task AUTH-009
 * 
 * Generates QR codes for TOTP setup
 */

import QRCode from 'qrcode';

export class QRGenerator {
  /**
   * Generate QR code as base64 PNG
   */
  async generateQRCode(uri: string): Promise<string> {
    try {
      // Generate QR code as data URL
      const qrCode = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1,
      });

      return qrCode;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Generate QR code as SVG
   */
  async generateQRCodeSVG(uri: string): Promise<string> {
    try {
      const svg = await QRCode.toString(uri, {
        errorCorrectionLevel: 'M',
        type: 'svg',
        width: 300,
        margin: 1,
      });

      return svg;
    } catch (error) {
      throw new Error(`Failed to generate QR code SVG: ${error}`);
    }
  }

  /**
   * Generate QR code as buffer
   */
  async generateQRCodeBuffer(uri: string): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(uri, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 300,
        margin: 1,
      });

      return buffer;
    } catch (error) {
      throw new Error(`Failed to generate QR code buffer: ${error}`);
    }
  }

  /**
   * Validate URI format
   */
  isValidOTPAuthURI(uri: string): boolean {
    return uri.startsWith('otpauth://totp/');
  }
}
