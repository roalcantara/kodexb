# kb

[![Review](https://github.com/roalcantara/kb/actions/workflows/review.yml/badge.svg)](https://github.com/roalcantara/kb/actions/workflows/review.yml) [![Release](https://github.com/roalcantara/kb/actions/workflows/release.yml/badge.svg)](https://github.com/roalcantara/kb/actions/workflows/release.yml) [![Publish](https://github.com/roalcantara/kb/actions/workflows/publish.yml/badge.svg)](https://github.com/roalcantara/kb/actions/workflows/publish.yml)

A native desktop knowledge management app built on [Electrobun][12].

[![MIT license](https://img.shields.io/badge/License-MIT-brightgreen.svg?style=flat-square)](LICENSE) [![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg?style=flat-square)][2] [![Editor Config](https://img.shields.io/badge/Editor%20Config-1.0.1-crimson.svg?style=flat-square)][3] [![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)][4] [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?logo=conventional-commits&style=flat-square)][9] [![Biome](https://img.shields.io/badge/Biome-blue.svg?style=flat-square)][13]

## INSTALLATION

```sh
git clone https://github.com/roalcantara/kb
cd kb
mise run project setup
```

## DEVELOPMENT

```sh
bun run dev       # Build and launch in dev mode (Electrobun window)
bun run build     # Production build — dist/kb.app (macOS)
bun run test      # Run unit tests
bun run typecheck # Type-check without emitting
bun run lint      # Run the full Phase-1 quality chain
bun run lint:fix  # Auto-fix what can be fixed (Biome / Knip / ast-grep)
```

### Project definitions and agent routing

The canonical engineering and agent definitions are split by purpose:

| File / guide             | Purpose                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| [CLAUDE.md][24]          | Primary agent instructions: stack, FCIS layers, required skills, and reference docs.                      |
| [AGENTS.md][23]          | Repo-wide agent guardrails, commit workflow, prototype gate, and Electrobun process rules.                |
| [SKILLS.md][21]          | Skill adoption ledger: owned skills, Skills CLI-managed project skills, global companions, and rationale. |
| [SKILLS.yml][26]         | Structured skill registry used by `mise run skill sync` and `mise run skill install`.                     |
| [MISE_GUIDE.md][22]      | Task-runner policy: prefer mise tasks for project workflows and avoid ad-hoc project scripts.             |
| [Electrobun routing][25] | Which Electrobun skill to read for desktop shell, build, platform, RPC, and automation work.              |

Skill routing follows one rule of thumb: project-specific guidance wins. Load
`kb-context` for any kb task, then add narrower skills such as `kb-rpc`,
`kb-testing`, `kb-quality-gate`, or the routed Electrobun skill when the work
calls for them.

`mise run skill install` restores Skills CLI-managed project skills from
[skills-lock.json][27] into `.agents/skills/`. Optional global companions stay
under `$HOME/.agents/skills/` unless the skill registry marks them as project
skills.

### Keyboard — command palette (⌘P) and filter (⌘K)

Product rules for the list shell (normative for implementation). Full specs: [requirements](assets/docs/specs/command-palette-filter-ux/requirements.md) · [design](assets/docs/specs/command-palette-filter-ux/design.md) · [tasks](assets/docs/specs/command-palette-filter-ux/tasks.md) · [HANDOFF](assets/docs/specs/command-palette-filter-ux/HANDOFF.md). Visual reference (non-normative): [raycast.list_filter_opened.png](assets/wireframe/references/raycast.list_filter_opened.png).

| Shortcut                                                     | Action                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **⌘P** / **Ctrl+P**                                          | Toggle **command palette**. Opening the palette **closes** the filter overlay if it is open.                                                                                                                                                           |
| **⌘K** / **Ctrl+K**                                          | Toggle **filter** overlay. Opening the filter **closes** the palette if it is open.                                                                                                                                                                    |
| **⌘P** / **⌘K** while **settings** or **task sheet** is open | **No-op** (same suppression family as list nav).                                                                                                                                                                                                       |
| **Filter** — live apply                                      | Changes apply immediately (`onChange`). **Esc**, **click-outside**, and **⌘K** only **close** the overlay — **no** staged undo of filter state.                                                                                                        |
| **Filter** — **↑/↓**                                         | Move highlight in a **flat** filter list only; **do not** change main list **`selectedId`**.                                                                                                                                                           |
| **Filter** — **Enter** (commit path)                         | Compare current `{ types, tags, taskView }` to a **snapshot taken when the overlay opened** (tags sorted for equality). **Unchanged** → neutral toast, close, restore focus. **Changed** → optional success toast, close, restore focus.               |
| **Full detail** + filter **Enter** + **changed**             | Same as commit path, and **also** leave full detail for **list view** (e.g. `closeToList`). **Esc** / toggle / click-outside without that Enter path → close overlay only, **no** forced list view.                                                    |
| **Palette** — **↑/↓**                                        | Palette internal navigation only (unchanged); **not** main list selection.                                                                                                                                                                             |
| **Palette** — actions                                        | **Entry-first** sections: This entry → Clipboard → Source → Library → App (see [design](assets/docs/specs/command-palette-filter-ux/design.md)). With **`selectedId === null`**: Library (Sync, New Task) then App (Quit). Headers are non-selectable. |
| **Implementation**                                           | Prefer **`keydown` capture** on `window` (or one coordinator). Rename legacy **`cmdk_palette`** / **`kb-cmdk-*`** to **`command_palette`** / **`kb-command-palette-*`**.                                                                               |

### CI mirror tasks

The same checks GitHub Actions runs are mirrored locally via [Mise][6]:

```sh
mise run ci review              # lint + test + Linux smoke build
mise run ci release --dry-run   # preview the next release-it run
mise run ci release --notes     # preview only the next CHANGELOG entry
  mise run ci publish package --version=0.1.0 --target=linux-x64  # build + package + checksum
```

See the [CI / CD guide][20] for the full task table.

### Miscellaneous mise tasks

Run `mise tasks ls` for the live task list. These tasks cover local setup,
agent skill wiring, UI smoke checks, and maintenance workflows:

| Task                       | Use when                                                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mise run project setup`           | Installing tool versions, dependencies, and hooks after cloning.                                                                                                                                                                  |
| `mise run prepare`         | Refreshing Bun dependencies and commit hooks without reinstalling tools.                                                                                                                                                          |
| `mise run skill sync`      | Rewriting generated skill routing snippets from `assets/guides/SKILLS.yml`.                                                                                                                                                       |
| `mise run skill install`   | Restoring Skills CLI-managed project skills from `skills-lock.json`.                                                                                                                                                              |
| `mise run test e2e-preview` | Running Playwright smoke tests. Required for list navigation, filter, task sheet, or preview tooling changes.|
| `mise run project icons`     | Auditing SVG contrast against the list shell background; use `--fix` only for curated safe replacements.                                                                                                                   |
| `mise run project repo setup`      | Creating the GitHub repo and required CI secrets / variables. |
| `mise run project repo prune`      | Deleting the GitHub repo, releases, and tags for a reset. Use with care. |
| `mise run project repo reset`      | Rebuilding the CI fix branch from the scripted recovery path. |

### DEPENDENCIES

- [Git][5] — version control
- [Mise][6] — tool version management
  - [Bun][11] — runtime, package manager, bundler, test runner
    - [Electrobun][12] — desktop app framework
    - [React][13] — renderer
    - [TypeScript][10] — type safety
    - [Biome][13] — lint and format
    - [Knip][14] — unused files and dependencies
    - [dependency-cruiser][15] — dependency rules ([`.dependency-cruiser.cjs`](.dependency-cruiser.cjs))
    - [ls-lint][16] — file and folder naming convention enforcement ([`.ls-lint.yml`](.ls-lint.yml))
    - [jscpd][17] — copy-paste / duplication detection
  - [pre-commit][7] — git hooks
  - [ast-grep][18] — code structural search, lint, rewriting at large scale
  - [gitlint][8] — commit message validation


## CI / CD

Three workflows handle review, release, and publishing:

| Workflow      | Trigger                                         | Outcome                                   |
| ------------- | ----------------------------------------------- | ----------------------------------------- |
| `review.yml`  | PR opened / synchronized                        | Lint + test + Linux smoke build           |
| `release.yml` | Push to `main` (squash-merged PR)               | Draft GitHub Release via [release-it][19] |
| `publish.yml` | After Release succeeds (or `workflow_dispatch`) | Native binaries → un-drafted Release      |

Build targets:

| Target         | Runner             | Artifact                                                  |
| -------------- | ------------------ | --------------------------------------------------------- |
| `linux-x64`    | `ubuntu-latest`    | `kb-<ver>-linux-x64.tar.gz`                               |
| `linux-arm64`  | `ubuntu-24.04-arm` | `kb-<ver>-linux-arm64.tar.gz`                             |
| `darwin-arm64` | `macos-latest`     | `kb-<ver>-darwin-arm64.dmg` (or `-unsigned.dmg` fallback) |

macOS code signing is gated by `ELECTROBUN_DEVELOPER_ID`; if unset, the mac
leg produces an unsigned `.dmg` that can be installed with
`xattr -d com.apple.quarantine /Applications/kb.app`.

See the [CI / CD guide][20] for full operational detail (secrets,
provisioning, troubleshooting, local mirroring).


## ACKNOWLEDGEMENTS

- [Standard Readme][4]
- [Conventional Commits][9]

## CONTRIBUTING

- Bug reports and pull requests are welcome on [GitHub][0]
- Do follow [Editor Config][3] rules.
- Everyone interacting in the project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the [Contributor Covenant][2] code of conduct.

## LICENSE

The project is available as open source under the terms of the [MIT][1] [License](LICENSE)

[0]: https://github.com/roalcantara/kb 'kb'
[1]: https://opensource.org/licenses/MIT 'Open Source Initiative'
[2]: https://contributor-covenant.org 'A Code of Conduct for Open Source Communities'
[3]: https://editorconfig.org 'EditorConfig'
[4]: https://github.com/RichardLitt/standard-readme 'Standard Readme'
[5]: https://git-scm.com 'Distributed version control system'
[6]: https://mise.jdx.dev 'Manages dev tools like node, python, cmake, terraform, and hundreds more'
[7]: https://pre-commit.com 'Framework for managing and maintaining multi-language pre-commit hooks'
[8]: https://jorisroovers.com/gitlint 'Git commit message linter'
[9]: https://conventionalcommits.org 'Conventional Commits'
[10]: https://typescriptlang.org
[11]: https://bun.sh
[12]: https://blackboard.sh/electrobun
[13]: https://react.dev
[14]: https://github.com/webpro/knip 'Dependency analysis'
[15]: https://github.com/sverweij/dependency-cruiser 'Dependency graphing and circular-dep detection'
[16]: https://github.com/ls-lint/ls-lint 'File and folder naming convention enforcement'
[17]: https://github.com/kucherenko/jscpd 'Copy-paste / duplication detection'
[18]: https://ast-grep.github.io 'Code structural search, lint, rewriting at large scale'
[19]: https://github.com/release-it/release-it 'release-it'
[20]: assets/guides/CI_GUIDE.md 'CI / CD operational guide'
[21]: assets/guides/SKILLS.md 'Project skill guide'
[22]: assets/guides/MISE_GUIDE.md 'Mise task guidelines'
[23]: AGENTS.md 'Agent notes'
[24]: CLAUDE.md 'Claude Code instructions'
[25]: .cursor/electrobun-skill-routing.md 'Electrobun skill routing'
[26]: assets/guides/SKILLS.yml 'Structured skill registry'
[27]: skills-lock.json 'Skills CLI project lock file'
