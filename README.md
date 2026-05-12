# Story Warz

Story Warz is a local party game where players write short personal stories, then try to guess who wrote each one. The app guides the group through setup, story entry, story reveals, voting, scoring, and a sudden-death tiebreaker.

## How to Play

1. Choose a theme for the round.
2. Select 3, 4, or 5 players.
3. Each player enters their name and four stories.
4. The app shuffles all stories into a deck.
5. One story is revealed at a time.
6. Every player guesses who wrote the story.
7. Scores are updated after each reveal.
8. The player with the most points at the end wins.

## Scoring

If the displayed story is not yours, guess the author correctly to earn 2 points.

If the displayed story is yours, try to fool the other players. You earn 1 point for every player who guesses incorrectly.

At the halfway point of the deck, the game enters double points. All points earned during those stories are doubled.

## Sudden Death

If two or more players are tied at the end of the game, Story Warz starts a sudden-death tiebreaker. Tied players wager between 0 and their current score, then the wager is subtracted from their score when the tiebreaker finishes.

## Development

## Fonts

The title is styled to use Impact for `Story` and BadaBoom BB for `Warz`.

Place the font files in:

```text
public/fonts/Impact.ttf
public/fonts/BadaboomBB_Reg.otf
```

The app also tries locally installed copies of those fonts first, then falls back to bundled files in `public/fonts`.

Install dependencies:

```sh
npm install
```

Start the local dev server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Run lint checks:

```sh
npm run lint
```

Run the Playwright end-to-end suite:

```sh
npm run test:e2e
```

On Windows PowerShell, if `npm` is blocked by script execution policy, use `npm.cmd` instead:

```sh
npm.cmd run dev
```
