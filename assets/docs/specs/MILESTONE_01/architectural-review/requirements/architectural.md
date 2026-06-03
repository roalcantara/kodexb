<!-- markdownlint-disable-file -->
I'd like your help performing a critical architectural review of the project as we approach the v0.10.0 release.

The application is an Electrobun-based, keyboard-driven desktop app, and its design and implementation are guided by the principles documented in assets/guides.

My goal is not to justify previous decisions or validate existing assumptions, but rather to obtain an objective assessment of the current architecture, code organization, and long-term maintainability.

In particular, I would like you to evaluate:

- The overall project structure and directory organization.
- Whether the current boundaries between layers and modules are clear, cohesive, and sustainable.
- Whether responsibilities are assigned to the most appropriate layer.
- Whether the organization supports discoverability, reasoning, onboarding, and future growth.
- Whether the current structure reflects meaningful bounded contexts or if responsibilities are becoming blurred.

One area that deserves special attention is the separation between the Core and Shell layers.

We have intentionally tried to keep I/O concerns outside the Core. However, I am concerned that this principle may have been applied too aggressively in some areas, causing pure business logic, transformations, parsing, validation, normalization, or other deterministic behaviors to be implemented in the Shell simply because they are adjacent to I/O operations.

I would like you to evaluate whether:

- Logic currently living in the Shell could be moved into the Core without violating architectural principles.
- The current boundaries maximize clarity and maintainability.
- The Core contains the appropriate amount of business knowledge.
- The Shell is acting primarily as an orchestration layer rather than becoming a repository of domain behavior.

Another concern is the proliferation of types, constants, DTOs, schemas, and value definitions throughout the codebase.

Please identify cases where:

- Similar concepts are represented multiple times under different names.
- Equivalent structures are duplicated across layers.
- The same business concepts are redefined unnecessarily.
- Existing abstractions increase complexity rather than reduce it.

I am particularly interested in areas where these patterns could become future maintenance bottlenecks, increase cognitive load, or create change-amplification risks.

When performing the review, please prioritize pragmatism over theoretical purity. The goal is not to maximize architectural elegance, but to improve maintainability, developer productivity, clarity, and long-term sustainability.

For your output, I would like:

1. An executive summary of the current architecture.
2. Key strengths that should be preserved.
3. Architectural concerns, risks, and code smells.
4. Opportunities for simplification.
5. Opportunities for consolidation of concepts, types, and abstractions.
6. Recommendations ordered by priority and expected ROI.
7. A suggested refactoring roadmap distinguishing:
   - High-impact / low-effort improvements
   - High-impact / high-effort improvements
   - Nice-to-have improvements

As additional context, I am strongly influenced by the Ruby on Rails philosophy of convention, pragmatism, and developer productivity. I am not looking to replicate Rails, nor to abandon FCIS principles, but I am interested in understanding whether there are opportunities to introduce stronger conventions, reduce incidental complexity, and improve development velocity while preserving the architectural goals of the project.

Please challenge assumptions where appropriate. If a concern I raised is unfounded, say so. Likewise, if there are issues I have not identified, I would prefer they be surfaced explicitly.

The objective is to obtain an honest, evidence-based architectural assessment and a practical path forward.
