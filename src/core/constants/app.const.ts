import packageJson from '../../../package.json' with { type: 'json' }

/** Semver from `package.json` (no leading `v`). */
export const APP_VERSION: string = packageJson.version

export const PACKAGE_DESCRIPTION: string = packageJson.description
