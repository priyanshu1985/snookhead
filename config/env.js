import dotenv from "dotenv";
import { logStartup } from "../middleware/logger.js";
dotenv.config();

const requiredEnvVars = ["SUPABASE_URL", "JWT_SECRET"];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    logStartup.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
};

export { validateEnv };
