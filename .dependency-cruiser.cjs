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
  ],
  options: {
    // Symlinks to external dirs can ELOOP or be unreadable in some envs
    exclude: { path: '^(assets/(images|sources)|graphify-out)' },
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
