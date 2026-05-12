import { expect, test } from '@playwright/test';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const playerCount = 4;
const storyCount = 4;
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');

let appServer: Server;
let appUrl: string;

test.beforeAll(async () => {
  appServer = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relativePath = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
    const filePath = path.resolve(distDir, relativePath);

    if (!filePath.startsWith(distDir)) {
      response.writeHead(403).end();
      return;
    }

    try {
      const fileStats = await stat(filePath);

      if (!fileStats.isFile()) {
        response.writeHead(404).end();
        return;
      }

      response.setHeader('Content-Type', contentType(filePath));
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise<void>((resolve) => {
    appServer.listen(0, '127.0.0.1', resolve);
  });

  const address = appServer.address();

  if (typeof address !== 'object' || address === null) {
    throw new Error('Expected the test server to listen on a TCP port.');
  }

  appUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    appServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

function contentType(filePath: string) {
  const extension = path.extname(filePath);

  if (extension === '.html') {
    return 'text/html; charset=utf-8';
  }

  if (extension === '.js') {
    return 'text/javascript; charset=utf-8';
  }

  if (extension === '.css') {
    return 'text/css; charset=utf-8';
  }

  if (extension === '.svg') {
    return 'image/svg+xml';
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}

test('plays a full game flow with named players and stories', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });

  await page.goto(appUrl);

  await page.getByRole('button', { name: 'ARE YOU READY FOR WAR?' }).click();
  await page.getByRole('button', { name: '4 Players' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  for (let playerNumber = 1; playerNumber <= playerCount; playerNumber += 1) {
    await expect(page.getByRole('heading', { name: `Player ${playerNumber}, Enter Your Name` })).toBeVisible();
    await page.getByLabel('Your Name').fill(`p${playerNumber}`);

    for (let storyNumber = 1; storyNumber <= storyCount; storyNumber += 1) {
      await page.getByLabel(`Story ${storyNumber}`).fill(`p${playerNumber}s${storyNumber}`);
    }

    await page.getByRole('button', { name: 'Submit' }).click();
  }

  const totalStories = playerCount * storyCount;

  for (let storyNumber = 1; storyNumber <= totalStories; storyNumber += 1) {
    await expect(page.getByRole('heading', { name: `Story ${storyNumber}` })).toBeVisible();
    await page.getByRole('button', { name: 'Reveal' }).click();

    const storyText = await page.locator('.story-card').innerText();
    const owner = storyText.match(/^p(?<playerNumber>\d+)s\d+$/)?.groups?.playerNumber;
    expect(owner, `Expected story text "${storyText}" to identify a player`).toBeTruthy();

    for (let voterNumber = 1; voterNumber <= playerCount; voterNumber += 1) {
      await expect(page.getByLabel(`p${voterNumber}'s guess`).locator('option', { hasText: `p${voterNumber}` })).toHaveCount(0);

      const guessNumber = voterNumber === Number(owner) ? (voterNumber === 1 ? 2 : 1) : Number(owner);
      const guess = `p${guessNumber}`;
      await page.getByLabel(`p${voterNumber}'s guess`).selectOption({ label: guess });
    }

    await page.getByRole('button', { name: 'Next Story' }).click();
  }

  if (await page.getByRole('heading', { name: 'Sudden Death!' }).isVisible()) {
    await page.getByLabel("p1's wager").fill('1');
    await page.getByRole('button', { name: 'Start Sudden Death Round' }).click();
  }

  const finalScores = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Final Scores' }),
  });

  await expect(finalScores).toBeVisible();
  await expect(finalScores.getByText('p1', { exact: true })).toBeVisible();
  await expect(finalScores.getByText('p2', { exact: true })).toBeVisible();
  await expect(finalScores.getByText('p3', { exact: true })).toBeVisible();
  await expect(finalScores.getByText('p4', { exact: true })).toBeVisible();
  await expect(finalScores.getByRole('button', { name: 'Start from scratch' })).toBeVisible();
});
