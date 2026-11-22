import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // All interface text lives in messages/<locale>/<namespace>.json (CLAUDE.md, section 4).
    // Text written directly between JSX tags fails the lint.
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        { noStrings: false, ignoreProps: true, allowedStrings: ["·", ":", ",", "(", ")", "…"] },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
