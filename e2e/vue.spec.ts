import { test, expect } from '@playwright/test';

// TODO: TODOアプリ用のテストに更新する
// TODO: 主要な機能（追加、削除、編集）のE2Eテストを実装する

test('visits the app root url', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('TODO App (Beta)');
})
