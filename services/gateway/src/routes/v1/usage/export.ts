import { FastifyPluginAsync } from 'fastify';
import { format } from 'date-fns';

// Assuming usageService is decorated on the Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    usageService: {
      getUsage: (query: UsageQuery) => Promise<UsageResult[]>;
    };
  }
}

interface UsageQuery {
  tenantId: string;
  metric: string;
  period?: string;
  startDate?: Date;
  endDate?: Date;
}

interface UsageResult {
  period: string;
  value: number;
  [key: string]: any; // Allow for additional properties in usage data
}

const usageExportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/usage/export', async (request, reply) => {
    const { metric, period, startDate, endDate, format: exportFormat } = request.query as {
      metric: string;
      period?: string;
      startDate?: string;
      endDate?: string;
      format?: string;
    };

    if (!metric) {
      return reply.status(400).send({ message: 'Metric is required for usage export.' });
    }

    if (exportFormat && exportFormat.toLowerCase() !== 'csv') {
      return reply.status(400).send({ message: 'Only CSV format is currently supported for export.' });
    }

    if (!request.tenant || !request.tenant!.tenant_id) {
      return reply.status(400).send({ message: 'Tenant context missing or invalid.' });
    }
    const tenantId = request.tenant!.tenant_id;

    const query: UsageQuery = {
      tenantId,
      metric,
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    try {
      const usageData = await fastify.usageService.getUsage(query);

      if (!usageData || usageData.length === 0) {
        return reply.status(404).send({ message: 'No usage data found for the specified criteria.' });
      }

      // Convert data to CSV
      const csv = convertToCsv(usageData);

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="${metric}_usage_export_${format(new Date(), 'yyyyMMddHHmmss')}.csv"`);
      return reply.send(csv);
    } catch (error) {
      fastify.log.error({ error }, 'Error exporting usage data');
      return reply.status(500).send({ message: 'Failed to export usage data.' });
    }
  });
};

function convertToCsv(data: UsageResult[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.map(header => `"${header}"`).join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle null/undefined, escape double quotes, and wrap in double quotes
      return `"${value === null || value === undefined ? '' : String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export default usageExportRoutes;
