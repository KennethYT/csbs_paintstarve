import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptConfig from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      "node_modules/**",
      "next-env.d.ts",
      "demo/**"
    ]
  },
  ...coreWebVitals,
  ...typescriptConfig
];

export default config;
