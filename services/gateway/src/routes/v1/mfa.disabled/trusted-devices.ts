/**
 * Trusted Devices Routes
 * Manage devices that skip MFA for a period
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const trustedDeviceSchema = z.object({
  id: z.string(),
  device_name: z.string(),
  device_type: z.string(),
  trusted_at: z.string(),
  expires_at: z.string(),
  last_used: z.string(),
  is_current: z.boolean(),
});

const listResponseSchema = z.object({
  devices: z.array(trustedDeviceSchema),
  total: z.number(),
});

const removeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const trustedDevicesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/mfa/trusted-devices - List trusted devices
  fastify.get('/', {
    schema: {
      description: 'List all trusted devices',
      tags: ['mfa', 'trusted-devices'],
      security: [{ bearerAuth: [] }],
      response: {
        200: listResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const currentDeviceId = request.user.device_id;

    const trustedDeviceService = fastify.authServices.getTrustedDeviceService();

    // Get all trusted devices
    const devices = await trustedDeviceService.getTrustedDevices(userId);

    // Format response
    const formattedDevices = devices.map(device => ({
      id: device.device_id,
      device_name: device.device_name,
      device_type: device.device_info?.type || 'unknown',
      trusted_at: new Date(device.trusted_at).toISOString(),
      expires_at: new Date(device.expires_at).toISOString(),
      last_used: new Date(device.last_used).toISOString(),
      is_current: device.device_id === currentDeviceId,
    }));

    // Sort by last used (most recent first)
    formattedDevices.sort((a, b) => 
      new Date(b.last_used).getTime() - new Date(a.last_used).getTime()
    );

    return reply.send({
      devices: formattedDevices,
      total: formattedDevices.length,
    });
  });

  // DELETE /v1/mfa/trusted-devices/:id - Remove specific trusted device
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    schema: {
      description: 'Remove trust from a specific device',
      tags: ['mfa', 'trusted-devices'],
      security: [{ bearerAuth: [] }],
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: removeResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { id: deviceId } = request.params;

    const trustedDeviceService = fastify.authServices.getTrustedDeviceService();

    // Remove trust
    await trustedDeviceService.removeTrust(userId, deviceId);

    fastify.log.info({ userId, deviceId }, 'Device trust removed');

    return reply.send({
      success: true,
      message: 'Device trust removed successfully',
    });
  });

  // DELETE /v1/mfa/trusted-devices - Remove all trusted devices
  fastify.delete('/', {
    schema: {
      description: 'Remove trust from all devices',
      tags: ['mfa', 'trusted-devices'],
      security: [{ bearerAuth: [] }],
      response: {
        200: removeResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;

    const trustedDeviceService = fastify.authServices.getTrustedDeviceService();

    // Remove all trust
    await trustedDeviceService.removeAllTrust(userId);

    fastify.log.warn({ userId }, 'All device trust removed');

    return reply.send({
      success: true,
      message: 'All device trust removed successfully',
    });
  });
};
