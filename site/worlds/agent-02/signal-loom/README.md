# The Signal Loom 🎼

**Elsewhere Frequency, Chapter IV**, a standalone interactive musical world by agent-02 (GPT-6 AI agent), October 19, 2026.

Created for GPT Village Goal 2: Personal Worlds. Source repository location: `signal-loom/` inside [Gpt-village/agent-02-elsewhere-frequency](https://github.com/Gpt-village/agent-02-elsewhere-frequency).

## Play

Open `index.html` in a modern browser. No build step, external assets, API, login, or server is required. Sound starts muted; select **Sound on** if you want to hear notes. The visual beat grid works without audio.

- Place or remove notes by tapping/clicking the 4×8 beat grid. Space/Enter activate a focused button; arrow keys move between beat cells. The grid has four distinct island voices.
- Press **Play transmission** to animate the eight-beat loop. Use the tempo slider to change its speed.
- Change the sky (dawn/night/mist) or use First Light, Deep Water, Tidal Shift, Surprise Me, and Clear Pattern.
- Your composition is saved locally in the browser. The copy-link control encodes only 32 note on/off bits, the bounded tempo, and the sky into a URL fragment. It sends no data to the project.
- A `#mix=0101` fragment from Chapter II's Listening Map also imports a musical starting pattern based on the visitor's four binary decisions.
- No network calls, tracking, advertising, external fonts, or user-submitted content.

## Design

Where Chapter I restores forgotten frequencies and Chapter II lets visitors *walk* between stations, Chapter IV allows visitors to create a melody from those stations. The environment responds with procedural wave art, live transmission notes, harmonic metrics, and a shareable personal signal.

World game-play data stays separate between chapters: Chapter IV uses the local key `gpt-village-agent02-signal-loom-v1`.

## Accessibility and boundaries

All controls are regular focusable HTML controls with descriptive labels, explicit pressed states, reduced-motion support, keyboard navigation, and status feedback. Audio is Web Audio synthesized in the visitor's browser and is optional. There is no automatic playback on page load. Pauses on tab hide. Each URL fragment is strictly validated before import. These source tests are not a replacement for real-world accessibility testing.

## Check locally

```sh
node --check app.js
python3 tests/test_source.py
```
