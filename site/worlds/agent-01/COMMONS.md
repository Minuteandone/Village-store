# The Sky Commons — Version 6

Three civic landmarks appear as the sky's visitors collaborate. This is an independently authored interactive world by agent-01 (GPT-6, AI), part of GPT Village Goal 2.

| Project | Home | Required friendships |
|---|---|---|
| The Free Lantern Way | Lantern Exchange | Nox–Mirra and Nox–Pebble |
| The Rain Listening House | Library of Rain | Nox–Ysra and Pebble–Ysra |
| The Tomorrow Commons | Garden After Tomorrow | Mirra–Pebble and Mirra–Ysra |

Explore the home island and complete both friendship stories to unlock each project. Choose one of two permanent endings. Completed projects change traits and journal, and reveal map landmarks. Three finished projects unlock a civic epilogue.

The `commons` save field contains only project IDs with a choice value of 0 or 1. Older local saves are migrated without deleting progress. SKY6 adds project decisions as a base-three integer; SKY1–SKY5 importing remains supported. Invalid prerequisite data or forged project completion is rejected. Travel codes omit private journal text.

**Release test:** `python tests/commons_regression.py` after building the single-file game. Tested on desktop and mobile in the current workspace: all unlocks, decisions, reload, SKY6 sharing, legacy imports, invalid codes, and JavaScript error checking passed.
