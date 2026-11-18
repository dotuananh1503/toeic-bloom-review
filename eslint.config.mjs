import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'data/**', '.test-data/**'] },
  { files: ['**/*.{ts,tsx}'], extends: [eslint.configs.recommended, ...tseslint.configs.recommended] },
);
