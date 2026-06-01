---
title: Definition of Done
description: Checklist before considering a task complete
---
<!-- markdownlint-disable-file -->

# DEFINITION OF DONE

Cursor rule (summary): `.cursor/rules/definition-of-done.mdc`

In order for a task to be considered completed, it MUST satisfy ALL of the following criteria:

## 0. Implementation Complete

- [ ] All requirements of the task are completely implemented
- [ ] All acceptance criteria from the spec are met
- [ ] Code follows the design document specifications
- [ ] Code follows the guides under the [guides](../guides) directory

## 1. Code Quality - Zero Issues

- [ ] **Autofix linter errors** - `bun run lint:fix` reports 0 issues
- [ ] **No type or linter errors** - `bun run lint` succeeds
- [ ] **No test failures** - `bun run test` passes with 100% success
- [ ] **No warnings** - clean output in IDE diagnostics
- [ ] **No dead code** - all code is used and necessary
- [ ] **No commented-out code** - remove or document why it's there

## 2. Testing Requirements

- [ ] **Unit tests** for all public functions and classes
- [ ] **Table-driven tests** for functions with multiple cases
- [ ] **Edge cases** covered (empty inputs, undefined values, boundary conditions)
- [ ] **Error paths** tested (all error branches validated)
- [ ] **Test coverage** meets minimum threshold (aim for 80%+)
- [ ] **Tests use in-memory SQLite** (`:memory:`) - never touch the real DB
- [ ] **No mocking** - use dependency injection and real implementations in tests

## 3. TypeScript Best Practices

- [ ] **Strict mode** enabled - no `any`, no implicit returns
- [ ] **Proper error handling** - errors are typed and handled explicitly
- [ ] **Exported names** documented with JSDoc comments
- [ ] **DRY/SOLID principles** applied:
  - [ ] Opportunities for refactoring identified and applied
  - [ ] Inversion of Control and Dependency Injection used
  - [ ] Duplicated/unnecessary/inefficient code eliminated
  - [ ] Duplicated logic encapsulated, even if parametrized

## 4. Integration

- [ ] **Builds successfully** - `bun run dev` runs the app in dev mode showing the app running in the preview browser window
- [ ] **Builds dev mode successfully** - `bun run build` produces `dist/kb.app` for macOS
- [ ] **Builds production mode successfully when the command is available** - `bun run build:prod` produces `dist/kb.app` for macOS
- [ ] **No breaking changes** to existing interfaces (or documented if intentional)
- [ ] **Dependencies updated** in `package.json`/`bun.lock` if needed
- [ ] **Backwards compatible** unless major version bump

## 5. Documentation

- [ ] **README.md updated** with:
  - New commands added to usage section (if applicable)
  - Development instructions updated (if applicable)
  - Examples added for new features (if applicable)
- [ ] **Public API** documented when it helps maintainers (JSDoc on exports where it adds value; skip obvious wrappers)
- [ ] **Inline comments** only for non-obvious *why*

## 6. Git Commit

- [ ] **Atomic commit** - single logical change
- [ ] **Conventional Commits format** - follows GIT_COMMITS_GUIDE.md
- [ ] **Subject line ≤50 characters**
- [ ] **Body explains WHAT and WHY** (not HOW)
- [ ] **All relevant files staged** - no unrelated changes
- [ ] **HK hooks pass** - commit-message policy and quality gate succeed

## 7. Task-Specific Additions

### For New Features

- [ ] Feature documented in README.md
- [ ] Examples provided
- [ ] Integration tests added (if applicable)

### For Bug Fixes

- [ ] Regression test added to prevent recurrence
- [ ] Root cause documented in commit message

### For Refactoring

- [ ] Behavior unchanged (tests still pass)
- [ ] Performance impact measured (if relevant)
- [ ] Justification in commit message

### For Infrastructure/Tooling

- [ ] Documentation updated with setup instructions
- [ ] mise.toml updated with any new COMPLEX tasks (if needed)
- [ ] Team notified of changes

## REFERENCES

- [Bun Test Runner](https://bun.sh/docs/test)
- [TypeScript Handbook](https://typescriptlang.org/docs/)
- [Conventional Commits](https://conventionalcommits.org/)
- [Commit Message Guidelines](./GIT_COMMITS_GUIDE.md)
