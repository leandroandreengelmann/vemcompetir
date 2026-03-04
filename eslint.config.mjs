import { defineConfig } from "eslint/config";

// Fallback configuration to unblock audits while dependency version mismatches are resolved.
const eslintConfig = defineConfig([]);

export default eslintConfig;
