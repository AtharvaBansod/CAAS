import crypto from 'crypto';

export const generateWebhookSignature = (payload: string, secret: string, timestamp: number): string => {
  const data = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
};

export const verifyWebhookSignature = (
  payload: string,
  secret: string,
  header: string,
  tolerance: number = 300 // 5 minutes
): boolean => {
  const parts = header.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = parseInt(timestampPart.substring(2), 10);
  const signature = signaturePart.substring(3);

  if (isNaN(timestamp)) return false;

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) return false;

  const expectedSignature = generateWebhookSignature(payload, secret, timestamp);
  // Extract just the signature part for comparison
  const expectedSigValue = expectedSignature.split('v1=')[1];

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSigValue));
};
