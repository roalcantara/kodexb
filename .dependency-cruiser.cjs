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
  ],
  options: {
    // Symlinks to external dirs can ELOOP or be unreadable in some envs
    exclude: { path: '^assets/(images|sources)' },
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
