import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env files
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  META_APP_ID: z.string().optional(),
  META_CLIENT_SECRET: z.string().optional(),
  GOOGLE_DEVELOPER_TOKEN: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  API_PORT: z.coerce.number().default(8000),
  WEB_PORT: z.coerce.number().default(3000),
  MCP_PORT: z.coerce.number().default(4000),
});

export const config = ConfigSchema.parse(process.env);
export type Config = z.infer<typeof ConfigSchema>;
