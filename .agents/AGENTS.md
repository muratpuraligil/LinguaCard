# LinguaCard Geliştirici Kuralları

Bu dosya, LinguaCard projesinde geliştirme yaparken uyulması gereken yerel proje kurallarını tanımlar.

## Kurallar

### 1. PRD Güncelliği ve Takibi
- Her yeni özellik geliştirme veya değişiklik sonrasında `docs/PRD.md` (Ürün Gereksinim Belgesi) dosyasını mutlaka inceleyin ve yapılan değişiklikleri otomatik olarak `docs/PRD.md` belgesine de yansıtın.
- Kullanıcının ekstra olarak "PRD'yi güncelle" demesine gerek kalmadan, her majör/minör işlevsel güncellemede PRD'yi güncel tutun.

### 2. Sürüm ve Tarih Güncellemesi
- Yerelde yeni bir özellik geliştirildiğinde veya hata düzeltildiğinde (fix) `src/version.ts` dosyasındaki sürüm numarasını ve tarihi mutlaka güncelleyin (atlanmamalıdır).
- Sürüm `1.0.99` değerine ulaştıktan sonra, bir sonraki sürümde ikinci haneyi 1 artırarak `1.2.0` şeklinde devam ettirin.
