import type { ElectrobunConfig } from 'electrobun'

const kbIconset = 'assets/icons/kb-logo.iconset'

const developerId = process.env.ELECTROBUN_DEVELOPER_ID ?? ''
const appleId = process.env.ELECTROBUN_APPLEID ?? ''
const appleIdPass = process.env.ELECTROBUN_APPLEIDPASS ?? ''
const appleTeamId = process.env.ELECTROBUN_TEAMID ?? ''

const canCodesign = developerId.length > 0
const canNotarize = canCodesign && appleId.length > 0 && appleIdPass.length > 0 && appleTeamId.length > 0

export default {
  app: {
    name: 'kb',
    identifier: 'sh.blackboard.kb',
    version: '0.1.0'
  },
  build: {
    bun: {
      entrypoint: 'src/shell/main/index.ts'
    },
    views: {
      shell: {
        entrypoint: 'src/shell/renderer/index.ts'
      }
    },
    copy: {
      'src/shell/renderer/index.html': 'views/shell/index.html',
      'assets/images': 'views/shell/assets/images'
    },
    mac: {
      icons: kbIconset,
      bundleCEF: false,
      codesign: canCodesign,
      notarize: canNotarize,
      createDmg: true,
      entitlements: {
        'com.apple.security.cs.allow-jit': true,
        'com.apple.security.cs.allow-unsigned-executable-memory': true,
        'com.apple.security.cs.disable-library-validation': true,
        'com.apple.security.network.client': true
      }
    },
    linux: {
      icon: `${kbIconset}/icon_256x256.png`,
      bundleCEF: false
    }
  }
} satisfies ElectrobunConfig
