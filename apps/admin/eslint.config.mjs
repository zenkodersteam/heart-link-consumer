// Flat ESLint config for the admin-web Next.js 16 app.
// eslint-config-next ships native flat-config arrays for Next 16, so we spread
// them directly (no FlatCompat shim). core-web-vitals covers React + Next rules;
// typescript layers in typescript-eslint's recommended set plus the default
// build-output ignores (.next, out, build, next-env.d.ts).
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // Build tooling that Node loads directly, before any module transform: it
    // has to be CommonJS, so `require` is correct rather than a lapse.
    files: ['next.config.js', 'scripts/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // `public/` is served verbatim, and pdf.worker.min.mjs is a minified
    // vendor build copied in during the build — linting it reports thousands
    // of problems in code nobody here wrote or can fix.
    ignores: ['public/**'],
  },
  {
    rules: {
      // react-hooks v7 flags any setState in an effect body as an error. A few
      // of our effects use guarded reset-on-open / count-up-on-value patterns
      // that are intentional and correct. Keep the signal as a warning rather
      // than rewriting working components; revisit if these grow.
      'react-hooks/set-state-in-effect': 'warn',
      // Honor the underscore convention for intentionally unused args (e.g. `_url`).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

export default eslintConfig;
