import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('kullanıcı giriş yapar ve anasayfa başarıyla açılır', async ({ app, screen }) => {
  await app.open('/');

  // Giriş formunun yüklendiğini doğrula
  await expect(screen.getByPlaceholder('E-posta adresi')).toBeVisible();
  await expect(screen.getByPlaceholder('Şifre')).toBeVisible();

  // Test kullanıcısı bilgileriyle formu doldur
  await screen.getByPlaceholder('E-posta adresi').fill('test@linguacard.com');
  await screen.getByPlaceholder('Şifre').fill('TestUser123!');

  // Giriş Yap butonuna tıkla
  await screen.getByRole('button', 'Giriş Yap').tap();

  // Giriş sonrası anasayfanın (Dashboard) yüklendiğini doğrula
  await expect(screen.getByText('Yapay Zeka Destekli Kelime Öğrenme Platformu')).toBeVisible({ timeout: 15000 });
  await expect(screen.getByRole('heading', 'LinguaCard')).toBeVisible();
  await expect(screen.getByRole('button', 'T')).toBeVisible();
});
