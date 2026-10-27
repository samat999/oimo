import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "outputs/**", "data/**", "next-env.d.ts"]),
  // SQL rows are untyped records (`Row = Record<string, any>`) by design; values are validated at the service boundary.
  { rules: { "@typescript-eslint/no-explicit-any": "off" } },
]);
