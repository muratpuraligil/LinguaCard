# LinguaCard Geliştirici Kuralları

Bu dosya, LinguaCard projesinde geliştirme yaparken uyulması gereken yerel proje kurallarını tanımlar.

## Kurallar

### 1. PRD Güncelliği ve Takibi
- Her yeni özellik geliştirme veya değişiklik sonrasında `docs/PRD.md` (Ürün Gereksinim Belgesi) dosyasını mutlaka inceleyin ve yapılan değişiklikleri otomatik olarak `docs/PRD.md` belgesine de yansıtın.
- Kullanıcının ekstra olarak "PRD'yi güncelle" demesine gerek kalmadan, her majör/minör işlevsel güncellemede PRD'yi güncel tutun.

### 2. Sürüm, Tarih ve Canlı Senkronizasyonu
- Yerelde yeni bir özellik geliştirildiğinde veya hata düzeltildiğinde (fix) `src/version.ts` dosyasındaki sürüm numarasını ve tarihi mutlaka güncelleyin (atlanmamalıdır).
- Sürüm `1.0.99` değerine ulaştıktan sonra, bir sonraki sürümde ikinci haneyi 1 artırarak `1.2.0` şeklinde devam ettirin.
- **Lokal ve Canlı Versiyon Ayrımı:** Kullanıcıya bilgilendirme yaparken Lokal Versiyon ile Canlı Versiyon (deploy edilmiş sürüm) her zaman ayrı ve doğru şekilde belirtilmelidir. `npm run deploy` öncesi `prebuild` (`scripts/bump-version.js`) sürümü 1 artırdığından, canlıya çıkan sürüm ile çalışma dizinindeki sürüm dikkatle takip edilmeli ve kullanıcıya net aktarılmalıdır.

### 3. Kaizen (Sürekli İyileştirme)
- Kodu her zaman bulduğunuzdan daha temiz bırakın (Boy Scout Rule).
- Büyük, tek seferlik yıkıcı değişiklikler yerine küçük, test edilmiş ve güvenli adımlarla refactoring uygulayın.
- Ölü kodları, kullanılmayan import'ları ve gereksiz bağımlılıkları temizleyin.

### 4. Bellek Sızıntısı Önleme (Memory Leak Prevention)
- Tüm React `useEffect` bloklarında oluşturulan timer (`setTimeout`, `setInterval`), event listener (`window.addEventListener`), `URL.createObjectURL` ve `speechSynthesis` işlemleri unmount anında mutlaka temizlenmelidir (`cleanup function`).
- Asenkron operasyonlarda (fetch, AI çağrıları) bileşenin unmount olma durumu ve `AbortController` mekanizmaları korunmalıdır.

### 5. Ürün & Arayüz Tasarımı (Product & Frontend Design)
- Apple standartlarında minimalist, yüksek işçilikli (high-craft) ve tutarlı UI/UX prensiplerini koruyun.
- Donuk, şablonlaşmış yapılar yerine amaca uygun güçlü tipografi, mikro etkileşimler, akıcı geçişler ve tam erişilebilirlik (kontrast, odak durumları, dokunma hedefleri) sağlayın.
- Boş durumlar (empty states), yüklenme ekranları (loaders) ve hata mesajları kullanıcıyı her zaman yönlendirecek kalitede olmalıdır.

### 6. Hindsight Memory (Kalıcı Hafıza & Mimari Deneyim)
- Projede çözülen karmaşık hatalar, mimari kalıplar ve kullanıcı tercihleri `docs/HINDSIGHT_MEMORY.md` veya ilgili dökümantasyonda kalıcı hafıza olarak saklanmalı; sonraki geliştirmelerde bu deneyimlerden doğrudan faydalanılmalıdır.

### 7. Git Pushing & Commit Standartları
- Yapılan değişiklikler mantıksal olarak paketlenmeli ve Conventional Commits formatında (`feat:`, `fix:`, `refactor:`, `chore:`) açık, net Türkçe/İngilizce mesajlarla commit edilip GitHub'a gönderilmelidir.

### 8. Test Güdümlü Geliştirme (Test Driven Development - TDD)
- Yeni özellik, bugfix veya refactoring geliştirirken RED-GREEN-REFACTOR döngüsü zorunludur.
- **Demir Kural:** Önce başarısız olan test yazılmalı (`RED`), testin başarısız olduğu doğrulanmalı, ardından testi geçiren en minimal kod yazılmalı (`GREEN`), son olarak kod temizlenip yeniden düzenlenmelidir (`REFACTOR`).
- Test yazmadan prodüksiyon kodu yazmak yasaktır. Yapılan mantık değişiklikleri mutlaka birim testlerle doğrulanmalıdır.
