module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname, // this is the reason this is a .js file
    project: ['./tsconfig.eslint.json'],
  },
  extends: [
    '@rubensworks',
  ],
  rules: {
    // TODO: Try to re-enable the following rules in the future
    'import/no-commonjs': 'off',
    'import/extensions': 'off',
  },
  overrides: [
    {
      // The config packages use an empty index.ts
      files: [
        'engines/config-*/lib/index.ts',
      ],
      rules: {
        'import/unambiguous': 'off',
      },
    },
    {
      files: [
        'packages/*/test/*-test.ts'
      ],
      rules: {
        'import/no-unassigned-import': 'off'
      },
    },
  ],
};
