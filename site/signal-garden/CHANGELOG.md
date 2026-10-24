# Changelog

## v0.61 — Pair Reciprocity Inspector

- Adds an accessible partner selector to the selected-island panel, with read-only last-pulse and next-cycle traffic for exactly one island pair.
- Distinguishes mutual, one-way and quiet pairs, plus new, ended, steady, retuned, reversed, and mutual/one-way transitions.
- Partner choice is session-only and never written to saves or specimen codes; imported names render with textContent and escaped option labels. Save schema stays 7.
- Ten pure-module tests, canonical invariants, source parity, and real Chromium passed on candidate `7d9a892ba451ded7b8c0ab89595292009642df22`. Exact-source canonical simulation, deployed Chromium and Pages passed on `c8292c14c3de001bf7fae736debdcb8ddd36c827`. Shared mirroring follows release verification.

## v0.60 — Reciprocity Momentum

- Adds a read-only comparison of the last completed migration pulse against the next-cycle reciprocity forecast.
- Distinguishes new, ended, steady, retuned, reversed, and mutual/one-way transitions. Shows a clear no-prior-pulse state on a fresh visit.
- Uses textContent for imported names; simulation, saves, and schema 7 remain unchanged.
- Eleven pure-module regression tests, candidate Chromium, and exact-source canonical simulation, deployed Chromium, persistence and Pages verification passed on `ee5c0c99b7fa8878a0e027293c1a12f2a5553f11`.

## v0.59 — Network Reciprocity Atlas

- Adds a read-only archipelago-wide next-cycle atlas of mutual and one-way forecast pairs, signal families, and quiet islands.
- Uses the existing destination-first radar and textContent for imported names; save schema remains 7 and simulation rules are unchanged.
- Adds eight pure-module tests plus invariant, candidate Chromium and source-parity coverage. Exact-source canonical simulation, deployed Chromium browser, persistence and Pages checks passed on `db96a4279e876ef7fc7c70def5eb2cc6b033f4f2`.


## v0.58 — Route Reciprocity Lens

- Adds a read-only selected-island next-cycle view of mutual and one-way traffic between forecast partners, with signal-family details and quiet states.
- Uses the existing destination-first radar; no changes to routes, simulation rules or save schema 7. Imported names render as plain text.
- Includes eight pure-module tests, canonical invariants and real Chromium coverage. Feature branch candidate verification passed.
- Exact-source canonical simulation, deployed Chromium browser, persistence and Pages checks passed on `fbb23c221451fae41567091476b7d44a30a484ad`.

## v0.57 — Island Flow Compass

- Adds a read-only selected-island signal-flow compass beside arrival and dispatch briefs.
- Classifies an island as relay, receiver, sender, or quiet; shows net traffic and per-family incoming/outgoing counts from the existing radar.
- Uses `textContent` for imported names. Save schema remains 7 and simulation rules are unchanged.
- Exact-source canonical simulation, deployed Chromium browser, persistence and Pages checks passed on `fdff9ccff7934ce45151b7d958cb3cced1315b61`.

## v0.56 — Island Dispatch Brief

- Adds a read-only selected-island next-cycle outgoing dispatch beside the incoming outlook.
- Shows each planned export's destination and signal family, including quiet/unselected states.
- Derives departures from the same validated incoming radar; imported names use textContent, not HTML.
- Adds pure-module, canonical invariant and real-browser candidate coverage. Save schema remains 7; no simulation-rule change.
- Exact-source canonical simulation, deployed Chromium browser, persistence and Pages checks passed on `aa4cbab6cc83eaba5bb115b806cf22d4a3bda309`.

## v0.55 — Island Arrival Brief

- Adds a read-only, selected-island next-cycle outlook to the island card, derived from the existing destination-first radar.
- Names the selected island's planned source islands and signal families; shows quiet islands and convergence/mixed-family indicators.
- Uses textContent for imported names, avoiding HTML injection, and does not create an additional live announcement.
- Includes pure-module, canonical invariant and real-Chromium candidate tests. Save schema remains 7.
- Exact-source canonical simulation, deployed Chromium browser, persistence and Pages checks passed on `5121e494e2e3a74e94f97388af6e41a081833ac4`.

## v0.54 — Arrival Spotlight

- Adds a read-only forecast spotlight naming busiest incoming destinations, tied leaders, leading signal families, and quiet destinations.
- Uses existing next-cycle radar rows; escapes imported names and preserves island/family order on ties.
- Adds pure-module, canonical invariant, and real-browser assertions. Save schema stays 7.
- Exact-source canonical invariant, deployed Chromium browser, persistence and Pages checks passed on `1f9887227bc8aeeeda9ebb9fc8384138ad6bf380`.

## v0.53 — Signal Chorus

- Adds an accessible next-cycle signal-family composition summary to Incoming Signal Radar.
- Counts life, memory and strange arrivals, convergent destinations, and mixed-family destinations using the existing read-only forecast.
- Adds pure-module, canonical invariant and Chromium assertions; no save-schema or simulation-rule change (schema 7).
- Canonical invariant, deployed Chromium browser, persistence and Pages checks passed on exact game/test head `0b850e6ca4275f80efdd8dd0587977a46d92f829`.


## v0.52 — Incoming Signal Radar

- Adds a destination-first next-cycle arrival forecast alongside planned exports.
- Lists islands with no arrivals; identifies multi-source convergence and mixed signal families.
- Escapes imported island names and wraps long labels for narrow mobile layouts.
- Reuses the existing deterministic forecast without changing simulation behavior or save schema (still 7).
- Adds canonical invariant and Chromium coverage for empty, linked, and convergent forecasts.
- Release rule: verify exact game/test source with simulation invariants, real-browser checks, and Pages before mirroring.


## v0.51 — Next-cycle forecast

- Added a collapsible **Next cycle forecast** to the Actions surface.
- Forecasts the next cycle number and seasonal mode.
- Forecasts focus after the ordinary +3 restoration, capped at 8.
- Lists planned outgoing migration source / destination / signal type using next-cycle routing and Palimpsest export rotation.
- Exposes the current macro-climate, whole-network constellation, and current junction ecologies relevant to the upcoming pulse.
- The forecast is deliberately partial: it does not claim downstream receiving-state, bond-transition, climate-shift, phenomenon, or role-succession outcomes before the cycle actually runs.
- `cycleForecast()` is pure: invariant coverage proves it does not mutate serialized world state.
- Real Chrome coverage opens the forecast disclosure and verifies visible forecast progression.
- No save-schema change.
- Canonical invariant verification, browser smoke, and Pages deployment passed on the exact v0.51 game/test head `542d170e23edf879d6cb594628c5ac26238c29bf`.


## v0.50 — Minimum mobile target sizes

- Added a shared 24 × 24 CSS-pixel minimum for buttons, quick-nav links, and disclosure summaries.
- Uses border-box sizing so the minimum applies to the actual rendered target box.
- No save-schema or simulation-rule changes.
- Invariant coverage requires the explicit shared target-size rule.
- Real Chrome at 320 px enumerates every visible control in those target families and verifies none render below 24 × 24.
- Canonical invariants, Pages deployment, and browser smoke passed on the exact v0.50 head.


## v0.49 — High-contrast current location

- Added an explicit system `Highlight` outline for the quick-nav link carrying `aria-current="location"` under forced-colors mode.
- Preserves current-section visibility when custom border/background colors are remapped.
- Normal-color current-location styling remains unchanged.
- No save-schema or simulation-rule changes.
- Invariant coverage requires the forced-colors current-location rule.
- Real Chrome with forced colors emulated verifies the current Actions link retains a solid ≥2 px outline after focus moves to the destination.
- Canonical invariants, Pages, and browser smoke passed on the exact v0.49 head.


## v0.48 — Current-fragment semantics

- Added `aria-current="location"` to the quick-nav link matching the current URL fragment.
- Added a visual current-location state for the matching quick-nav link.
- Current state is derived from native `location.hash` and updates on `hashchange`.
- Browser Back/Forward therefore restores the correct semantic quick-nav state without custom routing.
- No-hash pages leave all quick-nav items non-current.
- Upgraded the invariant fake-browser harness to model window hashchange listeners and six quick-nav links.
- Real Chrome verifies keyboard Actions, Research, small-phone Specimen, and browser Back current-location states.
- No save-schema or simulation-rule changes.
- Canonical invariant and browser verification passed on the exact v0.48 head.


## v0.47 — Visible fragment focus

- Added explicit `:focus-visible` styling to all six quick-navigation fragment destinations.
- Keyboard navigation now makes the focused Map / Actions / Island / Research / History / Specimen section visibly obvious after native fragment focus transfer.
- Uses a 2 px cyan outline with 4 px offset.
- Mouse/touch jumps are not forced to show the keyboard-only ring.
- No save-schema or simulation-rule changes.
- Invariant coverage verifies all six destinations participate in the focus-visible rule.
- Real Chrome coverage activates Actions with Enter and verifies the focused destination renders the expected outline.
- Canonical invariant, Pages, and browser verification passed on the exact v0.47 head.


## v0.46 — Narrow-phone fragment navigation

- Increased mobile fragment-target scroll clearance.
- At ≤360 px, quick navigation switches to a deterministic 3×2 grid.
- Prevents the six jump links from wrapping into an unpredictable third sticky row.
- Native fragment history/focus behavior remains intact.
- No save-schema or simulation-rule changes.
- Invariant coverage checks expanded mobile scroll margin and the narrow-phone grid rule.
- Real Chrome at 320×568 verifies no horizontal overflow, exactly two quick-nav rows, sticky behavior, rendered-nav clearance, visible landing, and native focus transfer.
- Canonical invariants, Pages deployment, and browser smoke passed on the exact v0.46 head.


## v0.45 — Two-row mobile HUD

- Bounded the compact mobile HUD to exactly two rows.
- Uses a six-column grid at narrow widths.
- Cycle / Focus / Resonance form the first row; Climate / Phenomenon form the second.
- Long labels stay single-line and ellipsize rather than creating extra HUD rows.
- No visible-status set change from v0.44.
- No save-schema or simulation-rule changes.
- Structural tests guard the grid/span contract.
- Real Chrome coverage verifies exactly two HUD rows on the mobile viewport.
- The v0.45 game code is green in invariants and deployed Chrome.


## v0.44 — Compact mobile HUD

- Constrained the map HUD between explicit left/right canvas margins.
- Narrow layouts keep only Cycle / Focus / Resonance / Climate / Phenomenon visible over the map.
- Transit, route memory, bonds, junctions, constellation, provenance, research, motion, contrast, and version chips become mobile-only hidden secondary HUD items.
- Hidden mobile HUD values remain available in sidebar/textual world surfaces.
- Desktop retains the complete HUD.
- No save-schema or simulation-rule changes.
- Invariant coverage checks mobile/essential chip classification and HUD containment rules.
- Real Chrome coverage at 390 px proves secondary chips are hidden, essential chips stay visible, and the HUD remains inside the canvas.
- Canonical invariants, Pages deployment, and browser exercise are green for the exact v0.44 artifact.


## v0.43 — Mobile section navigation

- Added a compact Map / Actions / Island / Research / History / Specimen jump bar.
- The jump bar becomes sticky on narrow/mobile layouts.
- Added stable fragment targets with scroll margin so sticky navigation does not cover headings.
- Native fragment navigation/history behavior is preserved.
- Quick-nav clicks reveal collapsed details targets before the native jump.
- History remains collapsed by default but opens automatically when reached through the jump bar.
- No save-schema or simulation-rule changes.
- Invariant coverage checks links, targets, sticky CSS, scroll margins, and details reveal logic.
- Real Chrome coverage verifies sticky mobile behavior, Research landing, and collapsed-to-open History navigation.
- Canonical invariants, Pages deployment, and browser smoke are green for the exact v0.43 head.


## v0.42 — Input semantics

- Added `aria-keyshortcuts` metadata for Nurture / Observe / Connect / Distort / Undo / Apply.
- Dynamic island navigator controls now advertise shortcuts 1–7.
- Added explicit canvas `touch-action: pan-y pinch-zoom` so touch scrolling/zoom policy is not implicit.
- Existing keyboard and simulation behavior is unchanged.
- No save-schema bump.
- Invariant coverage checks static shortcut metadata, dynamic navigator metadata, and touch policy.
- Real Chrome coverage verifies deployed shortcut attributes and computed touch-action behavior on the mobile test viewport.
- The deployed v0.42 feature head passed browser smoke; the corrected final invariant harness is green.


## v0.41 — Session-only Undo

- Added one reversible in-session checkpoint for meaningful world mutations.
- Undo covers signals, completed bridge changes, glyph changes, cycle advance, germination, specimen import, same-seed reset, and new-random-garden replacement.
- Free selection, signal-mode changes, previews, sound toggles, and free Connect source planning/cancellation do not consume the checkpoint.
- Undo restores world state, seed URL, and Last Cycle Report, and clears transient migration motes.
- Undo history is not serialized to localStorage and is never exported in SG1 specimens.
- Reloading preserves the world but clears Undo availability.
- Added Undo button/status plus global U shortcut outside native controls.
- No save-schema bump.
- Invariant coverage verifies representative mutations, single-use behavior, free Connect semantics, import restoration, and destructive-action checkpoint guards.
- Real Chrome coverage proves exact pre-Nurture life/focus restoration and session-only checkpoint clearing on reload.
- Canonical invariants, Pages deployment, and browser smoke are green for the verified v0.41 head.


## v0.40 — Pointer-path cleanup

- Removed unused pointer-position state from the canvas renderer.
- Removed the dead `mousemove` listener that updated that state on every mouse move.
- Canvas clicks now pass client coordinates directly into the hit-test path.
- Hit testing performs one canvas geometry read per click.
- Replaced `Math.hypot` with squared-distance comparison to avoid an unnecessary square root.
- No schema bump and no simulation-rule changes.
- Invariant coverage rejects dead pointer tracking, repeated click geometry reads, and square-root hit testing.
- Real Chrome coverage performs actual canvas clicks and proves zero-focus Connect arming/cancellation semantics are unchanged.
- Canonical invariants, Pages deployment, and Chrome smoke are green for the verified v0.40 head.


## v0.39 — Adaptive canvas budget

- Pause canvas frame scheduling while the visual map is fully outside the viewport.
- Resume immediately with the latest world state when the canvas re-enters view.
- Under reduced-motion, refresh a visible canvas on a 250 ms cadence instead of continuously repainting a frozen animation clock.
- Clear stale reduced-motion timers when the system motion preference changes.
- Standard-motion visible rendering remains animation-frame driven.
- No schema bump and no simulation-rule changes.
- Invariant coverage guards the IntersectionObserver branch, offscreen early return, reduced-motion timer, adaptive startup path, and scheduler handoff.
- Fixed two latent invariant-harness bugs exposed by the new scheduler: the draw-body source slice previously targeted an earlier UI loop, and the test API injector previously matched an internal motion callback instead of the IIFE startup tail.
- Deployed Chrome coverage proves the bitmap stops changing offscreen, ignores offscreen selection changes visually, and renders the latest state after returning onscreen.
- Canonical invariants, Pages deployment, and real Chrome smoke are green.


## v0.38 — Renderer derivation cache

- Compute route bonds once per canvas frame and reuse a key-indexed lookup for active/severed route rendering.
- Compute junction ecologies once per frame from the precomputed bond snapshot and reuse an island-indexed lookup.
- Compute topology species once per frame and reuse Relay Crown / bridge-symbiosis subsets.
- Removed repeated per-island `topologySpecies()` and `junctionEcologies()` derivation from the animation hot path.
- Removed repeated per-route `bondForEdgeKey()` work where the frame bond snapshot already contains the answer.
- `junctionEcologies` now optionally accepts a precomputed bond list while preserving existing behavior for all other callers.
- Fixed the static fallback version-chip text so no-script/pre-render markup no longer showed stale v0.36.
- No schema bump and no simulation-rule changes.
- Invariant coverage guards the frame-snapshot contract and rejects regression to per-island graph recomputation.
- Full invariants, Pages deployment, and exact-artifact Chrome smoke passed for the v0.38 implementation.


## v0.36 — Concise live feedback

- Added one atomic visually-hidden latest-action status for concise action announcements.
- The full rolling Field log remains visible/inspectable but is no longer an aria-live region.
- Suggested next move remains visible guidance but is no longer an aria-live region.
- Mode, selection, and specimen statuses remain live because they correspond directly to visitor intent.
- No schema bump.
- Invariant coverage verifies only the latest log message is copied into the atomic action status.
- Deployed Chrome coverage verifies the noisy surfaces are non-live and that a real Nurture action announces concise feedback.


## v0.37 — State-aware Research Hints

- Research Compass now includes a live **Experiment hint** for the first open Field Question.
- Every open Field Question now exposes its own state-aware hint.
- Hints react to current resources, topology, arrivals, climate streak, ancestry, role history, route history, mature bond families, network density, and transplant status.
- New Land guidance shows live resonance/focus progress rather than generic resource advice.
- Suggested next move reuses the same Research Hint model after onboarding.
- Hints remain suggestive rather than automating actions or exposing hidden implementation-only data.
- No schema bump: all hinting is derived from existing game state.
- Invariant coverage checks fresh hints, compass advancement, climate progress, lineage readiness, and transplant-aware guidance.
- Deployed Chrome coverage proves the compass hint changes after a real Nurture action.
- Canonical browser smoke now requires the exact deployed `index.html` fingerprint before running Chrome.

## v0.36 — Concise live-region feedback

- Removed `aria-live` from the full Suggested next move panel.
- Removed `aria-live` from the rolling Field log.
- Added one dedicated atomic `actionStatus` live region for the latest concise action message.
- Full guide/log content remains inspectable without being re-announced on every render.
- No schema bump.
- Invariant coverage verifies the single concise action live region and quiet long-form surfaces.
- Deployed Chrome coverage verifies Nurture produces one concise live announcement.


## v0.35 — Research Compass

- Split the fourteen Field Questions into visible open questions and a collapsed observed archive.
- Added a Research Compass pointing to the first still-open question in the existing research sequence.
- Field Questions summary now reports the current open count.
- Observed archive summary reports the completed count.
- Completed questions leave the open list immediately rather than retaining equal visual weight.
- Post-onboarding Suggested next move now references the same compass model.
- No schema bump: the hierarchy is fully derived from existing research state.
- Invariant coverage proves fresh 14/0 state and archive/compass advancement after New Land becomes observed.
- Deployed Chrome smoke verifies the fresh Research Compass/count/archive surfaces.


## v0.34 — Resource-aware starter guidance

- Suggested next move now respects focus affordability.
- Zero-focus unlinked gardens recommend recovering focus instead of claiming the first bridge is immediately completable.
- Linked cycle-1 gardens still recommend the first migration cycle because that action also restores focus.
- Evolved zero-focus gardens recommend focus recovery before spending actions.
- Resonance-ready four-island gardens with only 1 focus recommend restoring germination focus instead of claiming germination is ready.
- Updated starter text to explain Connect's free source-planning step and 1-focus completion cost.
- No schema bump.
- Added invariant cases for each affordability branch.
- Deployed Chrome smoke verifies the guide switches to Recover focus after real UI actions exhaust focus.


## v0.33 — Primary action affordability

- Added an explicit cost note for Nurture / Observe / Distort / Connect.
- Nurture, Observe, and Distort require 1 focus and disable Apply when focus is exhausted.
- Connect source arming is free.
- Connect source cancellation is free.
- Completing or rewiring a connection requires 1 focus.
- Zero-focus Connect completion stays blocked while preserving the armed source.
- Apply button text explains arm / cancel / spend / missing-focus states.
- Mode status reports affordability and the special Connect planning semantics.
- Keyboard/canvas action paths use the same underlying state machine.
- No schema bump.
- Invariant coverage proves zero-focus no-mutation, free Connect planning/cancellation, blocked completion, and focus preservation.
- Deployed Chrome coverage exhausts focus through real UI actions and verifies the same states.
- Browser smoke startup was hardened against slow Chrome DevTools initialization without relaxing gameplay assertions.


## v0.32 — Resource-gated action explanations

- Germination now exposes a nearby status explaining exactly which resources are missing.
- Germination reports a distinct full-capacity state once all seven stable sites are occupied.
- Root / Echo / Fold and Clear glyph controls now expose their different costs explicitly.
- Glyph status distinguishes no selection, insufficient focus, insufficient resonance, available changes, and already-selected no-op states.
- Selected/no-op glyph actions are disabled rather than allowing accidental resource use.
- Relevant controls reference the explanatory status text.
- No schema bump: this is interface/usability state only.
- Canonical invariants, Pages deployment, and deployed Chrome smoke passed for the v0.32 head.


## v0.31 — Forced-colors / high-contrast support

- Added a visible **Contrast · custom / forced** HUD indicator.
- Observe `forced-colors: active` through `matchMedia`, including live preference changes.
- Remove decorative shadows/backdrop blur in forced-colors mode.
- Preserve active/selected signal, island, and glyph states with explicit system **Highlight** outlines.
- Use system colors for disabled controls, meters, canvas border, and links.
- No schema bump: this is interface/accessibility state only.
- Added source guards for the forced-colors contract.
- Extended deployed Chrome smoke to emulate forced colors and reduced motion together, verify the HUD state, confirm shadows are removed, and confirm active controls retain an explicit outline.


## v0.30 — Text Map topology equivalent

- Added a labelled **Text map** region as a nonvisual equivalent of the canvas topology.
- Added one whole-network summary for constellation and junction context.
- Added one readable entry per island with current role, lineage/Palimpsest/junction context, isolation state, live neighbors, route bond identity, and route-memory count.
- Updated canvas screen-reader guidance to point explicitly to the Text Map.
- Text Map state is derived and not persisted; no schema bump.
- Intentionally avoided an ARIA live region to prevent large repeated announcements.
- Added invariant coverage for island count, isolation, neighbor naming, mature bond identity, and route memory.
- Extended deployed Chrome smoke to prove the Text Map starts isolated, updates after a real bridge, and exposes route memory after migration.


## v0.29 — Reduced-motion rendering

- Expanded system reduced-motion support across the animated canvas.
- Freezes the decorative canvas animation clock while reduced motion is active.
- Migration motes collapse to an effectively instantaneous duration.
- Removes button transition/hover movement under the media preference.
- Responds to live `prefers-reduced-motion` changes when supported.
- Added a **Motion · reduced / standard** HUD chip.
- No save-schema bump.
- Added source invariants for the motion-query/render branches.
- Deployed Chrome smoke now emulates reduced motion, confirms the HUD mode, requires temporally separated canvas snapshots to be identical, and continues exercising gameplay.

## v0.28 — Accessible mode state and Escape cancellation

- Signal-mode buttons now expose `aria-pressed`.
- Glyph buttons now expose `aria-pressed`.
- Added a polite mode-status line.
- Pending Connect source state is announced explicitly.
- Escape cancels a pending Connect source without spending focus.
- Connect remains selected after cancellation so the visitor can immediately choose another source.
- No save-schema bump.
- Added source invariants and deployed Chrome coverage for pressed state, pending-source messaging, Escape cancellation, focus preservation, reconnection, and glyph state.


## v0.29 — Full reduced-motion canvas

- Added a visible **Motion · standard / reduced** HUD indicator.
- Observe `prefers-reduced-motion: reduce` through `matchMedia`, including live preference changes.
- Freeze the canvas animation clock under reduced motion.
- Star twinkle, Storm scan lines, island pulse/wobble, strange-island drift, selection/connect rings, and time-driven phenomenon visuals become static.
- Suppress button hover movement and transitions under reduced motion.
- Simulation actions, cycle progression, and all gameplay remain functional.
- No schema bump: this is rendering/accessibility state, not garden phenotype.
- Added source guards for the reduced-motion rendering contract.
- Extended deployed Chrome smoke to emulate reduced motion, require the HUD acknowledgment, and compare two canvas data URLs over time for exact visual stability.

## v0.28 — Explicit mode state and connection cancellation

- Signal-mode buttons now expose live `aria-pressed` state.
- Added a polite mode-status region that announces the active signal mode.
- Pending Connect state announces its source island and destination instruction.
- **Escape** cancels a pending connection source without spending resources or altering topology.
- Glyph toggle state remains explicitly exposed through pressed-state semantics.
- No schema bump: these are interaction/accessibility changes.
- Added invariant guards for pressed state and Escape semantics.
- Extended browser coverage for the real interaction path.


## v0.27 — Skip navigation and accessible map semantics

- Added a first-focus **Skip to controls** link.
- Added a labelled, programmatically focusable controls landmark.
- The canvas now identifies itself as a visual map and points to screen-reader guidance for equivalent keyboard controls.
- Selected-island name/lore now uses one polite live status region.
- Added visible focus styling for the skip link.
- No schema bump: accessibility changes are interface-only.
- Added source invariants for skip-link/landmark/canvas/live-region markup.
- Extended deployed Chrome smoke to prove real Tab → Enter skip navigation, canvas semantics, and selected-island announcements.


## v0.26 — Specimen preview gate

- Added an explicit **Preview pasted** step before specimen import.
- Import begins disabled and is enabled only for the exact SG1 text that most recently passed bounded validation.
- Preview exposes incoming seed, cycle, season, island count, live routes, focus, resonance, and resulting transplant hop.
- Any textarea edit invalidates the preview immediately and disables import.
- Generated local specimens are automatically previewed.
- Invalid previews leave the current garden unchanged and report errors inline.
- No save-schema or SG1-format bump: preview approval is ephemeral UI state.
- Added source regressions for preview surfaces and exact-code gating.
- Extended deployed Chrome smoke to prove edit invalidation, re-preview, and successful import after revalidation.


## v0.26 — Preview-gated specimen import

- Import now begins disabled until the exact SG1 text has been successfully previewed.
- Added **Preview pasted** and an inline decoded specimen summary.
- Preview exposes seed, cycle, season, island count, live routes, focus, resonance, and incoming transplant-hop number.
- Any dock edit invalidates the preview and disables Import again.
- Invalid/unsupported specimen text never replaces the garden and reports its validation error inline.
- Generated current-world specimens are automatically previewed.
- Successful import requires a new preview before any further import.
- No save-schema bump: preview state is interface-only.
- Added invariant regression guards for preview markup/import gating.
- Extended deployed Chrome smoke to prove initial disablement, edit invalidation, re-preview, and successful import.


## v0.25 — Specimen Dock

- Replaced prompt-based specimen import with a real pasteable SG1 textarea.
- Added **Generate + copy**, **Import pasted**, and **Clear dock** controls.
- Clipboard failure leaves the generated code available for manual copying.
- Import validation errors are shown inline through an `aria-live` status message instead of alert dialogs.
- The existing SG1 privacy/bounds model is unchanged.
- No save-schema bump: the dock is interface state only.
- Added regression coverage preventing the old prompt importer from returning.
- Extended deployed Chrome smoke to generate an SG1 specimen, import it from the dock, and confirm transplant provenance increments.


## v0.24 — First-visit trail and UI declutter

- Added a derived **Suggested next move** panel for first-time orientation.
- Starter progression covers selection, bridge creation, first migration cycle, resonance building, germination, and handoff to Field Questions.
- No new persisted tutorial state or schema bump.
- Collapsed advanced ecology panels by default to reduce mobile/sidebar overload.
- Kept Last Cycle Report and Field Questions prominent.
- Added invariant coverage for every starter-guide stage.
- Extended the real Chrome smoke to require starter guidance on the deployed page and verify that it advances after bridge creation.
- Canonical browser verification now polls for the exact deployed version/schema before exercising the live page.


## v0.23 — Transplant provenance

- Added a bounded world-level SG1 transplant-hop count, capped at 99.
- A local garden starts at hop 0; each specimen import increments provenance by one.
- Older SG1 specimens without provenance remain valid and import as hop 1.
- Added a visible HUD provenance marker and dedicated provenance panel.
- Copyable summaries now distinguish local from transplanted gardens.
- No visitor identity, browser identifier, source URL, field-log prose, or Chronicle prose is transferred.
- Added **Transplant Bloom**, unlocked only when a transplanted garden germinates genuinely new land after import.
- Added a fourteenth optional Field Question for post-import germination.
- Save schema advanced to 7.
- Added invariant coverage for hop round-trip, increment-on-import, legacy SG1 compatibility, and post-import Transplant Bloom behavior.
- The feature responds to independent agent-04 source-review feedback about making specimen exchange visibly ecological.


## v0.22 — Network constellations

- Added derived whole-network states based on the connected active graph.
- Added **Star Crown**, **Halo Circuit**, **Living Arbor**, and **Mesh Choir**.
- Disconnected active components never qualify as a whole-network constellation.
- Star Crown amplifies its hub's current dominant trait.
- Halo Circuit adds memory to every active island.
- Living Arbor adds life to each leaf.
- Mesh Choir adds one garden resonance.
- Constellation effects occur before climate recording, making graph shape causally relevant to macro-climate.
- Added HUD/sidebar/summary/Last Cycle Report constellation surfaces.
- Added a thirteenth optional Field Question for creating Mesh Choir.
- No schema bump: constellation state is derived from topology.
- Added invariant coverage for all four classifications, disconnected rejection, bounded effects, research completion, and causal report inclusion.


## v0.21 — Junction ecologies

- Added derived ecologies where multiple mature route bonds meet at one island.
- Added **Scribe Orchard**, **Prism Nursery**, **Dream Estuary**, **Confluence Knot**, and **Triune Loom**.
- Junction ecologies apply small bounded trait pulses once per autonomous cycle.
- Junction effects occur before climate recording, so relationship structure can causally alter macro-climate and later role succession.
- Added a dedicated Junction ecologies panel, HUD count, summary output, canvas marker, and Last Cycle Report section.
- Added a twelfth optional Field Question for forming a Triune Loom.
- No save-schema bump: junctions are derived from active topology + typed bond history.
- Added invariant coverage for all junction classifications, Triune Loom trait effects, research completion, and causal cycle-report inclusion.


## v0.20 — Typed route bonds

- Added bounded life / memory / strangeness crossing counters per route.
- Old scalar route memory is preserved without inventing typed historical composition.
- Added four derived relationship identities: **Rootway**, **Echo Span**, **Fold Thread**, and **Braided Bond**.
- Matching specialized bonds add +1 migration strength; Braided Bond adds +1 to every signal family.
- Bonds can mature, transition, or lose coherence as cumulative crossing history changes.
- Bond changes enter the Chronicle and named bonds are exposed in a dedicated Route bonds panel.
- Active and severed route rendering now reflects bond identity.
- Added an eleventh optional Field Question for creating a Braided Bond.
- SG1 specimen exchange now preserves bounded typed route-signal history.
- Save schema advanced to 6; old saves start typed route history at zero.
- Added invariant coverage for all bond classifications, refusal to infer bonds from legacy scalar traffic, matching-bond bonuses, bond maturation and transitions, Chronicle entries, Field Question completion, and specimen round-trip behavior.


## v0.19 — Role succession and Palimpsest Minds

- Islands now retain the ecological roles they have genuinely occupied over time.
- Added grove/archive/fold succession history per island.
- An island that has lived through all three roles becomes a Palimpsest Mind.
- Palimpsest Minds rotate outgoing migration type deterministically through remembered selves.
- Last Cycle Report labels transfers exported by a Palimpsest Mind.
- Added a tenth optional Field Question for achieving full role succession.
- Added visible role-history state to the selected-island panel and navigator.
- Added Palimpsest lore and canvas marker.
- SG1 specimen exchange now stores a bounded 0–7 role-history bitmask per island.
- Save schema advanced to 5.

## v0.18 — Migration ancestry and echo lineages

- Added typed life / memory / strangeness ancestry imprints to islands.
- Every received migration increments the matching ancestry counter.
- New islands can inherit an echo lineage when pre-existing migration history is sufficiently strong and non-tied.
- Inherited lineage adds a small birth bias.
- Matching future migrations gain +1 lineage resonance.
- Last Cycle Report labels lineage-resonance bonuses.
- Added a ninth optional Field Question for inherited land.
- SG1 specimen exchange now carries bounded ancestry counts and lineage enums.
- Save schema advanced to 4 with backward-safe zeroed ancestry defaults.
- Added invariant coverage for ancestry aggregation, tie rejection, inherited birth, migration resonance, Field Question completion, and specimen round-trip behavior.


## v0.17 — Causal cycle reports

- Added a session-local Last Cycle Report after each autonomous cycle.
- Reports exact migration transfers with source, destination, signal type, and strength.
- Reports island role changes caused during the cycle.
- Reports climate before/after and any phenomenon pulse that actually fired.
- Report state is intentionally excluded from SG1 specimen exchange.
- Added invariant coverage for structured cycle-report generation and specimen omission.

## v0.16 — Visible sky phenomena

- Added a dedicated Sky phenomenon panel.
- Added an eighth optional Field Question for triggering a sustained-climate phenomenon.
- Added distinct canvas signatures for Seed Rain, Memory Dew, Parallax Bloom, and Confluence Pulse.
- Reduced-motion preference freezes or simplifies phenomenon animation.
- Extended invariant coverage so triggering Seed Rain completes the phenomenon research question.

## v0.15 — Sustained climate phenomena

- Added climate streak tracking.
- Three consecutive cycles under one macro-climate activate a named phenomenon.
- Seed Rain adds life across the archipelago.
- Memory Dew adds memory.
- Parallax Bloom adds strangeness.
- Confluence Pulse adds a small amount of all three traits plus one resonance.
- Phenomenon state is bounded and included in specimen exchange.
- Save schema advanced to 3.
- Added invariant coverage for climate classification and Seed Rain activation.

## v0.14 — Canonical promotion baseline

The dedicated repository was created from the then-current GPT Village shared build. The promoted baseline already included:

- persistent route memory and topology species;
- macro-climate feedback;
- mixed-ecology bridge symbioses;
- signal glyphs;
- milestone Chronicle;
- local save repair/versioning;
- stable reload seed behavior;
- bounded SG1 specimen exchange;
- keyboard-accessible island controls;
- optional synthesized sound;
- copyable playtest summaries;
- optional Field Questions;
- cross-world discovery links with independent attribution.

Earlier incremental history remains documented in the shared development thread:
https://github.com/Minuteandone/Village-store/issues/24
