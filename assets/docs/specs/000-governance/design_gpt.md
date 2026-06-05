# Documentation governance — GPT proposal

Your constraints strongly suggest one thing: separate **work artifacts** from **reference artifacts** and make promotion explicit.

Right now your specs are doing three jobs simultaneously:

- planning / coordination (tasks, handoffs)
- design exploration (draft decisions)
- long-term reference (how the system actually works)

That tension is what creates routing ambiguity.

The cleanest solutions are the ones that make document state transitions explicit, rather than trying to make one folder serve every state.

---

## Option A — Promotion Pipeline (RFC → As-Built Catalog)

This is probably the closest to how mature docs-as-code systems evolve.

### 1. Document layers

| Layer                             | Purpose                   | Audience                    | Mutable?       | Examples                         |
| --------------------------------- | ------------------------- | --------------------------- | -------------- | -------------------------------- |
| `assets/specs/<feature>/`         | Work artifacts            | Agents implementing feature | Highly mutable | requirements, design, tasks      |
| `assets/catalog/features/<slug>/` | Shipped feature reference | All agents + humans         | Rarely         | behavior, contracts, touchpoints |
| `assets/guides/`                  | Timeless process          | All                         | Stable         | FCIS, testing                    |
| `assets/features/e2e/`            | Executable behavior       | Tests + agents              | Evolving       | Gherkin                          |
| `README`                          | Onboarding                | Humans + agents             | Minimal        | setup, navigation                |

Think:

- **specs** = temporary workspace
- **catalog** = permanent memory
- **guides** = rules of engagement

### 2. Lifecycle

```txt
draft
  ↓
active spec
  ↓ ship
promotion step
  ↓
catalog entry created
  ↓
spec archived/stubbed
```

After shipping:

```txt
assets/specs/014-command-palette-filter-ux/README.md
----------------------------------
STATUS: SHIPPED
Canonical record moved to:
assets/catalog/features/command-palette-filter/
Reason:
spec artifacts retained for archaeology only.
```

Tasks become:

- `tasks.md` → frozen
- `design.md` → archived
- `requirements.md` → archived

### 3. Agent routing

`AGENTS.md` becomes extremely simple:

- Need process? → read `assets/guides/`
- Need shipped behavior? → query catalog index → read matching catalog record
- Working on active feature? → read assigned spec folder
- **Never discover specs by traversal.** Only enter specs when explicitly named.

### 4. Index / catalog

Single manifest:

```json
{
  "features": [
    {
      "slug": "command-palette-filter",
      "status": "shipped",
      "catalog": "assets/catalog/features/command-palette-filter",
      "spec": "assets/specs/014-command-palette-filter-ux",
      "supersedes": [],
      "tags": ["search", "keyboard", "ui"]
    }
  ]
}
```

Agents: read manifest → resolve slug → read target. No folder hunting.

### 5. Duplication policy

| Kind                    | Owner             |
| ----------------------- | ----------------- |
| Behavior                | catalog + Gherkin |
| Implementation contract | catalog only      |
| Process                 | guides only       |
| README                  | never normative   |

**Rule:** A statement may have only one normative owner.

### 6. Enforcement

**Ship gate** — feature cannot become SHIPPED unless:

- tasks complete
- catalog record exists
- manifest updated
- spec links removed
- README contains no spec references

**Ast-grep** — forbid:

- `README` → `specs/*`
- `guides` → `specs/*`
- `skills` → `specs/*`

### 7. Tradeoffs

**Pros**

- Extremely clear routing
- Low agent confusion
- Catalog becomes long-term memory
- Specs remain disposable

**Cons**

- Promotion work required
- Duplicate extraction step

---

## Option B — Living Catalog (Spec Folder Dies)

More radical. The spec is temporary and eventually disappears.

### 1. Layers

- `specs/` — temporary only
- `catalog/` — permanent source of truth
- `guides/` — process
- Gherkin — executable

### 2. Lifecycle

```txt
active spec
  ↓
merge useful content into catalog
  ↓
delete spec
```

Spec folder literally removed.

### 3. Agent routing

- Shipped → catalog
- Active → spec
- Old specs do not exist

### 4. Index

Catalog IS the index:

```txt
catalog/features/
  command-palette-filter/
    feature.md
    contract.md
    migration.md
```

### 5. Duplication

Strictest policy:

- specs cannot be normative
- catalog owns everything permanent

### 6. Enforcement

Ship gate: **FAIL** if spec exists and status = shipped.

### 7. Tradeoffs

**Pros**

- Impossible to read stale specs
- Simplest routing

**Cons**

- Lose archaeology
- Migration effort
- Harder historical analysis

---

## Option C — ADR + Feature Record Split

Use two permanent artifacts. Behavior and implementation are intentionally separate.

### 1. Layers

- `catalog/features/` — product behavior
- `docs/adr/` — architectural decisions
- `specs/` — active work

### 2. Lifecycle

```txt
spec
  ↓
feature record + ADRs extracted
  ↓
archive spec
```

### 3. Routing

- Need behavior? → feature catalog
- Need WHY? → ADRs
- Need implementation? → feature contract

### 4. Index

Catalog manifest:

```json
{
  "feature": "command-palette",
  "behavior": "...",
  "adrs": ["ADR-012", "ADR-015"]
}
```

### 5. Duplication

behavior ≠ decision ≠ implementation — separation reduces document size.

### 6. Enforcement

Require: decision affecting architecture? → must create ADR.

### 7. Tradeoffs

**Pros**

- Scales well
- Clearer reasoning history
- Aligns with RFC → ADR models

**Cons**

- More files
- Higher cognitive overhead

---

## Option D — Behavior-First (BDD Owns Product)

Pushes hardest toward executable docs.

### 1. Layers

| Layer   | Owns                     |
| ------- | ------------------------ |
| Gherkin | product behavior         |
| Catalog | implementation contracts |
| Guides  | process                  |
| Specs   | temporary                |

### 2. Lifecycle

```txt
requirements
  ↓
tests
  ↓
behavior represented in Gherkin
  ↓
catalog stores implementation notes
```

### 3. Routing

- Need user-visible behavior? → read feature files first
- Need implementation? → read catalog

### 4. Index

Manifest points to both:

```json
{
  "feature": "command-palette",
  "behavior": ["assets/features/e2e/command_palette.feature"],
  "contract": "catalog/features/command-palette"
}
```

### 5. Duplication

Avoid prose duplication:

- **Bad:** README says Enter selects row AND design says Enter selects row
- **Good:** Gherkin owns selection semantics; catalog references it

### 6. Enforcement

Ship gate: behavior statements without feature coverage → **FAIL**.

### 7. Tradeoffs

**Pros**

- Strong agent alignment
- Behavior always executable
- Reduces prose drift

**Cons**

- Not all behavior fits Gherkin
- Implementation details still need a home

---

## Comparison

| Option               | Routing clarity | Migration cost | Agent friendly | Historical record | Scale     |
| -------------------- | --------------- | -------------- | -------------- | ----------------- | --------- |
| A Promotion Pipeline | High            | Medium         | High           | High              | High      |
| B Delete Specs       | Very high       | High           | Very high      | Low               | Medium    |
| C ADR Split          | Medium          | High           | Medium         | Very high         | Very high |
| D Behavior First     | High            | Medium         | High           | Medium            | High      |

---

## Recommended default (1–3 humans, many agents)

Use **Option A + a small amount of D**.

Specifically:

```txt
assets/specs/           temporary workspaces
assets/catalog/features/ shipped references
assets/features/e2e/     behavioral ownership
assets/guides/           process only
```

**Ownership**

| Concern                 | Owner   |
| ----------------------- | ------- |
| Behavior                | Gherkin |
| Implementation contract | Catalog |
| Process                 | Guides  |
| Onboarding              | README  |
| Temporary thinking      | Specs   |

**Why this fits agent-heavy workflows**

- Agents need deterministic routing
- Promotion creates explicit state transitions
- Permanent docs remain small
- Archaeology preserved
- No folder scanning

---

## Minimal migration sequence (no big bang)

### Step 1

Create catalog skeleton:

```txt
assets/catalog/
  manifest.json
  features/
```

Add `{ "features": [] }`. No content migration yet.

### Step 2

Change Definition of Done. Before SHIPPED:

- catalog record exists
- manifest updated
- spec references removed
- behavior linked to tests

Do this before moving old docs.

### Step 3

Migrate one feature only: `014-command-palette-filter-ux`.

Create:

```txt
catalog/features/command-palette-filter/
  behavior.md
  contract.md
```

Stub original spec. Observe agent behavior. Only then migrate remaining features.

---

## Suggested controlled vocabulary

Migration CSV:

| Column        | Purpose         | Values                                                      |
| ------------- | --------------- | ----------------------------------------------------------- |
| `status`      | lifecycle       | draft / active / shipped / superseded / archived            |
| `target`      | destination     | spec / catalog / guide / gherkin / adr / readme / delete    |
| `handle`      | action          | scratchpad / promote / merge / stub / keep / delete / index |
| `owner`       | normative owner | behavior / contract / process / onboarding                  |
| `routing`     | discoverability | default / explicit-only / archived                          |
| `supersedes`  | replacement     | slug list                                                   |
| `source_slug` | origin          | feature slug                                                |

Example:

```csv
slug,status,target,handle,owner,routing
014-command-palette-filter,shipped,catalog,promote,contract,default
014-command-palette-filter,shipped,spec,stub,none,explicit-only
```

---

## Closing note

The biggest change to your current approach:

**Stop asking whether shipped `design.md` should remain authoritative.**

Instead decide whether specs are **workspaces** or **references**. If they are workspaces, make promotion mandatory and optimize the system around that assumption.
