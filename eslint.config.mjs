import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Hard rule: no network code anywhere (AGENTS.md rule 2).
const networkModules = ['http', 'https', 'http2', 'net', 'tls', 'dgram', 'dns', 'undici'];
const noNetwork = {
  'no-restricted-imports': ['error', {
    paths: networkModules.flatMap((m) => [m, `node:${m}`]).map((name) => ({
      name,
      message: 'No network access allowed (AGENTS.md rule 2).',
    })),
  }],
  'no-restricted-globals': ['error',
    { name: 'fetch', message: 'No network access allowed (AGENTS.md rule 2).' },
    { name: 'XMLHttpRequest', message: 'No network access allowed (AGENTS.md rule 2).' },
    { name: 'WebSocket', message: 'No network access allowed (AGENTS.md rule 2).' },
    { name: 'EventSource', message: 'No network access allowed (AGENTS.md rule 2).' },
  ],
};

export default tseslint.config(
  { ignores: ['dist/', 'out/', 'node_modules/', '.vscode-test/', 'data-src/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      ...noNetwork,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['media/**/*.js'],
    languageOptions: { globals: { window: 'readonly', document: 'readonly', acquireVsCodeApi: 'readonly' } },
    rules: noNetwork,
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', TextDecoder: 'readonly', Buffer: 'readonly', URL: 'readonly' } },
    rules: noNetwork,
  },
  {
    files: ['test/**/*.mjs'],
    languageOptions: { globals: { describe: 'readonly', it: 'readonly', Buffer: 'readonly' } },
    rules: noNetwork,
  },
);
