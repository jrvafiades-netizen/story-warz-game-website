import { expect, test } from '@playwright/test';
import {
  clampWager,
  createDeck,
  getTiedPlayers,
  isDoublePointsRound,
  scorePlayers,
  shuffle,
  type Player,
} from '../../src/gameLogic';

const players: Player[] = [
  {
    id: 1,
    name: 'Alex',
    stories: ['Alex 1', 'Alex 2'],
    score: 0,
  },
  {
    id: 2,
    name: 'Blair',
    stories: ['Blair 1', 'Blair 2'],
    score: 0,
  },
  {
    id: 3,
    name: 'Casey',
    stories: ['Casey 1', 'Casey 2'],
    score: 0,
  },
];

test('shuffle returns a new array with the same items', () => {
  const original = ['a', 'b', 'c'];
  const shuffled = shuffle(original, () => 0.5);

  expect(shuffled).not.toBe(original);
  expect(shuffled).toEqual(expect.arrayContaining(original));
  expect(original).toEqual(['a', 'b', 'c']);
});

test('createDeck converts every player story into a story card', () => {
  const deck = createDeck(players, () => 0.5);

  expect(deck).toHaveLength(6);
  expect(deck).toEqual(
    expect.arrayContaining([
      { playerId: 1, text: 'Alex 1' },
      { playerId: 1, text: 'Alex 2' },
      { playerId: 2, text: 'Blair 1' },
      { playerId: 2, text: 'Blair 2' },
      { playerId: 3, text: 'Casey 1' },
      { playerId: 3, text: 'Casey 2' },
    ]),
  );
});

test('isDoublePointsRound starts at the halfway point of the deck', () => {
  expect(isDoublePointsRound(0, 0)).toBe(false);
  expect(isDoublePointsRound(8, 3)).toBe(false);
  expect(isDoublePointsRound(8, 4)).toBe(true);
  expect(isDoublePointsRound(8, 7)).toBe(true);
});

test('scorePlayers awards correct guesses and owner bluff points', () => {
  const scored = scorePlayers(
    players,
    { playerId: 1, text: 'Alex 1' },
    {
      1: 1,
      2: 1,
      3: 2,
    },
    false,
  );

  expect(scored).toEqual([
    { ...players[0], score: 1 },
    { ...players[1], score: 2 },
    { ...players[2], score: 0 },
  ]);
  expect(players.every((player) => player.score === 0)).toBe(true);
});

test('scorePlayers doubles earned points during double points rounds', () => {
  const scored = scorePlayers(
    players,
    { playerId: 1, text: 'Alex 1' },
    {
      2: 1,
      3: 2,
    },
    true,
  );

  expect(scored).toEqual([
    { ...players[0], score: 2 },
    { ...players[1], score: 4 },
    { ...players[2], score: 0 },
  ]);
});

test('getTiedPlayers returns every player with the highest score', () => {
  const tied = getTiedPlayers([
    { ...players[0], score: 5 },
    { ...players[1], score: 8 },
    { ...players[2], score: 8 },
  ]);

  expect(tied.map((player) => player.name)).toEqual(['Blair', 'Casey']);
  expect(getTiedPlayers([])).toEqual([]);
});

test('clampWager keeps wagers between zero and the player score', () => {
  expect(clampWager(10, -3)).toBe(0);
  expect(clampWager(10, 4)).toBe(4);
  expect(clampWager(10, 15)).toBe(10);
});
