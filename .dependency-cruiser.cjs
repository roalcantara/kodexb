/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-kb-core-importing-shell',
      severity: 'error',
      comment:
        'src/core must not import from src/shell — keep domain logic independent of CLI',
      from: { path: '^src/core/' },
      to: { path: '^src/shell/' },
    },
    {
      name: 'core-schema-must-be-pure-typebox',
      severity: 'error',
      comment:
        '*.schema.ts files may only import TypeBox, type-fest, and sibling schemas / types / constants',
      from: { path: '^src/core/.+\\.schema\\.ts$' },
      to: {
        pathNot:
          '(^@sinclair/typebox($|/compiler$)|^type-fest$|^node_modules/@sinclair/typebox/|^node_modules/type-fest/|\\.schema\\.ts$|/types/|/constants/)',
      },
    },
    {
      name: 'no-zod-in-src',
      severity: 'error',
      comment: 'TypeBox is the canonical validator; do not import zod in src/',
      from: { path: '^src/' },
      to: { path: '^(zod|node_modules/zod)' },
    },
    {
      name: 'no-renderer-importing-shell-app',
      severity: 'error',
      comment:
        'src/shell/renderer must not import from src/shell/app — use @rpc/client (Eden Treaty) per CLAUDE.md',
      from: { path: '^src/shell/renderer/' },
      to: { path: '^src/shell/app/' },
    },
    {
      name: 'no-shared-importing-shell',
      severity: 'error',
      comment:
        'src/shared must not import from src/shell — shared stays I/O-free per CLAUDE.md',
      from: { path: '^src/shared/' },
      to: { path: '^src/shell/' },
    },
    {
      name: 'no-route-direct-to-repository',
      severity: 'error',
      comment:
        'Route modules must not import repositories directly — go through the App orchestration layer per CLAUDE.md. app.ts is the approved App path and is not in the route from-path, so its repository imports are allowed by construction.',
      from: {
        path: '^src/shell/main/rpc/(server|schemas)\\.ts$',
      },
      to: {
        path: '^src/shell/app/db/.+\\.repository\\.ts$',
      },
    },
  ],
  options: {
    // Symlinks to external dirs can ELOOP or be unreadable in some envs
    exclude: { path: '^(assets/(images|sources)|graphify-out|\\.venv)' },
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
      exportsFields: ['exports'],
      conditionNames: ['import', 'default'],
    },
  },
}
