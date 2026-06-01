<!-- markdownlint-disable-file -->
# Phase 2 — CI / Build / Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the three GitHub Actions workflows (`review`, `release`, `publish`), three composite actions, `release-it` configuration, env-gated macOS signing, local mirror tasks under `mise run ci:*`, and the supporting documentation needed to ship signed Electrobun builds for macOS arm64 and Linux x64/arm64.

**Architecture:** PR → `review.yml` (lint + test + Linux smoke build) on `ubuntu-latest`. Squash-merge to `main` → `release.yml` (squash-merge gate, signed commits/tags, `release-it` with inline conventional-changelog plugin) creates a draft GitHub Release. `workflow_run` chain → `publish.yml` matrix builds native binaries (`linux-x64`, `linux-arm64`, `darwin-arm64`), with Electrobun handling code signing, notarization, stapling, and DMG creation internally. Single-writer job attaches assets + SLSA build-provenance attestations to the draft release; final job verifies attestations and un-drafts. macOS signing is **gated by `ELECTROBUN_DEVELOPER_ID`** — empty value → unsigned `.dmg` fallback, no Apple secrets needed.

**Tech Stack:** GitHub Actions (composite + reusable), Bun 1.x, mise (tool + task runner) with `actionlint` for workflow validation, Electrobun ^1.18 (native build, codesign, notarize, createDmg), `release-it@17` + `@release-it/conventional-changelog@9`, `actions/attest-build-provenance@v2`, `webfactory/ssh-agent@v0.9.0`, `mikepenz/action-junit-report@v5`, `softprops/action-gh-release@v2`.

**Spec source of truth:** [`design.md`](design.md). All section references like "design §WORKFLOW: review.yml" point to that file.

---

## File structure

### Created (9)

| Path                                            | Responsibility                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.github/workflows/review.yml`                  | PR validation: lint + test + Linux-x64 build smoke                                                    |
| `.github/workflows/release.yml`                 | Squash-merge gate, signed-commit self-test, `release-it` → draft Release                              |
| `.github/workflows/publish.yml`                 | `resolve_tag` → `binaries` matrix → `checksums` → `attach_release` → `publish_release` (un-draft)     |
| `.github/actions/setup-bun-project/action.yml`  | Single touch-point: pick bun-direct or mise-mode, restore bun lockfile cache, `bun install --frozen`  |
| `.github/actions/junit-summary/action.yml`      | Pure-bash JUnit `<testsuites>` → markdown table appended to `$GITHUB_STEP_SUMMARY`                    |
| `.github/actions/package-electrobun/action.yml` | Tarball Electrobun's Linux output, or rename the `.dmg` Electrobun produced for mac (signed/unsigned) |
| `CHANGELOG.md`                                  | Empty-but-headed file; `release-it` populates it on first release                                     |
| `assets/guides/CI_GUIDE.md`                     | Single consolidated CI/CD guide (workflows, secrets, local mirroring, troubleshooting)                |

### Modified (4)

| Path                   | Change                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `electrobun.config.ts` | Add env-gated `mac.codesign` + `mac.notarize` + `mac.entitlements`. Read `ELECTROBUN_*` env vars for credentials.                  |
| `package.json`         | Add `release-it` + `@release-it/conventional-changelog` devDeps. Add inline `release-it` config. Add `:ci` scripts + `build:prod`. |
| `mise.toml`            | Add `actionlint` to `[tools]`; add 12 `ci:*` tasks (umbrella tasks depend on `prepare`).                                           |
| `README.md`            | Extend `## DEVELOPMENT` with lint commands + CI mirror tasks. New `## CI / CD` section linking to `CI_GUIDE.md`.                   |

### Deliberately NOT created

- `entitlements.mac.plist` — Electrobun reads inline `build.mac.entitlements` and writes the plist itself.
- `.release-it.json` — inlined under the `release-it` key in `package.json`.
- Per-workflow guide files — single consolidated `assets/guides/CI_GUIDE.md`.
- `tools/preview/server.ts` route updates — preview server is a Phase 3+ concern (Elysia not yet introduced).

---

## Commit map (12 commits)

Each task below produces exactly one commit. Per-workflow commits bundle the workflow YAML, its supporting composite actions, and its `mise run ci:*` mirror tasks so each commit is reviewable and reverts cleanly.

| Task | Commit subject                                     | Scope                                                               |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | `chore(deps): Add release-it & changelog plugin`   | `package.json` + `bun.lock`                                         |
| 2    | `chore(release): Inline release-it config`         | `package.json` (top-level `release-it` key)                         |
| 3    | `chore(ci): Add CI script variants and build:prod` | `package.json` (scripts)                                            |
| 4    | `chore(build): Wire env-gated macOS signing`       | `electrobun.config.ts`                                              |
| 5    | `chore(release): Add empty CHANGELOG`              | `CHANGELOG.md`                                                      |
| 6    | `chore(ci): Add actionlint to mise tools`          | `mise.toml` (`[tools]`)                                             |
| 7    | `chore(ci): Add setup-bun-project action`          | `.github/actions/setup-bun-project/action.yml`                      |
| 8    | `ci: Add review.yml workflow`                      | `mise.toml` ci:review tasks + junit-summary action + workflow       |
| 9    | `ci: Add release.yml workflow`                     | `mise.toml` ci:release tasks + workflow                             |
| 10   | `ci: Add publish.yml workflow`                     | `mise.toml` ci:publish tasks + package-electrobun action + workflow |
| 11   | `docs: Add CI_GUIDE.md`                            | `assets/guides/CI_GUIDE.md`                                         |
| 12   | `docs: Update README with CI/CD section`           | `README.md`                                                         |

---

## Verification commands cheat-sheet

| Goal                            | Command                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| Phase-1 quality gate            | `bun run lint && bun run test`                               |
| `mise.toml` syntax              | `mise exec -- tombi check mise.toml`                         |
| Workflow YAML validation        | `mise exec -- actionlint .github/workflows/<file>.yml`       |
| Workflow YAML validation (all)  | `mise exec -- actionlint`                                    |
| Smoke build (unsigned, locally) | `ELECTROBUN_DEVELOPER_ID='' bun run build`                   |
| Release dry-run                 | `bunx release-it --dry-run --ci`                             |
| Mise umbrella                   | `mise run ci:review` / `mise run ci:publish --version=0.1.0` |

---

## Task 1: Add release-it dev dependencies

**Files:**
- Modify: `package.json` (top-level `devDependencies`)
- Modify: `bun.lock` (regenerated by `bun install`)

- [ ] **Step 1: Add the two devDependencies via `bun add -d`**

```bash
bun add -d release-it@^17 @release-it/conventional-changelog@^9
```

Expected: `bun.lock` updated; `package.json` shows new entries under `devDependencies`.

- [ ] **Step 2: Verify versions resolved**

```bash
bun pm ls --all | grep -E "release-it|conventional-changelog"
```

Expected: lines containing `release-it@17.x.x` and `@release-it/conventional-changelog@9.x.x`.

- [ ] **Step 3: Verify `release-it` is callable**

```bash
bunx release-it --version
```

Expected: prints `17.x.x` and exits 0.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "$(cat <<'EOF'
chore(deps): Add release-it & changelog plugin

Adds two devDependencies that drive Phase 2 release
automation:

- release-it (^17) — orchestrates version bump, tag,
  signed commit, GitHub Release creation.
- @release-it/conventional-changelog (^9) — generates
  CHANGELOG.md entries from Conventional Commits.

Configuration is added in a follow-up commit.
EOF
)"
```

---

## Task 2: Inline release-it config in package.json

**Files:**
- Modify: `package.json` (add top-level `release-it` key)

- [ ] **Step 1: Add the `release-it` block at the end of `package.json`**

Insert immediately before the closing `}`, after the `dependencies` block:

```json
,
  "release-it": {
    "git": {
      "commitMessage": "chore(release): v${version}",
      "tagName": "v${version}",
      "requireBranch": "main",
      "requireCleanWorkingDir": true,
      "requireCommits": true
    },
    "github": {
      "release": true,
      "draft": true,
      "releaseName": "v${version}",
      "tokenRef": "GH_TOKEN",
      "autoGenerate": false
    },
    "npm": {
      "publish": false
    },
    "hooks": {
      "before:init": ["bun run lint", "bun run test"],
      "after:bump": "bun run typecheck"
    },
    "plugins": {
      "@release-it/conventional-changelog": {
        "preset": { "name": "conventionalcommits" },
        "infile": "CHANGELOG.md",
        "header": "# Changelog\n\nAll notable changes to this project will be documented in this file.\n"
      }
    }
  }
```

- [ ] **Step 2: Verify JSON parses**

```bash
bun -e "console.log(Object.keys(require('./package.json')))"
```

Expected: array of top-level keys including `"release-it"`. No SyntaxError.

- [ ] **Step 3: Verify release-it picks up the config**

```bash
bunx release-it --release-version --dry-run
```

Expected: prints the next computed version (e.g. `0.1.1` or similar). No "no config found" warning.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore(release): Inline release-it config

Adds the release-it configuration as a top-level key in
package.json (no separate .release-it.json):

- git: signed commit message, requireBranch=main,
  requireCleanWorkingDir, requireCommits.
- github: draft release (publish.yml un-drafts later),
  tokenRef=GH_TOKEN, autoGenerate=false.
- npm.publish=false.
- hooks: defense-in-depth re-run of lint + test before
  init; typecheck after version bump.
- plugins: @release-it/conventional-changelog with
  conventionalcommits preset and CHANGELOG.md infile.
EOF
)"
```

---

## Task 3: Add CI script variants and build:prod

**Files:**
- Modify: `package.json` (top-level `scripts`)

- [ ] **Step 1: Add the `:ci` scripts and `build:prod`**

Insert these entries into the existing `scripts` block (after `build`):

```json
"build:prod": "electrobun build --env=stable",
"release:ci": "bunx release-it --ci",
"test:ci": "bun test --reporter=junit --reporter-outfile=tmp/reports/tests/junit.xml --coverage --coverage-dir=tmp/reports/tests/coverage",
"lint:biome:ci": "mkdir -p tmp/reports/linters && bunx biome check --reporter=github",
"lint:knip:ci": "mkdir -p tmp/reports/linters && bunx knip --reporter compact > tmp/reports/linters/knip.txt",
"lint:depcruise:ci": "mkdir -p tmp/reports/linters && bunx depcruise . --config .dependency-cruiser.cjs --output-type json --output-to tmp/reports/linters/depcruise.json",
"lint:jscpd:ci": "mkdir -p tmp/reports/linters && bunx jscpd . --reporters json,console --output tmp/reports/linters/jscpd",
"lint:ls:ci": "mkdir -p tmp/reports/linters && bunx @ls-lint/ls-lint | tee tmp/reports/linters/ls-lint.txt",
"lint:ast-grep:ci": "mkdir -p tmp/reports/linters && mise exec -- ast-grep scan --error --report-style=rich | tee tmp/reports/linters/ast-grep.txt",
"lint:mise:ci": "mkdir -p tmp/reports/linters && mise exec -- tombi check mise.toml | tee tmp/reports/linters/mise.txt",
```

- [ ] **Step 2: Verify each script is registered**

```bash
bun run --silent | grep -E "build:prod|release:ci|test:ci|lint:.*:ci"
```

Expected: 9 lines (one per new script).

- [ ] **Step 3: Verify `test:ci` produces JUnit output**

```bash
mkdir -p tmp/reports/tests
bun run test:ci
test -s tmp/reports/tests/junit.xml && echo OK
```

Expected: prints `OK`. The XML root element is `<testsuites>`.

- [ ] **Step 4: Verify `build:prod` resolves to a real Electrobun command (dry check, no actual build)**

```bash
bun run --silent build:prod 2>&1 | head -n 3 || true
```

Expected: lines mentioning `electrobun` or version output (a real build would take longer; we only need the command to start).

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore(ci): Add CI script variants and build:prod

Adds CI-shaped variants of the Phase-1 lint and test
scripts so workflows can capture machine-readable reports:

- test:ci — JUnit XML + coverage to tmp/reports/tests
- lint:biome:ci — GitHub-annotated reporter
- lint:knip:ci, lint:depcruise:ci, lint:jscpd:ci,
  lint:ls:ci, lint:ast-grep:ci, lint:mise:ci — each
  writes a per-tool report under tmp/reports/linters
- release:ci — bunx release-it --ci
- build:prod — electrobun build --env=stable

Each :ci script creates tmp/reports/* on demand to
allow standalone invocation outside CI.
EOF
)"
```

---

## Task 4: Wire env-gated macOS signing in electrobun.config.ts

**Files:**
- Modify: `electrobun.config.ts`

- [ ] **Step 1: Replace the file contents**

```ts
/** biome-ignore-all lint/style/useNamingConvention: false positive */
import type { ElectrobunConfig } from 'electrobun'

const appIconset = 'assets/icons/app-logo.iconset'

const developerId = process.env.ELECTROBUN_DEVELOPER_ID ?? ''
const appleId     = process.env.ELECTROBUN_APPLEID ?? ''
const appleIdPass = process.env.ELECTROBUN_APPLEIDPASS ?? ''
const appleTeamId = process.env.ELECTROBUN_TEAMID ?? ''

const canCodesign = developerId.length > 0
const canNotarize = canCodesign
  && appleId.length > 0
  && appleIdPass.length > 0
  && appleTeamId.length > 0

export default {
  app: {
    name: 'app',
    identifier: 'sh.blackboard.app',
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
      icons: appIconset,
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
      icon: `${appIconset}/icon_256x256.png`,
      bundleCEF: false
    }
  }
} satisfies ElectrobunConfig
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: no errors. The `satisfies ElectrobunConfig` constraint validates the shape against `node_modules/electrobun/dist/api/bun/ElectrobunConfig.ts`.

- [ ] **Step 3: Verify unsigned-fallback path resolves**

```bash
ELECTROBUN_DEVELOPER_ID='' bun -e "
const c = (await import('./electrobun.config.ts')).default
console.log('codesign=', c.build.mac.codesign, 'notarize=', c.build.mac.notarize)
"
```

Expected: `codesign= false notarize= false`.

- [ ] **Step 4: Verify signed-path values resolve**

```bash
ELECTROBUN_DEVELOPER_ID='Developer ID Application: Test (XYZ)' \
ELECTROBUN_APPLEID='a@b.com' ELECTROBUN_APPLEIDPASS='x' ELECTROBUN_TEAMID='T1234567' \
bun -e "
const c = (await import('./electrobun.config.ts')).default
console.log('codesign=', c.build.mac.codesign, 'notarize=', c.build.mac.notarize)
"
```

Expected: `codesign= true notarize= true`.

- [ ] **Step 5: Commit**

```bash
git add electrobun.config.ts
git commit -m "$(cat <<'EOF'
chore(build): Wire env-gated macOS signing

Extends build.mac with codesign + notarize toggles
driven by ELECTROBUN_* env vars:

- codesign=true when ELECTROBUN_DEVELOPER_ID is set.
- notarize=true when codesign + ELECTROBUN_APPLEID +
  ELECTROBUN_APPLEIDPASS + ELECTROBUN_TEAMID are set.
- createDmg=true (Electrobun produces the .dmg).
- Inline entitlements (Electrobun writes the plist):
  allow-jit, allow-unsigned-executable-memory,
  disable-library-validation, network.client.

Empty ELECTROBUN_DEVELOPER_ID falls back to an unsigned
build path so PR smoke builds and forks-without-Apple
secrets keep working.
EOF
)"
```

---

## Task 5: Create empty CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`

- [ ] **Step 1: Write the file**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Conventional Commits](https://conventionalcommits.org)
and uses [release-it](https://github.com/release-it/release-it) with
[`@release-it/conventional-changelog`](https://github.com/release-it/conventional-changelog)
to automate version bumps and entries.
```

- [ ] **Step 2: Verify markdownlint accepts it**

```bash
bunx biome check CHANGELOG.md
```

Expected: no errors (Biome's markdown checker is lenient; release-it will overwrite the body on first release).

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "$(cat <<'EOF'
chore(release): Add empty CHANGELOG

Stub CHANGELOG.md with the standard "Changelog" header
release-it expects. The file is intentionally empty
under the header — release-it's
@release-it/conventional-changelog plugin populates it
from Conventional Commits on the first release.
EOF
)"
```

---

## Task 6: Add actionlint to mise tools

**Files:**
- Modify: `mise.toml` (`[tools]` table)

- [ ] **Step 1: Register actionlint via mise**

```bash
mise use actionlint@latest
```

This appends `actionlint = "latest"` to the `[tools]` table in `mise.toml` and installs the binary into the mise-managed shim path.

- [ ] **Step 2: Verify mise.toml still parses**

```bash
mise exec -- tombi check mise.toml
```

Expected: exit 0.

- [ ] **Step 3: Verify actionlint is on the mise PATH**

```bash
mise exec -- actionlint --version
```

Expected: prints a version like `actionlint version 1.7.x` and exits 0.

- [ ] **Step 4: Verify the addition is correctly placed in `[tools]`**

```bash
grep -E '^actionlint' mise.toml
```

Expected: one line `actionlint = "latest"` (or a pinned version if `mise use` resolved one).

- [ ] **Step 5: Commit**

```bash
git add mise.toml
git commit -m "$(cat <<'EOF'
chore(ci): Add actionlint to mise tools

Adds actionlint to mise.toml [tools] for static
validation of GitHub Actions workflow files.

actionlint catches:
- Bad expression syntax (\${{ ... }}).
- Missing or misspelled secrets/inputs/outputs.
- Wrong runner labels.
- Composite-action input/output references.
- Unsafe shell substitutions.

Used in tasks 8-10 to validate review.yml, release.yml,
and publish.yml as they are added, plus in task 13's
end-to-end verification.
EOF
)"
```

---

## Task 7: Create setup-bun-project composite action

**Files:**
- Create: `.github/actions/setup-bun-project/action.yml`

This composite is shared by all three workflows (commits 8, 9, 10), so it lands first as standalone shared infrastructure.

- [ ] **Step 1: Create the directory and write the action**

```bash
mkdir -p .github/actions/setup-bun-project
```

```yaml
# .github/actions/setup-bun-project/action.yml
name: Setup Bun project
description: Install bun (or mise → bun + ast-grep + tombi), restore lockfile cache, install deps.

inputs:
  setup_mode:
    description: 'bun | mise'
    required: false
    default: bun
  bun_version:
    description: Bun version when setup_mode=bun
    required: false
    default: latest
  mise_version:
    description: Mise version when setup_mode=mise
    required: false
    default: '2026.3.9'

runs:
  using: composite
  steps:
    - name: Setup Bun (direct)
      if: inputs.setup_mode == 'bun'
      uses: oven-sh/setup-bun@v2
      with:
        bun-version: ${{ inputs.bun_version }}

    - name: Setup mise (provides bun + ast-grep + tombi + actionlint)
      if: inputs.setup_mode == 'mise'
      uses: jdx/mise-action@v4
      with:
        version: ${{ inputs.mise_version }}
        install: true
        cache: true

    - name: Cache bun install cache
      uses: actions/cache@v4
      with:
        path: ~/.bun/install/cache
        key: bun-cache-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('bun.lock') }}
        restore-keys: |
          bun-cache-${{ runner.os }}-${{ runner.arch }}-

    - name: Install dependencies
      shell: bash
      run: bun install --frozen-lockfile
```

- [ ] **Step 2: Verify the action's YAML is well-formed**

`actionlint` does not validate composite-action files directly, but a structural smoke check is sufficient — the workflows added in tasks 8-10 reference this composite by relative path and will fail under `mise exec -- actionlint` if the composite is malformed.

```bash
test -s .github/actions/setup-bun-project/action.yml && \
  grep -qE '^name:|^runs:|using: composite' .github/actions/setup-bun-project/action.yml && \
  echo "structural OK"
```

Expected: `structural OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/actions/setup-bun-project/action.yml
git commit -m "$(cat <<'EOF'
chore(ci): Add setup-bun-project action

Single touch-point for environment setup, shared by
review.yml, release.yml, and publish.yml. Inputs:

- setup_mode: "bun" (oven-sh/setup-bun@v2 only) or
  "mise" (jdx/mise-action@v4 — required when steps
  call ast-grep, tombi, or actionlint).
- bun_version, mise_version: pinnable.

Steps: setup runtime, restore ~/.bun/install/cache
keyed on bun.lock hash, run bun install --frozen-lockfile.
EOF
)"
```

---

## Task 8: Add review.yml workflow

This commit bundles everything needed for the review pipeline: the `ci:review` mise mirror tasks, the `junit-summary` composite action used by the test job, and the workflow file itself.

**Files:**
- Modify: `mise.toml` (4 new `ci:review*` tasks)
- Create: `.github/actions/junit-summary/action.yml`
- Create: `.github/workflows/review.yml`

- [ ] **Step 1: Append ci:review mise tasks to `mise.toml`**

Append these to the `[tasks]` block:

```toml
"ci:review" = { description = "Mirror review.yml end-to-end (lint + test + build smoke)", depends = ["prepare"], run = '''
    #!/usr/bin/env bash
    set -e
    mise run ci:review:lint
    mise run ci:review:test
    mise run ci:review:build
  ''' }
"ci:review:lint" = { description = "Run the full Phase-1 lint chain", run = "bun run lint" }
"ci:review:test" = { description = "Run tests with JUnit + coverage (CI shape)", run = "bun run test:ci" }
"ci:review:build" = { description = "Smoke build with macOS signing forced off", run = '''
    #!/usr/bin/env bash
    ELECTROBUN_DEVELOPER_ID="" bun run build
  ''' }
```

- [ ] **Step 2: Verify mise.toml parses and registers all 4 tasks**

```bash
mise exec -- tombi check mise.toml
mise tasks ls | grep -c '^ci:review'
```

Expected: `tombi` exit 0; second command prints `4`.

- [ ] **Step 3: Create the `junit-summary` composite action**

```bash
mkdir -p .github/actions/junit-summary
```

```yaml
# .github/actions/junit-summary/action.yml
name: JUnit summary
description: Pure-bash JUnit XML → markdown table writer.

inputs:
  xml_path:
    description: Path to the JUnit XML file
    required: true
  output_path:
    description: File to append the markdown summary to (typically $GITHUB_STEP_SUMMARY)
    required: true
  title:
    description: Heading text for the summary section
    required: false
    default: Test Results

runs:
  using: composite
  steps:
    - shell: bash
      run: |
        set -euo pipefail
        XML="${{ inputs.xml_path }}"
        OUT="${{ inputs.output_path }}"
        TITLE="${{ inputs.title }}"
        if [[ ! -f "$XML" ]]; then
          {
            echo "## $TITLE"
            echo
            echo "_No JUnit report at \`$XML\`._"
          } >> "$OUT"
          exit 0
        fi
        line="$(grep -oE '<testsuites[^>]*>' "$XML" | head -n 1 || true)"
        if [[ -z "$line" ]]; then
          line="$(grep -oE '<testsuite[^>]*>' "$XML" | head -n 1 || true)"
        fi
        get() { printf '%s' "$line" | grep -oE "$1=\"[^\"]+\"" | head -n 1 | sed -E "s/^$1=\"|\"$//g"; }
        tests="$(get tests)"
        failures="$(get failures)"
        skipped="$(get skipped)"
        time="$(get time)"
        passed=$(( ${tests:-0} - ${failures:-0} - ${skipped:-0} ))
        {
          echo "## $TITLE"
          echo
          echo "| Tests | Passed | Failed | Skipped | Time (s) |"
          echo "| ----- | ------ | ------ | ------- | -------- |"
          printf '| %s | %s | %s | %s | %s |\n' "${tests:-0}" "$passed" "${failures:-0}" "${skipped:-0}" "${time:-0}"
        } >> "$OUT"
```

- [ ] **Step 4: Smoke-test the junit-summary script**

```bash
mkdir -p /tmp/junit-test
cat > /tmp/junit-test/junit.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="42" failures="1" skipped="2" time="3.14">
  <testsuite name="app" tests="42" failures="1" skipped="2" time="3.14"/>
</testsuites>
EOF
bash -c '
set -euo pipefail
XML=/tmp/junit-test/junit.xml
OUT=/tmp/junit-test/out.md
TITLE="Smoke"
line="$(grep -oE "<testsuites[^>]*>" "$XML" | head -n 1)"
get() { printf "%s" "$line" | grep -oE "$1=\"[^\"]+\"" | head -n 1 | sed -E "s/^$1=\"|\"\$//g"; }
tests="$(get tests)"; failures="$(get failures)"; skipped="$(get skipped)"; time="$(get time)"
passed=$(( ${tests:-0} - ${failures:-0} - ${skipped:-0} ))
{
  echo "## $TITLE"; echo
  echo "| Tests | Passed | Failed | Skipped | Time (s) |"
  echo "| ----- | ------ | ------ | ------- | -------- |"
  printf "| %s | %s | %s | %s | %s |\n" "${tests:-0}" "$passed" "${failures:-0}" "${skipped:-0}" "${time:-0}"
} >> "$OUT"
cat "$OUT"
rm -rf /tmp/junit-test
'
```

Expected output ends with: `| 42 | 39 | 1 | 2 | 3.14 |`.

- [ ] **Step 5: Create `.github/workflows/review.yml`**

```bash
mkdir -p .github/workflows
```

```yaml
# .github/workflows/review.yml
name: Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    branches: [main]

concurrency:
  group: app-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-bun-project
        with:
          setup_mode: mise
      - name: Run lint chain (aggregated exit code)
        run: |
          set +e
          mkdir -p tmp/reports/linters
          e=0
          bun run lint:biome:ci || e=$?
          bun run lint:knip:ci || e=$?
          bun run lint:depcruise:ci || e=$?
          bun run lint:jscpd:ci || e=$?
          bun run lint:ls:ci || e=$?
          bun run lint:ast-grep:ci || e=$?
          bun run lint:mise:ci || e=$?
          bun run typecheck || e=$?
          exit $e
      - name: Write summary table
        if: always()
        run: |
          {
            echo "## Lint summary"
            echo
            echo "| Tool | Report |"
            echo "| ---- | ------ |"
            for f in tmp/reports/linters/*; do
              [ -f "$f" ] && printf '| `%s` | see artifact |\n' "$(basename "$f")"
            done
          } >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: report-linters
          path: tmp/reports/linters
          retention-days: 7

  test:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-bun-project
        with:
          setup_mode: mise
      - run: bun run test:ci
      - name: Append JUnit summary
        if: always()
        uses: ./.github/actions/junit-summary
        with:
          xml_path: tmp/reports/tests/junit.xml
          output_path: ${{ github.step_summary }}
          title: Test Results
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: report-tests
          path: tmp/reports/tests
          retention-days: 7
      - uses: mikepenz/action-junit-report@v5
        if: always()
        with:
          report_paths: tmp/reports/tests/junit.xml
          fail_on_failure: true
          require_tests: true

  build:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-bun-project
        with:
          setup_mode: mise
      - uses: actions/cache@v4
        with:
          path: ~/.electrobun
          key: electrobun-${{ runner.os }}-${{ hashFiles('package.json') }}
          restore-keys: |
            electrobun-${{ runner.os }}-
      - name: Smoke build (forced unsigned)
        env:
          ELECTROBUN_DEVELOPER_ID: ''
        run: bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-smoke-linux-x64
          path: dist/
          retention-days: 3
```

- [ ] **Step 6: Validate the workflow with actionlint**

```bash
mise exec -- actionlint .github/workflows/review.yml
```

Expected: no output, exit 0. Any error indicates a typo, missing input, bad expression, or composite-action mismatch — fix before committing.

- [ ] **Step 7: Verify the local mirror runs the lint subtask**

```bash
mise run ci:review:lint
```

Expected: same output as `bun run lint`; exits 0.

- [ ] **Step 8: Commit**

```bash
git add mise.toml .github/actions/junit-summary/action.yml .github/workflows/review.yml
git commit -m "$(cat <<'EOF'
ci: Add review.yml workflow

PR validation workflow with three jobs on
ubuntu-latest, plus its supporting infrastructure:

- mise.toml: ci:review umbrella task (depends on
  prepare) + 3 subtasks (lint, test, build) for
  local mirror.
- .github/actions/junit-summary: pure-bash JUnit XML
  → markdown table writer used by the test job.
- .github/workflows/review.yml: lint (Phase-1 chain
  with aggregated exit code), test (bun run test:ci
  + JUnit summary + check publication), and build
  (Linux smoke build with signing forced off).

Concurrency keyed on github.ref with
cancel-in-progress. Skips draft PRs.
EOF
)"
```

---

## Task 9: Add release.yml workflow

This commit bundles the `ci:release` mise mirror tasks and the workflow file. No new composite action — `release.yml` only uses the shared `setup-bun-project` from task 7.

**Files:**
- Modify: `mise.toml` (4 new `ci:release*` tasks)
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Append ci:release mise tasks to `mise.toml`**

```toml
"ci:release:check-squash" = { description = "Validate HEAD is a single squash commit (no merge subject)", run = '''
    #!/usr/bin/env bash
    set -e
    subject="$(git log -1 --pretty=%s HEAD)"
    if [[ "$subject" =~ ^Merge\ (pull\ request|branch) ]]; then
      echo "ERROR: HEAD is a merge commit: $subject" >&2
      echo "Repository must use Squash and Merge only." >&2
      exit 1
    fi
    echo "OK: HEAD subject is '$subject'"
  ''' }
"ci:release:check-signing" = { description = "Signed-commit + signed-tag self-test in a temp repo", run = '''
    #!/usr/bin/env bash
    set -euo pipefail
    tmp="$(mktemp -d)"
    tag="signing-test-tag-$$"
    trap 'rm -rf "$tmp"' EXIT
    cd "$tmp"
    git init -q
    git config commit.gpgsign true
    git config tag.gpgsign true
    echo test > f.txt
    git add f.txt
    git commit -q -m "test: signing"
    git cat-file -p HEAD | grep -q '^gpgsig' || { echo "ERROR: commit not signed"; exit 1; }
    git tag -s "$tag" -m signing
    git cat-file -p "$tag" | grep -qE 'BEGIN (PGP|SSH) SIGNATURE' || { echo "ERROR: tag not signed"; exit 1; }
    echo "OK: signed commit + signed tag verified."
  ''' }
"ci:release:dry-run" = { description = "Preview the next release without touching git/GitHub", run = "bunx release-it --dry-run --ci" }
"ci:release:notes" = { description = "Preview only the next CHANGELOG entry", run = '''
    #!/usr/bin/env bash
    bunx release-it --release-notes-only --dry-run --ci 2>/dev/null \
      || bunx release-it --dry-run --ci 2>&1 | sed -n '/^# Changelog/,$p'
  ''' }
```

- [ ] **Step 2: Verify mise.toml parses and registers all 4 tasks**

```bash
mise exec -- tombi check mise.toml
mise tasks ls | grep -c '^ci:release'
```

Expected: `tombi` exit 0; second command prints `4`.

- [ ] **Step 3: Verify `ci:release:check-squash` passes on HEAD**

```bash
mise run ci:release:check-squash
```

Expected: `OK: HEAD subject is '...'`.

- [ ] **Step 4: Verify `ci:release:dry-run` works**

```bash
mise run ci:release:dry-run
```

Expected: release-it prints a plan (next version, would-be tag, would-be GitHub release name) and exits 0.

- [ ] **Step 5: Create `.github/workflows/release.yml`**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: app-release
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GH_TOKEN }}

      - name: Validate squash-and-merge strategy
        env:
          BEFORE: ${{ github.event.before }}
          AFTER: ${{ github.event.after }}
        run: |
          set -euo pipefail
          if [[ "$BEFORE" == "0000000000000000000000000000000000000000" ]]; then
            echo "Initial push — skipping squash check."
            exit 0
          fi
          subject="$(git log -1 --pretty=%s "$AFTER")"
          if [[ "$subject" =~ ^Merge\ (pull\ request|branch) ]]; then
            echo "::error::Merge commit detected on main: '$subject'."
            echo "::error::Repository must require Squash and Merge only."
            exit 1
          fi
          count="$(git log --oneline "$BEFORE..$AFTER" | wc -l | tr -d ' ')"
          if [[ "$count" -gt 1 ]]; then
            echo "::error::Push contains $count commits — likely Rebase and Merge."
            echo "::error::Repository must require Squash and Merge only."
            exit 1
          fi
          echo "OK: single squash commit on main."

      - uses: ./.github/actions/setup-bun-project
        with:
          setup_mode: mise

      - name: Start ssh-agent
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.RELEASE_SIGNING_SSH_KEY }}

      - name: Configure git signing & identity
        env:
          PUB: ${{ vars.RELEASE_SIGNING_SIGNER_PUB }}
          GIT_USER_NAME: ${{ vars.RELEASE_GIT_USER_NAME }}
          GIT_USER_EMAIL: ${{ vars.RELEASE_GIT_USER_EMAIL }}
        run: |
          set -euo pipefail
          mkdir -p ~/.ssh && chmod 700 ~/.ssh
          if [[ -n "${PUB:-}" ]]; then
            printf '%s\n' "$PUB" > ~/.ssh/release_signing_key.pub
          else
            ssh-add -L | head -n 1 > ~/.ssh/release_signing_key.pub
          fi
          chmod 600 ~/.ssh/release_signing_key.pub
          git config gpg.format ssh
          git config user.signingkey ~/.ssh/release_signing_key.pub
          git config commit.gpgsign true
          git config tag.gpgsign true
          git config user.name  "${GIT_USER_NAME:-github-actions[bot]}"
          git config user.email "${GIT_USER_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"

      - name: Verify signing works (commit + tag)
        run: |
          set -euo pipefail
          tmp="$(mktemp -d)"
          tag="signing-test-tag-$$"
          trap 'rm -rf "$tmp"' EXIT
          (
            cd "$tmp"
            git init -q
            git config user.name  "$(git -C "$GITHUB_WORKSPACE" config user.name)"
            git config user.email "$(git -C "$GITHUB_WORKSPACE" config user.email)"
            git config gpg.format ssh
            git config user.signingkey ~/.ssh/release_signing_key.pub
            git config commit.gpgsign true
            git config tag.gpgsign true
            echo test > f.txt
            git add f.txt
            git commit -q -m "test: signing"
            git cat-file -p HEAD | grep -q '^gpgsig' \
              || { echo '::error::Signed commit missing gpgsig header'; exit 1; }
            git tag -s "$tag" -m signing
            git cat-file -p "$tag" \
              | grep -qE 'BEGIN (PGP|SSH) SIGNATURE' \
              || { echo '::error::Signed tag missing signature block'; exit 1; }
          )

      - name: Pull latest changes (defensive against push races)
        run: git pull --rebase origin main

      - name: Run release-it
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: bun run release:ci

      - name: Verify draft release was created
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          set -euo pipefail
          for i in 1 2 3 4 5 6 7 8 9 10; do
            draft="$(gh release list --limit 1 --json tagName,isDraft --jq 'if .[0].isDraft then .[0].tagName else "" end')"
            if [[ -n "$draft" ]]; then
              echo "Draft release detected: $draft"
              exit 0
            fi
            echo "Attempt $i/10: no draft yet, waiting 5s..."
            sleep 5
          done
          echo "No draft release found — push had no releasable commits. OK."
```

- [ ] **Step 6: Validate the workflow with actionlint**

```bash
mise exec -- actionlint .github/workflows/release.yml
```

Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add mise.toml .github/workflows/release.yml
git commit -m "$(cat <<'EOF'
ci: Add release.yml workflow

Triggered on push to main. Concurrency group
"app-release" with cancel-in-progress=false (never
interrupt an in-flight release). Adds:

- mise.toml: 4 ci:release tasks (check-squash,
  check-signing, dry-run, notes) for local mirror.
- .github/workflows/release.yml: 9-step pipeline —
  squash-merge gate, ssh-agent + signed commit/tag
  configuration, signing self-test, defensive
  git pull --rebase, bun run release:ci, draft poll.

A push without releasable commits exits 0 with
"no draft" — the expected path for chore/docs.
EOF
)"
```

---

## Task 10: Add publish.yml workflow

This commit bundles the `ci:publish` mise mirror tasks, the `package-electrobun` composite action, and the workflow file.

**Files:**
- Modify: `mise.toml` (4 new `ci:publish*` tasks)
- Create: `.github/actions/package-electrobun/action.yml`
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Append ci:publish mise tasks to `mise.toml`**

```toml
"ci:publish" = { description = "Mirror publish.yml end-to-end for the local platform (build + package + checksum)", depends = ["prepare"], usage = '''
    flag "--version <ver>" help="Release version (e.g. 0.1.0)"
    flag "--target <target>" help="Build target (linux-x64 | linux-arm64 | darwin-arm64)"
  ''', run = '''
    #!/usr/bin/env bash
    set -e
    : "${usage_version:?--version is required (e.g. --version=0.1.0)}"
    : "${usage_target:=$(uname -s | tr A-Z a-z)-$(uname -m | sed -e s/x86_64/x64/ -e s/aarch64/arm64/)}"
    case "$usage_target" in
      darwin-x64) usage_target=darwin-arm64 ;;
    esac
    mise run ci:publish:build
    mise run ci:publish:package -- --version="$usage_version" --target="$usage_target"
    mise run ci:publish:checksum
  ''' }
"ci:publish:build" = { description = "Production build for the local platform", run = "bun run build:prod" }
"ci:publish:package" = { description = "Package dist/ as .tar.gz (linux) or rename .dmg (mac)", usage = '''
    flag "--version <ver>" help="Release version" required
    flag "--target <target>" help="Build target" required
  ''', run = '''
    #!/usr/bin/env bash
    set -euo pipefail
    case "$usage_target" in
      linux-*)
        tar czf "app-${usage_version}-${usage_target}.tar.gz" -C dist .
        ;;
      darwin-*)
        DMG="$(find dist -maxdepth 3 -type f -name '*.dmg' | head -n 1)"
        [[ -n "$DMG" ]] || { echo "ERROR: no .dmg under dist/"; exit 1; }
        suffix=""
        [[ -z "${ELECTROBUN_DEVELOPER_ID:-}" ]] && suffix="-unsigned"
        mv "$DMG" "app-${usage_version}-${usage_target}${suffix}.dmg"
        ;;
      *)
        echo "ERROR: unknown target $usage_target"; exit 1
        ;;
    esac
  ''' }
"ci:publish:checksum" = { description = "Write checksums.txt for produced archives", run = '''
    #!/usr/bin/env bash
    set -euo pipefail
    shopt -s nullglob
    sha256sum *.tar.gz *.dmg 2>/dev/null > checksums.txt || true
    test -s checksums.txt
    cat checksums.txt
  ''' }
```

- [ ] **Step 2: Verify mise.toml parses and now lists 12 ci:* tasks total**

```bash
mise exec -- tombi check mise.toml
test "$(mise tasks ls | grep -c '^ci:')" = "12" && echo OK
```

Expected: `tombi` exit 0; second command prints `OK`.

- [ ] **Step 3: Create the `package-electrobun` composite action**

```bash
mkdir -p .github/actions/package-electrobun
```

```yaml
# .github/actions/package-electrobun/action.yml
name: Package Electrobun output
description: Tarball Electrobun's Linux output, or rename the .dmg Electrobun produced for mac.

inputs:
  target:
    description: 'linux-x64 | linux-arm64 | darwin-arm64'
    required: true
  platform:
    description: 'linux | mac'
    required: true
  version:
    description: Release version or tag (e.g. v0.1.0 or 0.1.0)
    required: true
  dist_dir:
    description: Electrobun output directory
    required: false
    default: dist
  apple_identity:
    description: Empty string when unsigned fallback is desired
    required: false
    default: ''

outputs:
  archive:
    description: Final archive path (relative to repo root)
    value: ${{ steps.pkg.outputs.archive }}

runs:
  using: composite
  steps:
    - id: pkg
      shell: bash
      run: |
        set -euo pipefail
        T="${{ inputs.target }}"
        P="${{ inputs.platform }}"
        V="${{ inputs.version }}"
        D="${{ inputs.dist_dir }}"
        ID="${{ inputs.apple_identity }}"
        VER="${V#v}"
        case "$P" in
          linux)
            OUT="app-${VER}-${T}.tar.gz"
            tar czf "$OUT" -C "$D" .
            ;;
          mac)
            DMG="$(find "$D" -maxdepth 3 -type f -name '*.dmg' | head -n 1)"
            if [[ -z "$DMG" ]]; then
              echo "::error::No .dmg found under $D — Electrobun did not produce a DMG."
              exit 1
            fi
            if [[ -z "$ID" ]]; then
              OUT="app-${VER}-${T}-unsigned.dmg"
            else
              OUT="app-${VER}-${T}.dmg"
            fi
            mv "$DMG" "$OUT"
            ;;
          *)
            echo "::error::Unknown platform: $P"
            exit 1
            ;;
        esac
        echo "archive=$OUT" >> "$GITHUB_OUTPUT"
        echo "Packaged: $OUT"
```

- [ ] **Step 4: Smoke-test the linux branch of the composite locally**

```bash
mkdir -p /tmp/pkg-test/dist && echo dummy > /tmp/pkg-test/dist/app
( cd /tmp/pkg-test &&
  T=linux-x64 P=linux V=0.1.0 D=dist ID='' bash -c '
    set -euo pipefail
    VER="${V#v}"
    OUT="app-${VER}-${T}.tar.gz"
    tar czf "$OUT" -C "$D" .
    echo "archive=$OUT"
  '
)
ls /tmp/pkg-test/app-0.1.0-linux-x64.tar.gz && echo OK
rm -rf /tmp/pkg-test
```

Expected: `archive=app-0.1.0-linux-x64.tar.gz`, `OK`.

- [ ] **Step 5: Create `.github/workflows/publish.yml`**

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  workflow_run:
    workflows: [Release]
    types: [completed]
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to publish (e.g. v1.2.3)'
        required: true
        type: string

concurrency:
  group: app-${{ github.ref_name || inputs.tag }}
  cancel-in-progress: true

jobs:
  resolve_tag:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    outputs:
      tag: ${{ steps.resolve.outputs.tag }}
    steps:
      - name: Gate on upstream Release success
        if: github.event_name == 'workflow_run' && github.event.workflow_run.conclusion != 'success'
        run: |
          echo "::error::Upstream Release concluded as ${{ github.event.workflow_run.conclusion }} — skipping publish."
          exit 1
      - uses: actions/checkout@v4
      - id: resolve
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          INPUT_TAG: ${{ inputs.tag }}
        run: |
          set -euo pipefail
          if [[ -n "${INPUT_TAG:-}" ]]; then
            TAG="$INPUT_TAG"
          else
            TAG="$(gh release list --limit 1 --json tagName,isDraft --jq 'if .[0].isDraft then .[0].tagName else "" end')"
          fi
          if [[ -z "$TAG" ]]; then
            echo "::error::Could not resolve a release tag."
            exit 1
          fi
          echo "tag=$TAG" >> "$GITHUB_OUTPUT"
          echo "Resolved tag: $TAG"

  binaries:
    needs: resolve_tag
    permissions:
      contents: read
      id-token: write
      attestations: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: linux-x64
            runner: ubuntu-latest
            platform: linux
            ext: tar.gz
          - target: linux-arm64
            runner: ubuntu-24.04-arm
            platform: linux
            ext: tar.gz
          - target: darwin-arm64
            runner: macos-latest
            platform: mac
            ext: dmg
    runs-on: ${{ matrix.runner }}
    env:
      RELEASE_TAG: ${{ needs.resolve_tag.outputs.tag }}
      ELECTROBUN_DEVELOPER_ID: ${{ secrets.ELECTROBUN_DEVELOPER_ID }}
      ELECTROBUN_APPLEID:      ${{ secrets.ELECTROBUN_APPLEID }}
      ELECTROBUN_APPLEIDPASS:  ${{ secrets.ELECTROBUN_APPLEIDPASS }}
      ELECTROBUN_TEAMID:       ${{ secrets.ELECTROBUN_TEAMID }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ env.RELEASE_TAG }}
          fetch-depth: 0
      - uses: ./.github/actions/setup-bun-project
        with:
          setup_mode: mise
      - uses: actions/cache@v4
        with:
          path: ~/.electrobun
          key: electrobun-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('package.json') }}
          restore-keys: |
            electrobun-${{ runner.os }}-${{ runner.arch }}-

      - name: Import macOS code-signing cert (signed path only)
        if: matrix.target == 'darwin-arm64' && env.ELECTROBUN_DEVELOPER_ID != ''
        env:
          MAC_CERT_BASE64:   ${{ secrets.MAC_CERTIFICATE_BASE64 }}
          MAC_CERT_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
        run: |
          set -euo pipefail
          CERT="$RUNNER_TEMP/cert.p12"
          KC="$RUNNER_TEMP/build.keychain-db"
          KCPASS="$(openssl rand -hex 16)"
          printf '%s' "$MAC_CERT_BASE64" | base64 -d > "$CERT"
          security create-keychain -p "$KCPASS" "$KC"
          security set-keychain-settings -lut 21600 "$KC"
          security default-keychain -s "$KC"
          security unlock-keychain -p "$KCPASS" "$KC"
          security import "$CERT" -k "$KC" -P "$MAC_CERT_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KCPASS" "$KC"
          rm -f "$CERT"

      - name: Build (Electrobun handles sign + notarize + staple internally)
        run: bun run build:prod

      - id: package
        uses: ./.github/actions/package-electrobun
        with:
          target: ${{ matrix.target }}
          platform: ${{ matrix.platform }}
          version: ${{ env.RELEASE_TAG }}
          dist_dir: dist
          apple_identity: ${{ env.ELECTROBUN_DEVELOPER_ID }}

      - uses: actions/attest-build-provenance@v2
        with:
          subject-path: ${{ steps.package.outputs.archive }}

      - uses: actions/upload-artifact@v4
        with:
          name: binary-${{ matrix.target }}
          path: ${{ steps.package.outputs.archive }}
          retention-days: 1

  checksums:
    needs: binaries
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: assets
          merge-multiple: true
      - name: Compute sha256 checksums
        run: |
          set -euo pipefail
          cd assets
          shopt -s nullglob
          sha256sum *.tar.gz *.dmg 2>/dev/null > checksums.txt || true
          test -s checksums.txt
          cat checksums.txt
      - uses: actions/attest-build-provenance@v2
        with:
          subject-path: assets/checksums.txt
      - uses: actions/upload-artifact@v4
        with:
          name: checksums
          path: assets/checksums.txt
          retention-days: 1

  attach_release:
    needs: [checksums, resolve_tag]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    env:
      RELEASE_TAG: ${{ needs.resolve_tag.outputs.tag }}
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: release-assets
          merge-multiple: true
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ env.RELEASE_TAG }}
          draft: true
          fail_on_unmatched_files: false
          files: |
            release-assets/*.tar.gz
            release-assets/*.dmg
            release-assets/checksums.txt
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
      - name: Verify attestations
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          set -euo pipefail
          mkdir -p /tmp/verify
          gh release download "$RELEASE_TAG" \
            --pattern '*.tar.gz' --pattern '*.dmg' --pattern 'checksums.txt' \
            --dir /tmp/verify
          for f in /tmp/verify/*; do
            gh attestation verify "$f" --repo "$GITHUB_REPOSITORY"
          done

  publish_release:
    needs: [attach_release, resolve_tag]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    env:
      RELEASE_TAG: ${{ needs.resolve_tag.outputs.tag }}
    steps:
      - name: Re-verify all release assets
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          set -euo pipefail
          mkdir -p /tmp/verify
          gh release download "$RELEASE_TAG" \
            --pattern '*.tar.gz' --pattern '*.dmg' --pattern 'checksums.txt' \
            --dir /tmp/verify
          for f in /tmp/verify/*; do
            gh attestation verify "$f" --repo "$GITHUB_REPOSITORY"
          done
      - name: Build install notes
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          set -euo pipefail
          gh release view "$RELEASE_TAG" --json body --jq .body > /tmp/draft-body.md
          cat > /tmp/install.md <<'EOF'

          ## Install

          ### macOS

          1. Download the `.dmg` for your architecture.
          2. Open it, drag `app.app` to `/Applications`.
          3. If the build is the unsigned fallback (filename ends with `-unsigned.dmg`), bypass Gatekeeper once:
             `xattr -d com.apple.quarantine /Applications/app.app`

          ### Linux

          1. Download the `.tar.gz` for your architecture.
          2. `tar xzf app-*.tar.gz && cd app-*`
          3. `chmod +x app && ./app`
          4. (Optional) `cp app ~/.local/bin/`

          ## Verify

          ```sh
          sha256sum -c checksums.txt
          gh attestation verify <file> --repo OWNER/REPO
          ```
          EOF
          cat /tmp/draft-body.md /tmp/install.md > /tmp/release-notes.md
      - name: Publish the draft
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: gh release edit "$RELEASE_TAG" --draft=false --latest --notes-file /tmp/release-notes.md
```

- [ ] **Step 6: Validate the workflow with actionlint**

```bash
mise exec -- actionlint .github/workflows/publish.yml
```

Expected: no output, exit 0.

- [ ] **Step 7: End-to-end mirror of the local publish chain**

This step runs a real `bun run build:prod` (Electrobun production build), which can take several minutes the first time (downloads the framework). Subsequent runs are cached under `~/.electrobun`.

```bash
mise run ci:publish --version=0.1.0
ls app-0.1.0-* checksums.txt
```

Expected: archive named `app-0.1.0-<host-target>.tar.gz` (or `.dmg` on macOS) and a populated `checksums.txt` are produced in the repo root. The mac path produces `-unsigned.dmg` because `ELECTROBUN_DEVELOPER_ID` is not set locally.

- [ ] **Step 8: Clean up the local artifacts (don't commit them)**

```bash
rm -f app-0.1.0-*.tar.gz app-0.1.0-*.dmg checksums.txt
```

- [ ] **Step 9: Commit**

```bash
git add mise.toml .github/actions/package-electrobun/action.yml .github/workflows/publish.yml
git commit -m "$(cat <<'EOF'
ci: Add publish.yml workflow

Triggered by workflow_run from Release (auto) or
workflow_dispatch (manual recovery). Adds:

- mise.toml: ci:publish umbrella (depends on prepare)
  + 3 subtasks (build, package, checksum) for local
  mirror.
- .github/actions/package-electrobun: composite that
  tarballs Linux output or renames the .dmg
  Electrobun produced for mac (signed/unsigned).
- .github/workflows/publish.yml: 5-job DAG —
  resolve_tag, binaries (matrix: linux-x64,
  linux-arm64, darwin-arm64), checksums,
  attach_release (single writer), publish_release
  (un-draft after attestation re-verify).

macOS leg falls back to unsigned .dmg when
ELECTROBUN_DEVELOPER_ID is unset. Apple cert keychain
import is gated on that env var.
EOF
)"
```

---

## Task 11: Create CI_GUIDE.md

**Files:**
- Create: `assets/guides/CI_GUIDE.md`

- [ ] **Step 1: Verify the guides directory exists**

```bash
ls assets/guides/ || mkdir -p assets/guides
```

- [ ] **Step 2: Write the guide**

```markdown
<!-- markdownlint-disable-file -->
# CI / CD Guide

Operational manual for app's GitHub Actions pipeline. Pairs with
[`design.md`](../docs/specs/ci-build-packaging/design.md) (the normative
contract).

## Overview

| Workflow      | Trigger                                                | Runner        | Outcome                                 |
| ------------- | ------------------------------------------------------ | ------------- | --------------------------------------- |
| `review.yml`  | PR opened / synchronized / reopened                    | ubuntu-latest | Lint + test + Linux smoke build         |
| `release.yml` | Push to `main`                                         | ubuntu-latest | Draft GitHub Release via release-it     |
| `publish.yml` | `workflow_run` from Release **or** `workflow_dispatch` | matrix        | Native binaries → attached → un-drafted |

Build targets:

| Target         | Runner             | Artifact                                                              |
| -------------- | ------------------ | --------------------------------------------------------------------- |
| `linux-x64`    | `ubuntu-latest`    | `app-<ver>-linux-x64.tar.gz`                                          |
| `linux-arm64`  | `ubuntu-24.04-arm` | `app-<ver>-linux-arm64.tar.gz`                                        |
| `darwin-arm64` | `macos-latest`     | `app-<ver>-darwin-arm64.dmg` or `app-<ver>-darwin-arm64-unsigned.dmg` |

## Secrets and variables

### Secrets (8)

| Name                      | Required     | Purpose                                                          |
| ------------------------- | ------------ | ---------------------------------------------------------------- |
| `GH_TOKEN`                | yes          | PAT bypassing branch protection; release-it + `gh release` calls |
| `RELEASE_SIGNING_SSH_KEY` | yes          | SSH private key for signed commits/tags                          |
| `ELECTROBUN_DEVELOPER_ID` | optional     | Apple Developer ID cert CN — gates the macOS signing path        |
| `MAC_CERTIFICATE_BASE64`  | conditional¹ | `.p12` cert, base64-encoded                                      |
| `MAC_CERT_PASSWORD`       | conditional¹ | `.p12` export password                                           |
| `ELECTROBUN_APPLEID`      | conditional¹ | Apple ID email                                                   |
| `ELECTROBUN_APPLEIDPASS`  | conditional¹ | App-specific password from `appleid.apple.com`                   |
| `ELECTROBUN_TEAMID`       | conditional¹ | 10-char Team ID from `developer.apple.com`                       |

¹ Required when `ELECTROBUN_DEVELOPER_ID` is set. If `ELECTROBUN_DEVELOPER_ID`
is empty, the four conditional secrets are ignored and the mac leg falls back
to producing an unsigned `.dmg`.

### Variables (3)

| Name                         | Required  | Purpose                                                |
| ---------------------------- | --------- | ------------------------------------------------------ |
| `RELEASE_SIGNING_SIGNER_PUB` | yes       | SSH **public** key (matches `RELEASE_SIGNING_SSH_KEY`) |
| `RELEASE_GIT_USER_NAME`      | optional² | Falls back to `github-actions[bot]`                    |
| `RELEASE_GIT_USER_EMAIL`     | optional² | Falls back to bot noreply email                        |

² Set if you want author attribution on release commits.

### Provisioning

#### `GH_TOKEN`

1. Profile → Developer settings → Personal access tokens (fine-grained).
2. Repository access: only this repo.
3. Permissions: `Contents: Read & write`, `Issues: Read & write`,
   `Pull requests: Read & write`.
4. Repo → Settings → Secrets → Actions → `GH_TOKEN`.

#### `RELEASE_SIGNING_SSH_KEY` + `RELEASE_SIGNING_SIGNER_PUB`

```sh
ssh-keygen -t ed25519 -C "app release signing" -f release_signing -N ''
gh secret set RELEASE_SIGNING_SSH_KEY < release_signing
gh variable set RELEASE_SIGNING_SIGNER_PUB < release_signing.pub
shred -u release_signing release_signing.pub  # macOS: rm -P
```

Then add the public key as an **SSH signing key** for the bot user (or the
repo's deploy keys), not just an authentication key.

#### Apple Developer ID

1. Enroll in Apple Developer Program; create a `Developer ID Application` cert
   in Keychain Access.
2. Export the cert + private key as a `.p12`:
   ```sh
   security export -k login.keychain -t identities -f pkcs12 \
     -o developer-id.p12 -P "<password>"
   base64 -i developer-id.p12 | gh secret set MAC_CERTIFICATE_BASE64
   gh secret set MAC_CERT_PASSWORD --body "<password>"
   shred -u developer-id.p12  # macOS: rm -P
   ```
3. Set the cert CN as `ELECTROBUN_DEVELOPER_ID`:
   ```sh
   security find-identity -v -p codesigning   # find "Developer ID Application: ..."
   gh secret set ELECTROBUN_DEVELOPER_ID --body "Developer ID Application: ..."
   ```
4. Generate an app-specific password at `appleid.apple.com` → Sign-In and
   Security → App-Specific Passwords:
   ```sh
   gh secret set ELECTROBUN_APPLEID     --body "you@example.com"
   gh secret set ELECTROBUN_APPLEIDPASS --body "abcd-efgh-ijkl-mnop"
   gh secret set ELECTROBUN_TEAMID      --body "ABCDE12345"
   ```

#### Verification

```sh
gh secret list
gh variable list
mise exec -- actionlint   # validates all .github/workflows/*.yml
```

## Workflow: review.yml

**Trigger:** PR opened / synchronized / reopened / ready-for-review.
**Concurrency:** `app-${{ github.ref }}`, cancel-in-progress.

Jobs:

- **`lint`** — runs `lint:biome:ci`, `lint:knip:ci`, `lint:depcruise:ci`,
  `lint:jscpd:ci`, `lint:ls:ci`, `lint:ast-grep:ci`, `lint:mise:ci`,
  `typecheck` with aggregated exit code. Reports → `tmp/reports/linters/` →
  `report-linters` artifact (7 days).
- **`test`** — `bun run test:ci` produces JUnit + coverage. Summary table
  via composite `junit-summary`. `mikepenz/action-junit-report` publishes
  the test check.
- **`build`** — Linux smoke build with `ELECTROBUN_DEVELOPER_ID=''`. Uploads
  `build-smoke-linux-x64` (3 days) for reviewer download.

**Common failures:**

| Symptom                                   | Cause / fix                                                 |
| ----------------------------------------- | ----------------------------------------------------------- |
| `lint:knip` fails on unused export        | Delete the export or use it; `bun run lint:knip:fix`        |
| `lint:depcruise` fails on layer violation | A renderer file imported `shell/app/`; move to RPC          |
| Build cache miss every run                | Verify `~/.electrobun` cache key; check `package.json` hash |

**Local mirror:** `mise run ci:review`.

## Workflow: release.yml

**Trigger:** push to `main`. **Concurrency:** `app-release`,
**cancel-in-progress: false** — never interrupt an in-flight release.

Steps (in order):

1. Checkout with `fetch-depth: 0` (release-it needs full tag history).
2. Validate squash-and-merge — rejects merge subjects and multi-commit pushes.
3. Setup via composite (mise mode).
4. Start `webfactory/ssh-agent@v0.9.0` with the signing key.
5. Configure git signing + identity (uses var `RELEASE_SIGNING_SIGNER_PUB`,
   falls back to `ssh-add -L`).
6. Verify signing self-test: signed commit + signed tag in a temp repo.
7. `git pull --rebase origin main` (defensive against push races).
8. `bun run release:ci` (release-it).
9. Poll `gh release list --limit 1` for `isDraft: true` (10 × 5s). Exits 0
   either way; "no draft" means "no releasable commits in this push," which
   is normal for `chore`/`docs` pushes.

**Common failures:**

| Symptom                                     | Cause / fix                                                       |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `Merge commit detected on main`             | Branch protection allows non-squash merge; tighten settings       |
| `Signed commit missing gpgsig header`       | `RELEASE_SIGNING_SSH_KEY` not registered as signing key on GitHub |
| `release-it: requireCleanWorkingDir failed` | Earlier step left files dirty; check `before:init` hooks          |
| `release-it: requireBranch=main`            | Workflow somehow ran on a non-`main` ref (shouldn't happen)       |

**Local mirror:**

```sh
mise run ci:release:check-squash
mise run ci:release:check-signing
mise run ci:release:dry-run
mise run ci:release:notes
```

## Workflow: publish.yml

**Trigger:** `workflow_run` from Release (auto) **or** `workflow_dispatch`
(manual recovery, requires `tag` input). **Concurrency:** keyed on the tag,
cancel-in-progress.

### DAG

```
resolve_tag
   │
   ├──► binaries (matrix: linux-x64, linux-arm64, darwin-arm64)
   │       │
   │       └──► checksums
   │              │
   │              └──► attach_release
   │                       │
   │                       └──► publish_release
```

### `resolve_tag`

Resolves the tag to publish. Fails fast if the upstream Release didn't
succeed (only relevant on `workflow_run` trigger). Resolves from
`inputs.tag` first, then from the latest draft release.

### `binaries` (matrix)

`fail-fast: false` so one platform failure doesn't abort the others.

- Checks out the **release tag** (not `main`).
- Sets up bun + caches `~/.electrobun`.
- macOS-only: imports `.p12` into an ephemeral keychain, gated on
  `env.ELECTROBUN_DEVELOPER_ID != ''`.
- Runs `bun run build:prod`. Electrobun reads `ELECTROBUN_*` env vars and
  decides internally whether to sign + notarize + staple + create DMG.
- `package-electrobun` composite tarballs the Linux output or renames the
  Electrobun-produced `.dmg` (with `-unsigned` suffix when no developer ID).
- `actions/attest-build-provenance@v2` records SLSA provenance.
- Uploads `binary-${{ matrix.target }}` (1 day).

### `checksums`

Downloads all `binary-*` artifacts → computes `sha256sum` →
`actions/attest-build-provenance@v2` over `checksums.txt` → uploads
`checksums` artifact.

### `attach_release` (single writer)

Only this job touches the GitHub Release surface.

- Downloads all artifacts (`merge-multiple: true`).
- `softprops/action-gh-release@v2` uploads `*.tar.gz`, `*.dmg`,
  `checksums.txt` to the existing draft (idempotent).
- Verifies every uploaded asset's attestation via `gh attestation verify`.

### `publish_release`

- Re-verifies attestations (catches tampering between upload and un-draft).
- Builds install notes (heredoc with macOS + Linux instructions, verify
  section, prepends draft body).
- `gh release edit --draft=false --latest --notes-file ...`.

### macOS signing fallback

| `ELECTROBUN_DEVELOPER_ID` | Mac leg behavior                                                                  | Artifact filename                     |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| empty / unset             | Build unsigned `.app`, Electrobun produces unsigned `.dmg`, skips notarize/staple | `app-<ver>-darwin-arm64-unsigned.dmg` |
| non-empty                 | Full sign + notarize + staple via Electrobun's pipeline                           | `app-<ver>-darwin-arm64.dmg`          |

### Common failures

| Symptom                                                   | Cause / fix                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `No .dmg found under dist/`                               | Electrobun build failed before DMG step; check `bun run build:prod`          |
| `gh attestation verify` fails on a `.tar.gz`              | Token lacks `id-token: write` on the binaries job                            |
| `security: error -25308` during cert import               | `MAC_CERT_PASSWORD` mismatch with `.p12`                                     |
| Upstream Release succeeded but publish.yml didn't trigger | Repo doesn't have Actions enabled on `workflow_run`; use `workflow_dispatch` |
| linux-arm64 leg cancelled "no runner available"           | GitHub-hosted ARM runners temporarily exhausted; retry the matrix leg        |

**Local mirror:** `mise run ci:publish --version=<ver> --target=<target>`.

## Local mirror tasks (mise)

| Task                       | What it does                                      |
| -------------------------- | ------------------------------------------------- |
| `ci:review`                | full review.yml chain (lint + test + smoke build) |
| `ci:review:lint`           | `bun run lint`                                    |
| `ci:review:test`           | `bun run test:ci` (JUnit + coverage)              |
| `ci:review:build`          | `ELECTROBUN_DEVELOPER_ID='' bun run build`        |
| `ci:release:check-squash`  | validate HEAD subject is not a merge commit       |
| `ci:release:check-signing` | signed-commit + signed-tag self-test              |
| `ci:release:dry-run`       | `bunx release-it --dry-run --ci`                  |
| `ci:release:notes`         | preview only the next CHANGELOG entry             |
| `ci:publish`               | full publish.yml chain for the local platform     |
| `ci:publish:build`         | `bun run build:prod`                              |
| `ci:publish:package`       | tarball linux output / rename mac `.dmg`          |
| `ci:publish:checksum`      | `sha256sum *.tar.gz *.dmg > checksums.txt`        |

**Not mirrored:** Apple cert keychain import, `gh release` calls,
`gh attestation verify`. These require runtime state that doesn't exist
locally (CI-ephemeral keychain, GitHub OIDC token, repo write).

## Common cross-workflow issues

| Symptom                                                 | Likely cause / fix                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Workflow can't find composite action                    | Missing `actions/checkout@v4` step before the `uses: ./.github/...` reference                          |
| `setup_mode: mise` step fails silently in caching       | Stale `~/.bun/install/cache` key; bump the cache key or delete it via UI                               |
| Two `release.yml` runs racing                           | Concurrency group is per-`app-release` and `cancel-in-progress: false` — let one finish                |
| Tag created but no draft release                        | release-it ran with no releasable commits (`chore:` only, etc.) — expected                             |
| Draft release exists but `publish.yml` doesn't fire     | Trigger is `workflow_run: completed` — only fires when Release completes successfully                  |
| ARM Linux leg fails with `bash: bun: command not found` | `setup-bun-project` action didn't install on `ubuntu-24.04-arm`; verify mise.toml has `bun = "latest"` |
| `gh attestation verify` fails with "no attestations"    | `id-token: write` permission missing on the producing job                                              |
```

- [ ] **Step 3: Verify markdown is valid**

```bash
bunx biome check assets/guides/CI_GUIDE.md
```

Expected: no errors.

- [ ] **Step 4: Verify the design cross-link resolves**

```bash
ls assets/docs/specs/ci-build-packaging/design.md
```

Expected: file exists (referenced by relative link `../docs/specs/ci-build-packaging/design.md`).

- [ ] **Step 5: Commit**

```bash
git add assets/guides/CI_GUIDE.md
git commit -m "$(cat <<'EOF'
docs: Add CI_GUIDE.md

Single consolidated operational guide for the Phase 2
CI/CD pipeline. Sections:

- Overview (workflow trigger summary, build target
  table).
- Secrets and variables (8 secrets, 3 vars, full
  provisioning steps including Apple Developer ID
  flow).
- Per-workflow reference (review, release, publish)
  with steps, common failures, local mirror commands.
- macOS signing fallback table.
- Local mirror tasks (mise) reference table.
- Cross-workflow troubleshooting matrix.

Replaces the four-files alternative (CI_REVIEW.md,
CI_RELEASE.md, CI_PUBLISH.md, CI_SECRETS.md).
EOF
)"
```

---

## Task 12: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the `## DEVELOPMENT` section**

Find the existing block:

```markdown
## DEVELOPMENT

```sh
bun run dev       # Build and launch in dev mode (Electrobun window)
bun run build     # Production build — dist/app.app (macOS)
bun run test      # Run unit tests
bun run typecheck # Type-check without emitting
```
```

Replace with:

```markdown
## DEVELOPMENT

```sh
bun run dev       # Build and launch in dev mode (Electrobun window)
bun run build     # Production build — dist/app.app (macOS)
bun run test      # Run unit tests
bun run typecheck # Type-check without emitting
bun run lint      # Run the full Phase-1 quality chain
bun run lint:fix  # Auto-fix what can be fixed (Biome / Knip / ast-grep)
```

### CI mirror tasks

The same checks GitHub Actions runs are mirrored locally via [Mise][6]:

```sh
mise run ci:review              # lint + test + Linux smoke build
mise run ci:release:dry-run     # preview the next release-it run
mise run ci:release:notes       # preview only the next CHANGELOG entry
mise run ci:publish --version=0.1.0 --target=linux-x64  # build + package + checksum
```

See the [CI / CD guide][20] for the full task table.
```

- [ ] **Step 2: Add a new `## CI / CD` section between `### DEPENDENCIES` and `## ACKNOWLEDGEMENTS`**

```markdown
## CI / CD

Three workflows handle review, release, and publishing:

| Workflow      | Trigger                                         | Outcome                                   |
| ------------- | ----------------------------------------------- | ----------------------------------------- |
| `review.yml`  | PR opened / synchronized                        | Lint + test + Linux smoke build           |
| `release.yml` | Push to `main` (squash-merged PR)               | Draft GitHub Release via [release-it][19] |
| `publish.yml` | After Release succeeds (or `workflow_dispatch`) | Native binaries → un-drafted Release      |

Build targets:

| Target         | Runner             | Artifact                                                   |
| -------------- | ------------------ | ---------------------------------------------------------- |
| `linux-x64`    | `ubuntu-latest`    | `app-<ver>-linux-x64.tar.gz`                               |
| `linux-arm64`  | `ubuntu-24.04-arm` | `app-<ver>-linux-arm64.tar.gz`                             |
| `darwin-arm64` | `macos-latest`     | `app-<ver>-darwin-arm64.dmg` (or `-unsigned.dmg` fallback) |

macOS code signing is gated by `ELECTROBUN_DEVELOPER_ID`; if unset, the mac
leg produces an unsigned `.dmg` that can be installed with
`xattr -d com.apple.quarantine /Applications/app.app`.

See the [CI / CD guide][20] for full operational detail (secrets,
provisioning, troubleshooting, local mirroring).

```

- [ ] **Step 3: Add the two new footnote references at the bottom**

After the existing `[18]` line, append:

```markdown
[19]: https://github.com/release-it/release-it 'release-it'
[20]: assets/guides/CI_GUIDE.md 'CI / CD operational guide'
```

- [ ] **Step 4: Verify the README parses and links resolve**

```bash
bunx biome check README.md
ls assets/guides/CI_GUIDE.md
```

Expected: no Biome errors; `CI_GUIDE.md` exists.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: Update README with CI/CD section

- Extends ## DEVELOPMENT with bun run lint,
  bun run lint:fix, and a "CI mirror tasks" subsection
  pointing at mise run ci:* commands.
- Adds a new ## CI / CD section between DEPENDENCIES
  and ACKNOWLEDGEMENTS with workflow + build-target
  summary tables and a single link to the full
  CI_GUIDE.md operational manual.
- Adds [19] release-it and [20] CI_GUIDE.md footnote
  references.
EOF
)"
```

---

## Task 13: End-to-end verification

This task creates **no commit**. It exercises the design's
§VERIFICATION POINTS to prove the implementation is complete.

**Files:** none modified.

- [ ] **Step 1: Phase-1 quality gate still passes**

```bash
bun run lint && bun run test
```

Expected: both exit 0.

- [ ] **Step 2: All workflow files exist**

```bash
ls .github/workflows/{review,release,publish}.yml
ls .github/actions/{setup-bun-project,junit-summary,package-electrobun}/action.yml
```

Expected: 6 lines, all paths printed.

- [ ] **Step 3: All workflows pass actionlint**

```bash
mise exec -- actionlint
```

Expected: no output, exit 0. (`actionlint` recursively validates every
`.github/workflows/*.yml`. Composite-action references are checked
transitively when used by these workflows.)

- [ ] **Step 4: `mise.toml` parses and lists 12 ci:* tasks + actionlint tool**

```bash
mise exec -- tombi check mise.toml
test "$(mise tasks ls | grep -c '^ci:')" = "12" && echo "tasks OK"
mise exec -- actionlint --version >/dev/null && echo "actionlint OK"
```

Expected: tombi exit 0, then `tasks OK`, `actionlint OK`.

- [ ] **Step 5: `package.json` has the new deps, scripts, and `release-it` config**

```bash
bun -e "
const p = require('./package.json')
const must = (cond, msg) => { if (!cond) { console.error('MISSING:', msg); process.exit(1) } }
must(p.devDependencies['release-it'], 'devDeps.release-it')
must(p.devDependencies['@release-it/conventional-changelog'], 'devDeps.@release-it/conventional-changelog')
for (const s of ['build:prod','release:ci','test:ci','lint:biome:ci','lint:knip:ci','lint:depcruise:ci','lint:jscpd:ci','lint:ls:ci','lint:ast-grep:ci','lint:mise:ci']) {
  must(p.scripts[s], 'scripts.' + s)
}
must(p['release-it'], 'top-level release-it')
must(p['release-it'].plugins['@release-it/conventional-changelog'], 'release-it.plugins.cc')
console.log('OK')
"
```

Expected: `OK`.

- [ ] **Step 6: release-it dry-run succeeds**

```bash
mise run ci:release:dry-run
```

Expected: prints a release plan (next version, would-be tag, would-be GitHub release name) and exits 0.

- [ ] **Step 7: ci:review runs end-to-end**

```bash
mise run ci:review
```

Expected: lint passes, test passes, Linux smoke build produces `dist/`.

- [ ] **Step 8: electrobun.config resolves both signed and unsigned paths**

```bash
ELECTROBUN_DEVELOPER_ID='' bun -e "
const c = (await import('./electrobun.config.ts')).default
console.assert(c.build.mac.codesign === false, 'unsigned codesign')
console.assert(c.build.mac.notarize === false, 'unsigned notarize')
console.assert(c.build.mac.createDmg === true, 'createDmg always true')
console.log('unsigned path OK')
"
ELECTROBUN_DEVELOPER_ID='Developer ID Application: Test (XYZ)' \
ELECTROBUN_APPLEID='a@b.com' ELECTROBUN_APPLEIDPASS='x' ELECTROBUN_TEAMID='T1234567' \
bun -e "
const c = (await import('./electrobun.config.ts')).default
console.assert(c.build.mac.codesign === true, 'signed codesign')
console.assert(c.build.mac.notarize === true, 'signed notarize')
console.log('signed path OK')
"
```

Expected: both `... OK` lines.

- [ ] **Step 9: README + CI_GUIDE link to each other and pass markdown checks**

```bash
bunx biome check README.md assets/guides/CI_GUIDE.md
grep -q '\[20\]: assets/guides/CI_GUIDE.md' README.md && echo "README → CI_GUIDE OK"
grep -q 'design.md' assets/guides/CI_GUIDE.md && echo "CI_GUIDE → design OK"
```

Expected: no Biome errors, both `OK` lines.

- [ ] **Step 10: Final git status check**

```bash
git status
git log --oneline -12
```

Expected: clean working tree; 12 new commits at the top of `main` (one per Task 1-12) following the Phase-1 commit.

- [ ] **Step 11: (Manual, post-merge) Open a real PR**

After this branch is merged:

1. Open a fresh PR from a topic branch with a `feat:` commit.
2. Verify `review.yml` runs all three jobs to green.
3. Squash-merge.
4. Verify `release.yml` runs, creates a draft release.
5. Verify `publish.yml` auto-fires, all three matrix legs succeed (or only
   linux legs if Apple secrets are not yet provisioned, with mac falling
   back to unsigned).
6. Verify the published release page contains 3 archives + `checksums.txt`
   with attestation badges.

This step is gated on the repo having all eight required secrets and three
vars provisioned per [`assets/guides/CI_GUIDE.md`](../../guides/CI_GUIDE.md).
