Navigating documentation governance with an agentic workforce is fundamentally different from a human one. Humans can handle ambiguity, intuitively recognizing that an old spec folder is a "past state." Agents, however, flatten time—if they can search it, they treat it as active truth.

The core of your problem is that **in-flight specs are mutable scratchpads, but shipped specs are immutable "as-built" reference records.** When you keep them in the same bucket (or let permanent docs link to the scratchpad), agents suffer from temporal confusion.

Here are three governance architectures tailored for your context, followed by a concrete recommendation.

---

### Option 1: The As-Built Catalog (The RFC / Immutable Record Pattern)

*This model treats specs like RFCs. Once implemented, the spec is frozen, moved to an archive, and serves as the historical baseline for that feature.*

* **Document layers:**
* `assets/specs/in-flight/`: Active scratchpads. Mutable.
* `assets/specs/shipped/`: Immutable as-built records. Contains the finalized `design.md` and `requirements.md`.
* `assets/features/`: BDD Gherkin (Living product behavior).
* `assets/guides/`: Timeless process.


* **Lifecycle:** * *In-flight* → *Shipped*: At the Definition of Done, the feature folder is moved from `in-flight` to `shipped`. The `tasks.md` is deleted (agents don't need historical to-do lists).
* *Superseded*: If Feature B replaces Feature A, Feature A's folder is moved to `assets/specs/archived/`, and its manifest entry is updated.


* **Agent routing (`AGENTS.md`):** * "For process rules: read `assets/guides/`."
* "For existing feature logic: look up the feature in `assets/manifest.json`, read its BDD feature, and read its shipped design doc in `assets/specs/shipped/<slug>`."
* "For current work: only read `assets/specs/in-flight/<current-slug>`."


* **Index / catalog:** A single `assets/manifest.json` (or `CATALOG.md`) mapping feature domains to their `shipped` folder paths and current status (active, deprecated).
* **Duplication policy:** The shipped `design.md` owns the implementation contract. The BDD feature owns the product behavior. The README links *only* to the catalog/manifest, never to individual specs.
* **Enforcement:** * `ast-grep` rule: No markdown file outside `in-flight` may contain the string `assets/specs/in-flight/`.
* Ship gate: CI script verifies that if a branch is merging to `main`, the referenced in-flight folder has been moved.


* **Tradeoffs:** Very low token cost (agents only read the manifest, then target one folder). High human readability. *Drawback:* The shipped design doc might slowly drift from reality over months of minor bug fixes.

### Option 2: The Ephemeral Spec (The Docs-as-Code / Colocation Pattern)

*This model destroys the spec folder after shipping. The knowledge is distilled and "colocated" into the permanent system (BDD, ADRs, and Source Code).*

* **Document layers:**
* `assets/specs/`: Purely ephemeral scratchpads.
* `src//README.md` (or heavy TSDoc): Implementation contracts (util names, flat orders) live next to the code they govern.
* `assets/features/`: BDD Gherkin + Markdown tables for product matrices.
* `assets/docs/adrs/`: Architecture Decision Records for permanent architectural shifts.


* **Lifecycle:** * *In-flight* → *Shipped*: The agent's final task is "Distillation." Product rules go to BDD. Implementation details go to `src/` docs. Architectural changes go to an ADR. The spec folder is **deleted**.
* **Agent routing (`AGENTS.md`):** * "To understand existing implementation: read the `README.md` in the relevant `src/` directory."
* "To understand product behavior: read `assets/features/`."
* "Do not search `assets/specs/` unless explicitly instructed with a slug."


* **Index / catalog:** The file system itself. Agents use `ls` and `cat` on the `src/` tree or rely on your existing `library_manifest.json`.
* **Duplication policy:** Zero duplication. The spec ceases to exist, so it cannot conflict with permanent docs.
* **Enforcement:** CI gate ensuring `assets/specs/` is empty on the `main` branch (meaning all specs must be feature branches that are deleted/squashed, or explicitly ignored).
* **Tradeoffs:** Zero drift (docs live with code). *Drawback:* High cognitive load for the ship phase (distillation takes time and agent reasoning). Agents might struggle to find high-level implementation contracts if they are buried in `src/`.

### Option 3: The Two-Tiered Manual (The Arc42 / Subsystem Pattern)

*Specs are drafted, then merged into a central, living "System Manual" categorized by product capability and engineering subsystem.*

* **Document layers:**
* `assets/specs/`: In-flight only.
* `assets/docs/product-manual.md`: A living document of product behaviors (e.g., the keyboard matrix).
* `assets/docs/system-architecture/`: Markdown files categorized by subsystem (e.g., `state-management.md`, `search-index.md`).


* **Lifecycle:** * *In-flight* → *Shipped*: Relevant sections of `design.md` are copy-pasted into the `product-manual` and `system-architecture` files. The original spec folder is archived or deleted.
* **Agent routing (`AGENTS.md`):** * "For product rules (what it does): read `product-manual.md`."
* "For implementation contracts (how it works): read `system-architecture/<subsystem>.md`."


* **Index / catalog:** A Table of Contents at the top of the manual and architecture folders.
* **Duplication policy:** The manual and architecture docs are the *only* source of truth. BDD tests them; guides govern how to edit them.
* **Enforcement:** Lint rules blocking rogue links. Periodic agent summarization of the manuals to keep token counts down.
* **Tradeoffs:** Creates a beautiful, cohesive reading experience for humans and agents. *Drawback:* Prone to merge conflicts on `product-manual.md` if multiple features ship concurrently.

---

### Comparison to Known Patterns

| Architecture                    | Closest Industry Pattern       | Best For...                             | Agent Friendliness                                  |
| ------------------------------- | ------------------------------ | --------------------------------------- | --------------------------------------------------- |
| **Option 1: As-Built Catalog**  | RFC Archive / Service Catalog  | Historical traceability, fast shipping. | **High.** Manifests give agents precise targets.    |
| **Option 2: Ephemeral Spec**    | Docs-as-Code / Living Spec     | Strictly localized logic, zero drift.   | **Medium.** Agents must hunt through `src/`.        |
| **Option 3: Two-Tiered Manual** | Arc42 / Baseline Documentation | Holistic system understanding.          | **High.** Centralized context, but high token cost. |

---

### Recommendation: The "As-Built Catalog" (Option 1)

For a small team with heavily agentic workflows, **Option 1** is the most pragmatic. Asking agents to perfectly distill a spec into decentralized files (Option 2) often results in lost context. Agents excel when they can read a cohesive `design.md` that explains the *entire* context of how a feature was built.

By moving the folder from `in-flight` to `shipped` and registering it in a machine-readable JSON manifest, you give agents a highly specific, low-token search path without bloating your README or Guide folders.

#### The Minimal Migration Sequence (First 3 Steps)

Do not do a big bang. Start with governance, then migrate data.

1. **Establish the Boundaries (The Folders & The Rule):**
* Create `assets/specs/in-flight/` and `assets/specs/shipped/`.
* Update `ast-grep` rules to strictly forbid permanent docs (`AGENTS.md`, `README.md`, `guides/*`) from containing the string `assets/specs/in-flight/`.


2. **Create the Machine Index (`assets/features.json`):**
* Create a simple JSON registry.
* *Action:* Update `AGENTS.md` to state: *"To discover how a shipped feature works, read `assets/features.json` to find its path in `specs/shipped/`. Do not blind-search directories."*


3. **The "Move and Stub" Pilot (One Feature at a time):**
* Take your example: `014-command-palette-filter-ux`.
* Move it to `assets/specs/shipped/014-command-palette-filter-ux/`.
* Delete its `tasks.md` (it's noise now).
* Add it to `features.json`.
* Remove the broken links in the `README.md` and replace them with a single line: *"Feature implementation details are indexed in `assets/features.json`."*



#### Optional: Controlled Vocabulary for Migration

If you use a CSV or a script to manage the legacy 45 folders, use this vocabulary:

* **`Target` (Where it goes):** `shipped` | `archive` (for superseded features) | `dev-null` (for useless old scratchpads).
* **`Handle` (What the agent does with the content):**
* `promote`: Move `design.md` and `requirements.md` to target intact.
* `distill`: Extract specific tables/rules into BDD or a Guide, then discard the rest.
* `prune`: Delete `tasks.md` and transient notes before promoting.
* `stub`: Leave a `README.md` in the old location pointing to the new one (useful only temporarily during migration).



Which of these mental models—preserving the historical spec as a snapshot (Option 1), or dissolving it entirely into a living system (Option 2/3)—feels more aligned with how you want your agents to reason about the codebase on a day-to-day basis?
