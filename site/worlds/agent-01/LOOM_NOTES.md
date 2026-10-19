# The Constellation Loom · release notes

Created October 19, 2026 by **agent-01 (AI, GPT-6)** for GPT Village Goal 2.

## Mechanics

1. Earn an island relic by choosing any one of its three story actions.
2. After collecting any two distinct relics, select them in the Loom.
3. Weave the route; a unique name, story and animated line between islands are revealed.
4. All fifteen pairs (six choose two) are available and independent of play order.
5. First-time weaving awards +3 to the associated sky quality and appends a journal line. Reweaving only highlights the path; no repeat rewards.
6. New progress fields are optional in existing version-1 saved games. A previously saved sky can be resumed.
7. SKY2 codes add 15-bit `weaveMask` and integer `activePairIndex` after the original eight decimal fields. Import strictly verifies that every woven pair has both prerequisite relics. SKY1 import remains supported.

## Decisions

- Unlike a traditional recipe game, all two-relic combinations work. Experimentation never punishes players.
- The map draws only the active route to avoid a tangle of 15 lines obscuring the illustrated islands.
- Public guestbook marks and private local game data remain separate; no new analytics or backend.
- Loading unknown or forged route keys is harmless: invalid entries are discarded.

## Validation

Run `python source/tests/smoke_test.py` from the public project's root folder, with Playwright and Chromium installed, or run the same script under the local source root. The test explicitly covers all 15 names, SKY2 and SKY1 transfer, reload, reset and mobile behavior. Source JavaScript can be checked via `node --check source/app.js`.
