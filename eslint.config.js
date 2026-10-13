const {defineConfig, globalIgnores} = require('eslint/config');
const js = require('@eslint/js');
const globals = require('globals');
const importPlugin = require('eslint-plugin-import-x');

module.exports = defineConfig([
  globalIgnores([
    '.git/**',
    'build/**',
    'node_modules/**',
    'runtime/**',
    'www/static/src/common/config.js'
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended
    ],
    plugins: {
      import: importPlugin
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {jsx: true}
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        think: 'readonly',
        firekylin: 'readonly',
        Gitalk: 'readonly',
        Waline: 'readonly',
        Valine: 'readonly'
      }
    },
    rules: {
      camelcase: 'off',
      strict: 'off',
      quotes: ['error', 'single'],
      'max-len': ['error', {
        code: 120,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreRegExpLiterals: true,
        ignoreTemplateLiterals: true
      }],
      'no-underscore-dangle': 'off',
      'no-unused-vars': 'warn',
      'no-unused-expressions': 'off',
      'new-cap': 'off',
      'no-shadow': 'off',
      'no-use-before-define': 'off',
      'no-case-declarations': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'no-console': 'warn',
      'eol-last': 'error',
      'brace-style': ['error', '1tbs', {allowSingleLine: true}],
      'no-trailing-spaces': 'error',
      'nonblock-statement-body-position': 'error',
      'newline-per-chained-call': ['error', {ignoreChainWithDepth: 3}],
      'space-before-blocks': 'error',
      'space-in-parens': 'error',
      'semi-spacing': 'error',
      'comma-spacing': 'error',
      'no-tabs': 'error',
      eqeqeq: 'error',
      'no-multi-spaces': 'error',
      'new-parens': 'error',
      'no-implicit-globals': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/extensions': ['error', 'always', {js: 'never', jsx: 'never'}],
      'import/order': 'off',
      'import/no-absolute-path': 'error',
      'import/newline-after-import': 'error',
      'import/no-named-default': 'error'
    }
  }
]);
