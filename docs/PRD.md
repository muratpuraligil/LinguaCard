# LinguaCard PRD (Product Requirements Document) - v1.2.0

## 1. Vizyon ve Hedef
LinguaCard, kullanıcıların kendi çalışma materyallerini (kitaplar, makaleler, videolar, PDF'ler veya kopyalanmış metinler) dijital çalışma kartlarına dönüştürmelerini sağlayan, Yapay Zeka (AI) destekli kişisel bir dil geliştirme ekosistemidir.

Temel hedef; statik ve sıkıcı "hazır kelime listeleri" yerine, kullanıcının **kendi bağlamında karşılaştığı** içerikleri akıllıca analiz edip interaktif antrenmanlara dönüştürmek ve ortak A1-C2 seviye kütüphaneler ile desteklemektir.

---

## 2. Temel Özellikler

### 2.1. Akıllı Veri Girişi (AI Entegrasyonu)
- **Görüntü İşleme (OCR):** Kitap sayfaları veya notların fotoğraflarından kelime ve cümle ayıklama.
- **PDF Desteği:** PDF dökümanlarını doğrudan yükleyerek içerik analizi yapabilme.
- **Kesintisiz Çok Kademeli AI & Yerel Ayrıştırıcı Mimarisi (3-Tier Resilience):** Görsel OCR veya metin yapıştırmalarında (CTRL+V) 1. Kademede Supabase Edge Function (`gemini-2.0-flash`), 2. Kademede İstemci Gemini API (`VITE_GEMINI_API_KEY`), 3. Kademede ise Yerel Metin Ayrıştırıcısı (Local Parser) kesintisiz yedekli çalışır. Sunucu veya API hatalarında kullanıcı asla sonsuz yüklenmede (spinner) kalmaz.
- **Metin Yapıştırma (CTRL+V):** Panodaki çok satırlı metinleri doğrudan yapıştırarak AI'nın veya yerel ayrıştırıcının bunları tek tek cümle/kelime olarak ayrıştırıp sisteme topluca eklemesi (Çoklu Cümle Analizi).
- **Akıllı Hızlı Ekleme (Manuel Ekleme - AI ile Tamamla):** Kelime Listesinde yer alan Hızlı Ekle formunda tek kelime (İngilizce veya Türkçe) girilip "AI ile Tamamla" butonuna tıklandığında, AI'nın kelime karşılığını, İngilizce örnek cümleyi ve Türkçe çevirisini otomatik doldurması; "Listeye Kaydet" işleminde Supabase şemasıyla tam uyumlu kolon yönetimi (`category`/`word_type` temizliği) ve offline-resilient yerel depolama yedeklemesi sağlanmıştır.
- **Akıllı Bağlamsal Ekleme:** Cümleler, Kütüphane ve Özel Set çalışmalarında kelimelere çift tıklandığında AI'nın arka planda otomatik olarak kelime anlamını, örnek cümleyi ve çevirisini üretip kaydetmesi.

### 2.2. Öğrenme ve Pratik Modülleri

- **Flaşkartlar (Flashcards - Moda Dayalı Çalışma & A1-B2 Kütüphane Entegrasyonu):** 
    - **3 Farklı Çalışma Modu (Mode Selector):**
      1. **Listendeki Kelimelerle Çalış (Bireysel Alan):** Kullanıcının kendi eklediği veya oluşturduğu kişisel kelimelerle çalışması (`words.user_id = auth.uid()`).
      2. **Yeni Kelimelerle Çalış (AI Destekli Alan):** Resim yükleme (OCR) veya metin yapıştırma ile AI destekli yeni kelimeler oluşturma ortamı. Üretilen kelimeler kullanıcının kendi `user_id` değeri ile veritabanına kaydedilir ve doğrudan kart çalışmasına yönlendirilir.
      3. **Kütüphaneden Çalış (Ortak Alan):** Tüm kullanıcıların erişebildiği global kelime kütüphanesi (`words.user_id IS NULL`). A1-1000, A2-1000, B1-1000 ve B2-1000 seviye setleri (her biri 1.000+ kelime, toplam 4.100+ CEFR uyumlu kelime) sisteme dahil edilmiş olup; hem `docs/` klasöründe Excel (`.xlsx`) kaynakları hem de `src/data/json/` paketleri olarak entegre edilmiştir. Üst kısımda yer alan seviye seçici sekmeler (A1, A2, B1, B2, C1, C2) ile seviyeler arası akıcı geçiş sağlanır.
    - **Kategori ve Tür Rozetleri:** Kartların ön ve arka yüzlerinde kelimenin kategorisi (`category` - Örn: "Travel and Transport") ve kelime türü (`word_type` - Örn: "Noun", "Verb") rozet olarak şık bir tasarımla sunulur.
    - **İlerleme Takibi (User Progress):** Çalışma esnasında "Öğrendim / Öğrenmedim / Biliyorum" durumları Supabase `user_progress` tablosuna (`word_id, user_id, status, module='flashcards'`) ve yerel hafızaya kaydedilir. "Öğrendim" butonuna basıldığında kelime arşivlenir ve aktif setteki kart sırası başa dönmeden kullanıcının kaldığı indeksten sıradaki kartla akıcı şekilde devam eder.
    - **Kaldığın Yerden Devam (Persistent Progress):** Aktif set numarası (`lingua_flashcard_set_num_{mode}_{level}`), aktif set ID listesi (`lingua_flashcard_active_ids_{mode}_{level}`) ve kullanıcının kaldığı kart sırası (`lingua_flashcard_current_index_{mode}_{level}`) yerel depolamada saklanır. Kullanıcı çalışma esnasında Ana Sayfa'ya dönüp tekrar karta girdiğinde en baştan başlamak yerine kaldığı karttan kesintisiz devam eder.
    - **Seçim & Sıralama Mantığı:** Kelimeler oluşturulma tarihine göre 20'şerli setlere bölünür. Seviye sekmeleri (A1, A2, B1, B2 vb.) ve çalışma modları arasında geçiş yapıldığında 1. kelimenin sürekli değişmesini önlemek adına deterministik/sabit sıralama uygulanır.
    - **Ekran Uyumlu Kompakt Kart Tasarımı (Viewport-Fit UX):** Kullanıcıların alt gezinme kontrollerine ("Öğrenmedim / Biliyorum", "Sıradaki / Başarılı") erişirken gereksiz dikey kaydırma (scroll) yapmasını önlemek amacıyla kart boyutları (`aspect-[4/4.8] max-h-[46vh] min-h-[290px]`) ve dikey boşluklar optimize edilerek tüm aksiyon butonları kaydırmasız tek ekranda sunulmuştur.
    - **Kütüphane Kelime Düzeltmeleri:** A1 kelime havuzunda bağlamsal doğruluğu artırmak için Türkçe çeviriler rafine edilmiştir (Örn: "Blog" -> "Web günlüğü", "Cell" -> "Hücre").
    - **Mod Değiştirme:** Kartlar çalışma ekranının üst menüsünde bulunan "Mod Seç" butonu ile istenildiğinde mod seçim ekranına dönülebilir.
    - **Otomatik Telaffuz:** Kartın İngilizce yüzü görüntülendiği anda seslendirme otomatik yapılır.

- **Quiz (Test Çöz):** 
    - Çoktan seçmeli, puan tabanlı dinamik testler.
    - **Seçim Mantığı:** Flaşkartlardaki gibi aktif kelimeler kronolojik olarak 20'şerli setlere bölünür ve set içi karıştırılarak test oluşturulur.
    - **Kaldığın Yerden Devam:** Çalışılan aktif set numarası (`lingua_quiz_set_num`) ve set içindeki aktif soru sırası (`lingua_quiz_current_index`) otomatik kaydedilir. Test yarım kalırsa kalınan set ve sorudan devam edilir.
    - **İlerleme Takibi:** Ekranın en üstünde yer alan progress bar ile kaçıncı sette olunduğu (`Set X / Y`) ve o testin içindeki ilerleme gösterilir.
    - **Otomatik Telaffuz & Ses Kontrolü:** Cevap seçildiği anda doğru İngilizce kelimenin telaffuzu otomatik olarak seslendirilir. TR-EN yön butonunun yanındaki hoparlör ikonu ile bu özellik açılıp kapatılabilir.
    - **Yapılan Yanlışları İzleme:** Test bitiş ekranında yanlış cevaplanan kelimeleri detaylı inceleme modalı.

- **Cümleler (Sentence Builder):** 
    - İnteraktif yazım pratiği ve mod seçim modalı.
    - **Esnek Kontrol:** Kısaltmaları (I'm / I am, She's / She is) kabul eden akıllı eşleşme algoritması.
    - **Sesli Geri Bildirim:** Doğru cevaplarda otomatik telaffuz.
    - **Kaldığın Yerden Devam:** Her set için son çalışılan satırın otomatik kaydedilmesi ve scroll focus.

### 2.3. İçerik Yönetimi
- **LinguaCard Kütüphanesi:** A1-C2 seviye kelime setleri ve Gramer konularına (Yardımcı fiiller, Modal'lar vb.) göre kategorize edilmiş hazır çalışma setleri. Tüm cümle setlerindeki Türkçe karakter bozulmaları (é, ¢, §, $, OCR kaymaları), İngilizce zamir boru ('|' -> 'I') ve sayı ('1' -> 'I') hataları, ünlem/zamir karışıklıkları (`so! can't` -> `so I can't` düzeltmesi - Modal-5 s22), çapraz eşleşen cümle kaymaları (örn. Modal-11 Had Better ve Modal-12 Need çaprazlamaları) ile İngilizce zaman, gramer ve belirli tanımlık düzeltmeleri (örn: "since last night", "on the board", "The doctors", `aux-18 s72` dilbilgisi düzeltmesi: `have been boil` -> `have been boiling`, `aux-12 s65` Türkçe OCR düzeltmesi: `kalacaoim` -> `kalacağını`) taranıp temizlenmiş; orijinal Perfectionist English PDF kaynaklarıyla doğrulanmış, karma çalışma setlerinde (Random Mix) versiyon bazlı önbellek senkronizasyonu ve string eşleştirme normalizasyonu (`isMatch`) tam olarak sağlanmıştır.
- **Özel Cümle Setleri:** Kullanıcının kendi oluşturduğu isimlendirilmiş çalışma paketleri.
- **Arşivleme:** Öğrenilen kelimelerin ana listeden temizlenip başarı kütüphanesine aktarılması.

### 2.4. Kullanıcı Hesabı & Auth
- **Güvenli Kimlik Doğrulama:** Supabase Auth entegrasyonu ile E-posta/Şifre ve Google OAuth giriş yöntemleri.
- **Kilitlenmesiz Oturum Başlatma (Deadlock-Free Auth & Safe Web Lock):** `onAuthStateChange` dinleyicisinde döngüsel `initializePromise` kilitlenmesini önlemek için veritabanı sorguları auth kilit döngüsü dışına (`setTimeout`) ayrıştırılmış, `navigator.locks` için 3 saniye zaman aşımı korumalı `safeAuthLock` ve açılış ekranı için 4 saniyelik emniyet zamanlayıcısı (`safetyTimer`) ile `"Sistem Hazırlanıyor..."` ekranında takılı kalma sorunu kalıcı olarak engellenmiştir.
- **Şifremi Unuttum & Şifre Sıfırlama:** Kullanıcıların e-posta adresi girerek şifre sıfırlama talebinde bulunabilmesi.
- **Türkçe Hata Mesajları:** API'den dönen auth hatalarının açıklayıcı Türkçe gösterimi.

---

## 3. Kullanıcı Deneyimi (UX)
- **Dinamik Dashboard:** Görsel ilerleme takibi ve pratik alanları.
- **Kart Modu Seçici Modal:** Cümleler modundaki yapıyla birebir uyumlu 3 kartlı Mod Seçim Modalı.
- **Rehberli Tur (Onboarding):** Tanıtım turları.
- **Premium Arayüz:** Karanlık mod odaklı, neon efektli, glassmorphism ve akıcı animasyonlar.

---

## 4. Teknik Altyapı
- **Frontend:** React 19 + Vite (Performance-first).
- **Veritabanı & Auth:** Supabase (Real-time data, RLS & secure authentication). 30 Ekim 2026 Supabase PostgREST güvenlik güncellemesi gereğince tüm public tablolar (`words`, `user_progress`) için `anon`, `authenticated` ve `service_role` rolleri açık `GRANT` direktifleriyle güvenceye alınmıştır.
- **Veri Şeması:** `words` (`category`, `word_type`, `set_name`, `user_id`), `user_progress` (`word_id`, `user_id`, `status`, `module`).
- **Yapay Zeka:** Google Gemini AI (Google Generative AI SDK).
- **Dosya İşleme:** Offscreen Canvas + Base64 Pipeline.

### 4.1. Geliştirici Standartları ve Entegre Kalite Yetenekleri
- **Kaizen (Sürekli İyileştirme):** Kademeli, güvenli ve test edilmiş refactoring adımları; ölü kodların ve gereksiz bağımlılıkların düzenli temizliği.
- **Bellek Sızıntısı Önleme (Memory Leak Prevention):** Tüm bileşenlerde (`FlashcardMode`, `SentenceMode`, `QuizMode`, `LibraryPracticeScreen`, `CustomSetStudyMode`, `WordList`, `UploadModal`) unmount anında `speechSynthesis.cancel()`, `clearTimeout`, `URL.revokeObjectURL` ve event listener cleanup güvencesi.
- **Ürün ve Arayüz Tasarımı (Product & Frontend Design):** Apple seviyesinde karanlık neon estetiği, dokunsal mikro geri bildirimler (`active:scale-95`), WCAG AA kontrast ve yönlendirici boş durum tasarımları.
- **Hindsight Memory:** Ajan deneyimleri ve mimari kararların `docs/HINDSIGHT_MEMORY.md` üzerinden kalıcı saklanması.
- **Test Güdümlü Geliştirme (TDD) & E2E Testleri:** Yeni özellik ve hata düzeltmelerinde RED-GREEN-REFACTOR döngüsü; `e2e` runner ile modern agentic ve deterministik E2E testleri (`tests/login.e2e.ts`, `tests/example.e2e.ts`). Supabase kimlik doğrulama akışı ve anasayfa yüklenme kontrolleri otomatik test güvencesi altındadır.
- **Git Pushing:** Conventional Commits standardı ile izlenebilir sürüm kontrolü.

---

## 5. Uygulama Kuralları ve Mantık
- **Puanlama:** Quiz modunda her doğru cevap 10 puan kazandırır.
- **Kütüphane Kelimeleri:** Global kütüphane kelimelerinde `user_id` alanı `NULL` bırakılır, `set_name` seviyeyi ('A1', 'A2' vb.) belirtir.

---

## 6. Sürüm Takibi ve Release Yönetimi
- **Sürüm Formatı:** `vX.Y.Z - DDMMYY`
- **Otomatik Artış:** Yerelde yeni bir özellik geliştirildiğinde veya fix yapıldığında versiyon numarası mutlaka artırılır ve tarih damgası güncellenir. Sürüm `1.0.99` değerine ulaştıktan sonra `1.2.0` şeklinde devam eder.
- **Lokal ve Canlı Versiyon Ayrımı:** Kullanıcıya bilgilendirme yapılırken Lokal Versiyon ile Canlı Versiyon (`gh-pages`) her zaman ayrı ve net olarak belirtilir. Canlı derlemede `prebuild` tetiklenmesiyle oluşan versiyon artışı raporlanır.

---

## 7. Gelecek Yol Haritası (Roadmap)
- [x] **A2-B2 Kelime Setlerinin Tamamlanması:** A2-1000, B1-1000 ve B2-1000 seviye verilerinin hazırlanması, docs klasörüne Excel (`.xlsx`) olarak eklenmesi ve kütüphaneye entegrasyonu tamamlandı.
- [ ] **C1-C2 Kelime Setlerinin Tamamlanması:** C1 ve C2 seviye verilerinin kütüphaneye aktarılması.
- [ ] **Aralıklı Tekrar (Spaced Repetition):** Unutma eğrisine göre kart hatırlatma.
- [ ] **Mobil Native Uygulama:** iOS ve Android sürümleri.
