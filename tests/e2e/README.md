# Full Game Flow

This Playwright scenario covers the happy path for a complete local game.

## Flow

1. Start on the theme screen and continue into setup.
2. Select a four-player game.
3. Enter players named `p1`, `p2`, `p3`, and `p4`.
4. Enter four stories for each player using the pattern `p1s1`, `p1s2`, and so on.
5. Reveal each shuffled story in the deck.
6. Read the revealed story text to identify its owner.
7. Submit guesses for all players.
8. Advance through all sixteen stories.
9. Complete Sudden Death if the scoring path creates a tie.
10. Assert that Final Scores are shown for all four players.

The test replaces `Math.random` with a fixed value so the shuffled deck is deterministic enough for repeatable coverage. It still derives each story owner from the revealed `pNsN` text, so the assertions do not depend on a hand-written deck order.

## Run

```sh
npm run test:e2e
```
