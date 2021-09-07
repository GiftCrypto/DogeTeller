module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "@babel/eslint-parser",
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    quotes: ["error", "double"],
  },
  overrides: [
    {
      "files": [
        "**/*.test.js",
      ],
      "env": {
        "jest": true,
      },
    },
  ],
};
