require('dotenv').config();
const { z } = require('zod');

// Schema for environment configuration
const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/projectshield'),
  GITHUB_TOKEN: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default('')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:', parsedEnv.error.format());
  process.exit(1);
}

const config = parsedEnv.data;

// Informative startup logging regarding external API readiness
if (!config.GEMINI_API_KEY) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not configured in .env. Live AI extraction & innovation recommendations will require an API key.');
}

if (!config.GITHUB_TOKEN) {
  console.warn('ℹ️ INFO: GITHUB_TOKEN is not set. GitHub API will run in unauthenticated mode (limited to 60 requests/hr).');
}

module.exports = config;
