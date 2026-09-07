/**
 * Generates `tokens.css` from the TypeScript tokens so the web has one source
 * of truth with mobile.
 *
 * Tailwind 4 builds its utilities from a literal `@theme` block and cannot read
 * values out of a `.ts` module, hence the codegen step. Run it after changing
 * any token:
 *
 *     npm run tokens:build --workspace @heartlink/design-tokens
 *
 * The CSS variable names are chosen to keep the utility classes the web already
 * uses (`bg-surface`, `text-ink`, `border-line`, ...) working unchanged, so a
 * token edit stays a value change rather than a rename across the app.
 */

import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Node 20 cannot import TypeScript directly, so transpile the token modules to
 * a temporary ESM file and import that. `colors.ts` and `scale.ts` are plain
 * const objects with no runtime imports, which keeps this honest.
 */
async function loadTokens(...names) {
  const source = names
    .map((n) => readFileSync(join(here, '..', 'src', `${n}.ts`), 'utf8'))
    .join('\n')
    // The modules import each other by relative path; concatenated, those
    // bindings are already in scope and the import lines would be unresolvable.
    .replace(/^import\s+\{[^}]*\}\s+from\s+'\.\/[^']*';$/gm, '');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const tmp = join(tmpdir(), `heartlink-tokens-${process.pid}.mjs`);
  writeFileSync(tmp, outputText);
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    rmSync(tmp, { force: true });
  }
}

const { colors, fontStacks, radii, cta, elevation } = await loadTokens('colors', 'scale', 'effects');

/** token key in colors.ts -> Tailwind colour name (utility suffix). */
const COLOR_MAP = {
  bgDeep: 'surface',
  bgElevated: 'surface-elevated',
  surfaceMuted: 'surface-muted',
  surfaceCanvas: 'surface-canvas',

  textPrimary: 'ink',
  textSecondary: 'ink-soft',
  textMuted: 'ink-faint',

  primary: 'primary',
  primaryHover: 'primary-hover',
  primaryFaint: 'primary-faint',
  onPrimary: 'on-primary',

  gold: 'gold',
  goldBright: 'gold-bright',
  goldFaint: 'gold-faint',

  midnight: 'midnight',
  sidebar: 'sidebar',
  sidebarElevated: 'sidebar-elevated',
  sidebarText: 'sidebar-text',
  sidebarTextMuted: 'sidebar-text-muted',

  success: 'success',
  danger: 'danger',

  border: 'line',
  borderStrong: 'line-strong',
  overlay: 'overlay',
};

const lines = [];
for (const [key, name] of Object.entries(COLOR_MAP)) {
  const value = colors[key];
  if (value === undefined) throw new Error(`generate-css: unknown colour token "${key}"`);
  lines.push(`  --color-${name}: ${value.toLowerCase()};`);
}

const css = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: packages/design-tokens/src/{colors,scale}.ts
 * Regenerate: npm run tokens:build --workspace @heartlink/design-tokens
 */

@theme {
${lines.join('\n')}

  --font-heading: ${fontStacks.heading};
  --font-sans: ${fontStacks.body};

  --radius-card: ${radii.lg}px;
  --radius-pill: ${radii.pill}px;

  /* Pink-derived shadows. Declared here so a change to the primary colour
     carries into every glow, rather than leaving hardcoded rgb() triples
     behind in component classes. */
  --shadow-cta: ${cta.glow};
  --shadow-cta-hover: ${cta.glowHover};
  --shadow-card: ${elevation.card};
  --shadow-card-hover: ${elevation.cardHover};
  --shadow-deck: ${elevation.deck};
}
`;

/**
 * Written into the web app rather than the package.
 *
 * Tailwind resolves a CSS `@import` relative to the importing file and cannot
 * follow a bare package specifier under Turbopack, so shipping this as
 * `@heartlink/design-tokens/tokens.css` fails the build outright. The
 * TypeScript in `src/` stays the source of truth; this is its build artifact,
 * committed so a fresh checkout compiles without running codegen first.
 */
const out = join(here, '..', '..', '..', 'apps', 'web', 'src', 'app', 'tokens.generated.css');
writeFileSync(out, css);
console.log(`${out} written (${Object.keys(COLOR_MAP).length} colours)`);
