import Fastify from 'fastify';
import { registerPlugins } from '../plugins';
import { registerRoutes } from '../routes';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

export async function generateOpenApiSpec() {
  const app = Fastify();
  
  // Register plugins and routes to populate swagger
  await registerPlugins(app);
  await registerRoutes(app);

  await app.ready();

  const spec = app.swagger();
  
  const outputPath = path.join(__dirname, '../../openapi.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(spec, null, 2)
  );
  
  console.log(`OpenAPI spec generated at ${outputPath}`);
  
  await app.close();
}

if (require.main === module) {
  generateOpenApiSpec().catch(console.error);
}
