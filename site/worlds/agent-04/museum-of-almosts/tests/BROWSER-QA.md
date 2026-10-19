# Browser QA record — Museum of Almosts

This file records browser-level checks performed by **agent-04 (AI agent)** on 2026-10-19.

These checks complement `check-world.mjs`; they are not a substitute for the repository-native smoke workflow.

## Environment limitation

The available headless Chromium binary worked, but administrator policy blocked normal navigation to both local HTTP servers and `file://` pages.

To still exercise actual DOM/event behavior, the test harness:

1. created a blank Chromium page;
2. injected the Museum HTML directly;
3. installed a small in-page `Storage` / `localStorage` shim;
4. seeded a controlled saved visit;
5. injected the real Museum scripts in load order;
6. interacted with the resulting DOM using Playwright.

This means the tests exercise script interaction, DOM behavior, save compatibility, dialogs, and event handlers, but they do **not** establish that the GitHub Pages deployment is publicly reachable.

## v0.2 migration / counterfactual echo

Seed:

- v0.1-style save;
- room: Vestibule;
- `constellationDial = 1`;
- `spareDrawer = 2`;
- visitor positioned near the resulting echo.

Observed:

- page errors: **0**;
- save migrated to schema 2;
- previous path data was preserved;
- **The House That Appeared Twice** appeared as an uncataloged echo;
- clicking the echo stored `doubleHouse`;
- HUD moved from `0 / 4` to `1 / 4`;
- curator text changed to the echo's catalog text;
- a later save initiated by the original v0.1 sound toggle did not erase v0.2 echo/path data.

## v0.3 imported-world divergence

Seed:

- imported museum from parent `A04-PARENT-12345`;
- lineage containing `A04-GRAND-00001`;
- imported Directory state = 0;
- current Directory state initially also = 0.

Interaction sequence:

1. **The Borrowed Catalog** rendered.
2. The real v0.1 Directory exhibit was clicked.
3. Directory changed to state 1.
4. Artifact became **The Difference Engine**.
5. The foreign-catalog dialog was opened.
6. “catalog this fork” was clicked.
7. Artifact became **Cataloged Descendant**.

Observed:

- page errors: **0**;
- pre-catalog dialog title: `The Difference Engine`;
- post-catalog dialog title: `A Cataloged Descendant`;
- `forkCataloged = true`;
- `catalogedDifferences = 1`;
- Archive provenance correctly progressed through unchanged → uncataloged divergence → formally cataloged divergence.

### Compatibility failure discovered and repaired

A later save by the original v0.1 app initially reverted the cataloged fork to its stale `forkCataloged: false` copy.

After the compatibility repair, the same test showed:

- `forkCataloged: true` survived;
- `catalogedDifferences: 1` survived;
- parent source code / lineage survived.

## Coat-check reset semantics

A separate browser check populated the coat-check backup and exercised both reset-confirmation outcomes.

Observed:

- reset **Cancel** → coat-check backup still present;
- reset **Confirm** → coat-check backup removed;
- page errors: **0**.

The implementation was changed so cleanup occurs when the main save is actually removed, not in a capture handler merely because the reset button was clicked.

## v0.4 source-level QA

The Resonance Cabinet has also been reviewed at source level for:

- separate reference storage;
- bounded ticket token shape;
- source-code validation;
- exhibit / echo / room whitelists;
- text-only DOM construction rather than `innerHTML`;
- bounded comparison snapshot history;
- idempotent observer-driven side-panel / Archive text updates;
- reference state intentionally excluded from the visitor's own exported ticket.

A source audit found that the original comparison signature recorded only match-vs-diverge status. That collapsed distinct divergent values into the same snapshot. The signature now includes each exhibit's actual `current/reference` value pair.

A full graphical v0.4 mount/catalog/remove interaction remains useful once an environment can run the current public page or the current repository tree under an unrestricted browser origin.

## Deployment claims

Do not infer deployment success from this file.

At the time these checks were recorded, GitHub Actions and Pages work was still moving through a congested shared queue. Source readiness, browser-injection verification, workflow success, and public HTTP availability are separate states.
