import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginAsTestUser } from './e2eHelpers';

test('Cümleler ve Kütüphane modülü: Kütüphaneden Karma Çalışma başlatılır ve Dashboarda dönülür', async ({ app, screen }) => {
  // 1. Giriş yap ve Dashboard'a ulaş
  await loginAsTestUser(app, screen);

  // 2. Cümleler kartına tıkla
  await screen.getByRole('heading', 'Cümleler').tap();

  // 3. Çalışma modu modalında "Kütüphaneden Çalış" seç
  await expect(screen.getByText('Cümle Çalışma Modunu Seç')).toBeVisible();
  await screen.getByText('Kütüphaneden Çalış').tap();

  // 4. Kütüphane ekranının yüklendiğini doğrula ve "Rastgele Oluştur"a tıkla
  await expect(screen.getByText('Rastgele Oluştur')).toBeVisible();
  await screen.getByText('Rastgele Oluştur').tap();

  // 5. Cümle pratiği ekranının (Karma Çalışma) yüklendiğini doğrula
  await expect(screen.getByText(/Karma Çalışma/)).toBeVisible();

  // 6. Ana Sayfa butonuna tıklayarak Dashboard'a dön
  await screen.getByRole('button', 'Ana Sayfa').tap();
  await expect(screen.getByText('Yapay Zeka Destekli Kelime Öğrenme Platformu')).toBeVisible();
});
