import { expect } from 'e2e';

/**
 * LinguaCard test kullanıcısıyla oturum açar ve Dashboard ekranının açılmasını bekler.
 */
export async function loginAsTestUser(app: any, screen: any) {
  await app.open('/');

  // Eğer giriş formu görünürse giriş yap
  try {
    const emailInput = screen.getByPlaceholder('E-posta adresi');
    await emailInput.fill('test@linguacard.com');
    await screen.getByPlaceholder('Şifre').fill('TestUser123!');
    await screen.getByRole('button', 'Giriş Yap').tap();
  } catch (err) {
    // Oturum zaten açıksa doğrudan devam et
  }

  // Dashboard ekranının yüklendiğini doğrula
  await expect(screen.getByText('Yapay Zeka Destekli Kelime Öğrenme Platformu')).toBeVisible({ timeout: 15000 });
}
