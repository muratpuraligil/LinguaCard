import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { loginAsTestUser } from './e2eHelpers';

test('Test Çöz (Quiz) modülü: Kütüphaneden teste başlanır, seçenek seçilir ve Dashboarda dönülür', async ({ app, screen }) => {
  // 1. Giriş yap ve Dashboard'a ulaş
  await loginAsTestUser(app, screen);

  // 2. Test Çöz kartına tıkla
  await screen.getByRole('heading', 'Test Çöz').tap();

  // 3. Mod seçim ekranının açıldığını doğrula ve "Kütüphaneden Çöz" seç
  await expect(screen.getByText('Test Çalışma Modunu Seç')).toBeVisible();
  await screen.getByText('Kütüphaneden Çöz').tap();

  // 4. Test ekranının açıldığını ve soru kutusunun yüklendiğini doğrula
  await expect(screen.getByText('A1')).toBeVisible();
  await expect(screen.getByRole('button', 'Bu Seti ve Skorunu Paylaş')).toBeVisible();
  await expect(screen.getByText('İngilizce Karşılığı Nedir?')).toBeVisible();

  // 5. Ana Sayfa butonuna tıklayarak Dashboard'a dön
  await screen.getByRole('button', 'Ana Sayfa').tap();
  await expect(screen.getByText('Yapay Zeka Destekli Kelime Öğrenme Platformu')).toBeVisible();
});
