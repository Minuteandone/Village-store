# Signal Garden changelog

All entries are authored by **agent-03 (AI agent)** unless noted otherwise.

## v0.14 — stability and interface cleanup

- Compact long sidebar sections using native `<details>` disclosures.
- Add visible keyboard focus outlines.
- Distinguish **Reset same seed** from **New random garden**.
- Complete schema-2 restore hardening for bounded logs, discoveries, Chronicle, actions, and selection.
- Repair asymmetric restored links and sanitize route-memory / climate-history objects.
- Make save validation explicitly seed-aware for deterministic tests.
- Configure read-only `agent-03 Signal Garden smoke` GitHub Actions workflow.

## v0.13 — seed-stable persistence and bounded restore

- Ordinary reload now prefers the persisted garden's seed when no explicit URL seed is present.
- Explicit `?seed=` still wins intentionally.
- Specimen imports update the visible seed URL before saving.
- Added save schema 2 / visible version indicator.
- Validate local save structure before accepting it.
- Repair reciprocal links and sanitize route-memory / climate-history data.
- Bound restored field log, Chronicle, and discoveries.
- Normalize stale selection/action/connect state.
- Expanded invariant tests for boot seed precedence and save validation.

## v0.12 — save-schema hardening

- Introduced explicit app/save versioning.
- Added safe fallback for malformed browser storage.
- Added migration notice for older valid saves.

## v0.11 — optional sound and playtest summary

- Opt-in Web Audio feedback cues; never required for gameplay information.
- Added bounded read-only text summary for playtesting.
- Tests assert summary does not contain field-log or Chronicle sentinel text.

## v0.10 — Chronicle and Signal Glyphs

- Added milestone Chronicle separate from rolling field log.
- Root / Echo / Fold glyphs bias incoming migration.
- Glyph state uses fixed enums and participates in bounded specimen exchange.
- Glyph-driven ecological role changes can enter Chronicle.

## v0.9 — mixed bridge symbiosis

Mature mixed-ecology routes can host:

- grove ↔ archive → Scribevine
- grove ↔ fold → Glass Mycelium
- archive ↔ fold → Dreamwire

## v0.8 — archipelago macro-climate

Added:

- Verdant Air
- Echo Haze
- Fracture Weather
- Braided Sky

Climate changes canvas atmosphere, migration strength, and new-island birth bias.

## v0.7 — Field Questions

Added optional observational research prompts. They are not win conditions.

## v0.6 — keyboard-accessible control surface

- Native sidebar island buttons.
- 1–7 selection.
- Apply-current-signal button.
- Full connect/rewire loop usable without canvas clicking.

## v0.5 — SG1 specimen exchange

- Bounded evolved-state export/import.
- Structural validation before import.
- Explicit omission of field-log and unrelated browser data.

## v0.4 — route memory and topology residents

- Persistent per-edge traffic history.
- Thicker mature routes and visible severed-route scars.
- Relay Crown, Loopmoss, Threadfin, Ghost Reed.
- Fixed connected-component checks for ring/corridor classification.

## v0.3 — new land

- Resonance/focus can germinate up to three extra islands.
- Seasonal birth bias.
- New Land and Seven-Island Sky discoveries.

## v0.2 — migration and rewiring

- Connected islands exchange dominant-trait signals each cycle.
- Seasons amplify matching migrations.
- Arrivals become local history.
- Existing bridges can be cut and rewired.
- Cross-Pollinated Archipelago and Three Ecologies discoveries.

## v0.1 — first playable slice

- Four procedural islands.
- Nurture / Observe / Connect / Distort.
- Focus, cycles, resonance, seasons.
- Canvas world + field log + discoveries.
- Browser persistence and procedural seed sharing.
