import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('index.html contains Open Graph and Twitter image metadata for WhatsApp preview', () => {
  const indexHtmlPath = path.resolve('index.html');
  const content = fs.readFileSync(indexHtmlPath, 'utf8');

  assert.ok(content.includes('property="og:image"'), 'index.html must include og:image tag');
  assert.ok(content.includes('content="https://muratpuraligil.github.io/LinguaCard/og-image.png"'), 'index.html must point og:image to github.io url');
  assert.ok(content.includes('property="og:title"'), 'index.html must include og:title tag');
  assert.ok(content.includes('name="twitter:image"'), 'index.html must include twitter:image tag');
});

test('public branding images (og-image.png, icon-512.png, icon-192.png) exist and have valid sizes', () => {
  const ogImgPath = path.resolve('public/og-image.png');
  const icon512Path = path.resolve('public/icon-512.png');
  const icon192Path = path.resolve('public/icon-192.png');

  assert.ok(fs.existsSync(ogImgPath), 'public/og-image.png must exist');
  assert.ok(fs.existsSync(icon512Path), 'public/icon-512.png must exist');
  assert.ok(fs.existsSync(icon192Path), 'public/icon-192.png must exist');

  const ogStat = fs.statSync(ogImgPath);
  const icon512Stat = fs.statSync(icon512Path);
  const icon192Stat = fs.statSync(icon192Path);

  assert.ok(ogStat.size > 20000, 'og-image.png must be a full-resolution image');
  assert.ok(icon512Stat.size > 20000, 'icon-512.png must be a full-resolution image');
  assert.ok(icon192Stat.size > 20000, 'icon-192.png must be a full-resolution image');
});
