import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/unit tests',
  fullyParallel: true,
  reporter: 'list',
});
