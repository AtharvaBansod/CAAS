import dotenv from 'dotenv';
import { configSchema, Config } from './schema';

dotenv.config();

const result = configSchema.safeParse(process.env);

if (!result.success) {
  const errorMsg = '❌ Invalid environment variables: ' + JSON.stringify(result.error.format(), null, 2);
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export const config: Config = result.data;
