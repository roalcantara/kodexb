<!-- markdownlint-disable-file -->
# CI / CD Guide

Operational manual for kb's three GitHub Actions workflows, their local mirror
tasks, the Electrobun build + signing pipeline, and the orchestrator PR/CI
bindings.

**Design context** (normative contract for the CI/CD system):

- **In scope:** `review.yml` (lint+test+smoke), `release.yml` (draft GitHub
  Release with signed commits/tags), `publish.yml` (matrix binaries,
  attestations, publish). Apple Developer ID signing (optional, env-gated).
  Local mirror under `mise run ci:*`.
- **Out of scope:** Windows builds, Linux signing (no GPG), auto-update
  delivery, Docker images.
- **Adopted patterns:** grouped lint chain with aggregated exit codes, JUnit +
  GitHub Checks for tests, squash-and-merge enforcement, SSH-agent signed
  commits + tags, two-step signing self-test, draft→publish handoff with
  `workflow_run` chaining + `workflow_dispatch` recovery, `fail-fast: false`
  matrix with single-writer `attach_release`, SLSA build-provenance
  attestations, composite `setup-bun-project` (mise mode + lockfile cache).
- **Rejected patterns:** Hadolint, DockerHub preview images, multi-platform OCI
  push, Bun cross-compile (needs native webview), hand-rolled `hdiutil` DMG
  (Electrobun handles DMG+sign+notarize), standalone `entitlements.plist`
  (Electrobun reads inline config).

## Overview

| Workflow      | Trigger                                                | Runner        | Outcome                                 |
| ------------- | ------------------------------------------------------ | ------------- | --------------------------------------- |
| `review.yml`  | PR opened / synchronized / reopened                    | ubuntu-latest | Lint + test + Linux smoke build         |
| `release.yml` | Push to `main`                                         | ubuntu-latest | Draft GitHub Release via release-it     |
| `publish.yml` | `workflow_run` from Release **or** `workflow_dispatch` | matrix        | Native binaries → attached → un-drafted |

Build targets:

| Target         | Runner             | Artifact                                                            |
| -------------- | ------------------ | ------------------------------------------------------------------- |
| `linux-x64`    | `ubuntu-latest`    | `kb-<ver>-linux-x64.tar.gz`                                         |
| `linux-arm64`  | `ubuntu-24.04-arm` | `kb-<ver>-linux-arm64.tar.gz`                                       |
| `darwin-arm64` | `macos-latest`     | `kb-<ver>-darwin-arm64.dmg` or `kb-<ver>-darwin-arm64-unsigned.dmg` |

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
ssh-keygen -t ed25519 -C "kb release signing" -f release_signing -N ''
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

- **`security`** — `mise run spec security --strict --base "$GITHUB_BASE_REF"`
  runs deterministic security checks (secrets, dependency, Electrobun surface)
  and must pass before build.

- **`lint`** — `mise run lint check --<tool> --ci`
  (Biome, Knip, dependency-cruiser, jscpd, ls-lint, ast-grep, mise) plus
  `typecheck`, with aggregated exit code. Reports → `tmp/reports/linters/` →
  `report-linters` artifact (7 days).
- **`test`** — `mise run test ci` produces JUnit + coverage. Summary table
  via composite `junit-summary`. `mikepenz/action-junit-report` publishes
  the test check.
- **`build`** — Linux smoke build with `ELECTROBUN_DEVELOPER_ID=''`. Uploads
  `build-smoke-linux-x64` (3 days) for reviewer download.

**Common failures:**

| Symptom                                   | Cause / fix                                                 |
| ----------------------------------------- | ----------------------------------------------------------- |
| `lint:knip` fails on unused export        | Delete the export or use it; `mise run lint check --knip`   |
| `lint:depcruise` fails on layer violation | A renderer file imported `shell/app/`; move to RPC          |
| Build cache miss every run                | Verify `~/.electrobun` cache key; check `package.json` hash |

**Catalog / HK enforcement:**

- `catalog-validate-ci` runs `mise run catalog validate --raw` on every CI job (covers all 13 shipped keys, schema, tag placement, orphan tags).
- Pre-commit also runs `catalog validate` when `catalog.yaml`, Gherkin, or tagged unit specs change.
- `library-manifest-verify` runs when archive folders change, verifying `library.yaml` is in sync.

**Local mirror:** `mise run ci review`.

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
8. `bunx release-it --ci`.
9. Poll `gh release list --limit 1` for `isDraft: true` (10 × 5s). Exits 0
   either way; "no draft" means "no releasable commits in this push," which
   is normal for `chore`/`docs` pushes.

**Common failures:**

| Symptom                                     | Cause / fix                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Merge commit detected on main`             | PR merged with merge/rebase; use `gh pr merge <n> --squash` and disable other merge methods in repo settings |
| `Signed commit missing gpgsig header`       | `RELEASE_SIGNING_SSH_KEY` not registered as signing key on GitHub                                            |
| `release-it: requireCleanWorkingDir failed` | Earlier step left files dirty; check `before:init` hooks                                                     |
| `release-it: requireBranch=main`            | Workflow somehow ran on a non-`main` ref (shouldn't happen)                                                  |

**Local mirror:**

```sh
mise run ci release --check-squash
mise run ci release --check-signing
mise run ci release --dry-run
mise run ci release --notes
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

| `ELECTROBUN_DEVELOPER_ID` | Mac leg behavior                                                                  | Artifact filename                    |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| empty / unset             | Build unsigned `.app`, Electrobun produces unsigned `.dmg`, skips notarize/staple | `kb-<ver>-darwin-arm64-unsigned.dmg` |
| non-empty                 | Full sign + notarize + staple via Electrobun's pipeline                           | `kb-<ver>-darwin-arm64.dmg`          |

### Common failures

| Symptom                                                   | Cause / fix                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `No .dmg found under dist/`                               | Electrobun build failed before DMG step; check `bun run build:prod`          |
| `gh attestation verify` fails on a `.tar.gz`              | Token lacks `id-token: write` on the binaries job                            |
| `security: error -25308` during cert import               | `MAC_CERT_PASSWORD` mismatch with `.p12`                                     |
| Upstream Release succeeded but publish.yml didn't trigger | Repo doesn't have Actions enabled on `workflow_run`; use `workflow_dispatch` |
| linux-arm64 leg cancelled "no runner available"           | GitHub-hosted ARM runners temporarily exhausted; retry the matrix leg        |

**Local mirror:** `mise run ci publish package --version=<ver> --target=<target>`.

## Local mirror tasks (mise)

| Task                         | What it does                                      |
| ---------------------------- | ------------------------------------------------- |
| `ci review`                  | full review.yml chain (lint + test + smoke build) |
| `ci release --check-squash`  | validate HEAD subject is not a merge commit       |
| `ci release --check-signing` | signed-commit + signed-tag self-test              |
| `ci release --dry-run`       | `bunx release-it --dry-run --ci`                  |
| `ci release --notes`         | preview only the next CHANGELOG entry             |
| `ci publish build`           | `bun run build:prod`                              |
| `ci publish package`         | tarball linux output / rename mac `.dmg`          |
| `ci publish checksum`        | `sha256sum *.tar.gz *.dmg > checksums.txt`        |
| `test ci`                    | `mise run test ci` (JUnit + coverage)             |

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
| --- | --- |

## Orchestrator PR/CI bindings

The workflow orchestrator (`orchestrator.script.ts`) supports provider-agnostic
PR and CI completion via profile `command:` bindings (AWO-6).

### Profile provider fields

| Field | Purpose | Default (kb) |
| ----- | ------- | ------------ |
| `providers.pr_open` | Command to open a pull request | `gh pr create ...` |
| `providers.pr_update` | Command to update an existing PR body/description | `gh pr edit ...` |
| `providers.ci_status` | Command to check CI status (exit 0 = green) | `gh pr checks --interval 10 --required` |

All provider commands are invoked through the L2 adapter (`providers_runner.script.ts`)
which calls `invokeWithTelemetry` — the same executor used for stage commands.
The orchestrator never calls `gh` or provider APIs directly.

### PR-prep stage

A `pr-prep` stage is inserted after `implement` in the default workflow profile.
Its `triggers.post` runs pre-PR checks (e.g. `hk check --profile pr`). This
stage is processed by the standard stage loop.

### CI gate flow

After the stage loop completes, the orchestrator runs `runProviders()`:

1. If `providers.pr_open` is set, it is invoked and the stdout is parsed for a
   PR URL which is persisted to run-shared memory (`<run_id>.shared.json` →
   `pr_ref` key).
2. If `providers.ci_status` is set, it is invoked in a loop up to
   `default_retry.max_attempts` times. The result is evaluated by
   `ci_gate.script.ts` (`checkCiGate`):
   - **exit 0** → CI passes, the loop exits.
   - **non-zero within budget** → retry (R2R remediation).
   - **non-zero after budget exhausted** → `stage.escalated` event emitted with
     `cause: ci_retries_exhausted`.
3. If no providers are configured (empty `providers: {}`), the orchestrator
   skips the provider phase entirely.

### Swapping providers

To use a different CI provider (e.g. GitLab CI, CircleCI):

```yaml
# In assets/catalog/workflows/<profile>.yaml
providers:
  ci_status: "curl -s https://ci.example.com/projects/my-project/status | jq -e '.state == \"success\"'"
  pr_open: "glab mr create ..."
```

No engine code changes are needed — the provider commands are profile data only.

## Workflow smoke

A nightly smoke workflow (`.github/workflows/smoke.yml`) drives the
orchestrator through a spec gate against fixture data. Run manually with:

```sh
mise run spec workflow smoke
```

The smoke runs on a schedule (`0 3 * * *`) and does not gate PR merges.
It is the canonical dogfood integration for the workflow orchestrator
(AWO-12.3, SMOKE-01).
