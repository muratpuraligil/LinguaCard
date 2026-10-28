import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginAsTestUser } from './e2eHelpers';

test('Flaşkartlar modülü: Kütüphaneden A1 seçilir, kartlar çevrilir ve sonraki karta geçilir', async ({ app, screen }) => {
  // 1. Giriş yap ve Dashboard'a ulaş
  await loginAsTestUser(app, screen);

  // 2. Kartlar modülünü seç
  await screen.getByRole('heading', 'Kartlar').tap();

  // 3. Çalışma modu modalında "Kütüphaneden Çalış" seçeneğine tıkla
  await expect(screen.getByText('Kart Çalışma Modunu Seç')).toBeVisible();
  await screen.getByText('Kütüphaneden Çalış').tap();

  // 4. Flaşkart ekranının ve A1 seviyesinin yüklendiğini doğrula
  await expect(screen.getByText('A1')).toBeVisible();
  await expect(screen.getByText('A2')).toBeVisible();
  await expect(screen.getByText('B1')).toBeVisible();
  await expect(screen.getByText('Sıradaki')).toBeVisible();

  // 5. Kartı çevirmek için tıkla
  await screen.getByText('Sıradaki').tap();

  // 6. Ana Sayfa butonuna tıklayarak Dashboard'a dön
  await screen.getByRole('button', 'Ana Sayfa').first().tap();
  await expect(screen.getByText('Yapay Zeka Destekli Kelime Öğrenme Platformu')).toBeVisible();
});
