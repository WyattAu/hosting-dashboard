# AGENTS.md: hosting-dashboard agent contract

Derived from the WyattAu estate contract
([`engineering-standards`](https://github.com/WyattAu/engineering-standards),
AGENTS.md + OMNI-CORE invariants) and the specification/documentation
standard ([`spec-standards`](https://github.com/WyattAu/spec-standards),
SPEC-CORE). This file is the single contract; vendor files reference it,
never fork it (OMNI-CORE 11i).

## Where the truth lives

| Concern | File |
|---|---|
| Product behavior and scope | `README.md` |
| Implementation (Astro + SolidJS) | `src/` |
| Build + deploy config | `astro.config.mjs` |

## Decisions

Decisions that change behavior, semantics, or scope get an ADR in
`docs/adr/NNNN-*.md` (Status / Context / Decision / Consequences).
