// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  files: ["**/*.vue", "**/*.ts", "**.mjs", "auth.d.ts"],
  rules: {
    "@stylistic/semi": ["error", "always"],
    "@stylistic/quotes": ["error", "double"],
    "@stylistic/comma-dangle": ["error", {
      arrays: "only-multiline",
      objects: "only-multiline",
      imports: "never",
      exports: "never",
      functions: "never",
    }],
    "vue/multi-word-component-names": "off",
  },
});
