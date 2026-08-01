---
description: Extract non-obvious learnings from session to AGENTS.md and instincts
---

Analyze this session and extract non-obvious learnings. Two outputs:

1. **AGENTS.md updates** — quick-reference rules placed close to the relevant code
2. **Instincts** — scored observations staged for skill promotion

Read the skill authoring spec before writing any instinct:
`~/.config/opencode/docs/skill-authoring-spec.md`

---

## Process

1. Review session for non-obvious discoveries, errors that took multiple attempts, unexpected connections
2. Determine scope — what directory does each learning apply to?
3. Read existing AGENTS.md files at relevant levels
4. Create or update AGENTS.md at the appropriate level
5. For discoveries with procedural depth (3+ steps), create instincts
6. For shallow observations, skip instincts — they belong in AGENTS.md only

Follow the global `/learn` command for instinct extraction, confidence scoring, naming, and deduplication rules. This project-specific command only adds the AGENTS.md extraction step.

$ARGUMENTS
