# LinguaCard PRD (Product Requirements Document) - v1.2.29 (28 Ekim 2026)

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

- **Cihazlar Arası Kesintisiz Oturum ve İlerleme Senkronizasyonu (Cloud State Sync):**
    - **Farklı Cihaz/Tarayıcı İzolasyonunun Aşılması:** Kullanıcının PC'den mobile geçtiğinde veya farklı tarayıcılarda LinguaCard'ı açtığında `localStorage` izolasyonu sebebiyle 1. setten başlaması sorunu çözülmüştür.
    - **Hibrit Depolama Mimarisi (Local-First + Debounced Cloud Sync):** 
      - İstemci tarafında `userStateService` ile tüm set numaraları (`currentSetNum`), kart/soru sıraları (`currentIndex`), aktif seviyeler (`A1..C2`) ve kapsamlar (`CORE_300` vs `ALL`) yerel `localStorage`'a anında (0ms) yazılarak sıfır arayüz gecikmesi korunur.
      - 600ms'lik debounce süresiyle arka planda Supabase `public.user_study_state` tablosuna (`user_id, state JSONB, updated_at`) kesintisiz yedekleme yapılır. Seviye değişimi veya modül kapatma anlarında `saveStateBulk` ile anlık senkronizasyon garanti edilir.
    - **Otomatik Karşılama ve Eşitleme (Auto-Resume on Mobile):** Kullanıcı mobil cihazda oturum açtığında veya sayfayı açtığında Supabase'deki en son ilerleme otomatik olarak çekilir (`syncRemoteToLocal`); PC'de kalınan set (örneğin 6. set) ve kart doğrudan mobil ekrana yüklenir.
    - **Şema ve Çevrimdışı Dayanıklılığı (Schema & Offline Resilience):** Supabase tablosunun henüz oluşturulmadığı veya internet bağlantısının olmadığı senaryolarda sistem arayüzü kilitlemeden veya hata vermeden tamamen yerel `localStorage` modunda çalışmaya devam eder.

- **Flaşkartlar (Flashcards - Moda Dayalı Çalışma & A1-C2 Kütüphane Entegrasyonu):** 
    - **3 Farklı Çalışma Modu (Mode Selector):**
      1. **Kütüphaneden Çalış (Ortak Alan):** Tüm kullanıcıların erişebildiği global kelime kütüphanesi (`words.user_id IS NULL`). A1-1000, A2-1000, B1-1000, B2-1000, C1-1000 ve C2-1000 seviye setleri (her biri 1.000+ kelime, toplam 6.160+ CEFR uyumlu kelime) sisteme dahil edilmiş olup; hem `docs/` klasöründe Excel (`.xlsx`) kaynakları hem de `src/data/json/` paketleri olarak entegre edilmiştir. Üst kısımda yer alan seviye seçici sekmeler (A1, A2, B1, B2, C1, C2) ile tüm seviyeler arasında anlık ve akıcı geçiş sağlanır.
      2. **Listendeki Kelimelerle Çalış (Bireysel Alan):** Kullanıcının kendi eklediği veya oluşturduğu kişisel kelimelerle çalışması (`words.user_id = auth.uid()`).
      3. **Yeni Kelimelerle Çalış (AI Destekli Alan):** Resim yükleme (OCR) veya metin yapıştırma ile AI destekli yeni kelimeler oluşturma ortamı. Üretilen kelimeler kullanıcının kendi `user_id` değeri ile veritabanına kaydedilir ve doğrudan kart çalışmasına yönlendirilir.
    - **Kategori ve Tür Rozetleri:** Kartların ön ve arka yüzlerinde kelimenin kategorisi (`category` - Örn: "Academic and Research", "Culture and Arts") ve kelime türü (`word_type` - Örn: "Noun", "Verb", "Adjective") rozet olarak şık bir tasarımla sunulur.
    - **İlerleme Takibi (User Progress):** Çalışma esnasında "Öğrendim / Öğrenmedim / Biliyorum" durumları Supabase `user_progress` tablosuna (`word_id, user_id, status, module='flashcards'`) ve yerel hafızaya kaydedilir. "Öğrendim" butonuna basıldığında kelime arşivlenir ve aktif setteki kart sırası başa dönmeden kullanıcının kaldığı indeksten sıradaki kartla akıcı şekilde devam eder.
    - **Seviye Bazlı Bağımsız Kalıcı Hafıza ve Kaldığı Yerden Devam (Per-Level Independent Persistent Memory):** 
      - **Bağımsız Durum Anahtarları:** Her CEFR seviyesi ve çalışma modu için izole yerel depolama anahtarları kullanılır: Aktif set numarası (`lingua_flashcard_set_num_${mode}_${level}`), aktif set ID listesi (`lingua_flashcard_active_ids_${mode}_${level}`) ve kullanıcının kaldığı kart sırası (`lingua_flashcard_current_index_${mode}_${level}`).
      - **Seviyeler Arası Çapraz Koruma & Sıfır Reset Garantisi:** Kütüphaneden Çalış modundaki her seviye sekmesi (A1, A2, B1, B2, C1, C2) bağımsız çalışma hafızasına sahiptir. Örneğin kullanıcı A1'de 7. karttayken B1 seviyesine geçip 14. karta ulaştığında, tekrar A1'e döndüğünde A1'de 7. karttan; B1'e döndüğünde ise B1'de 14. karttan kesintisiz devam eder. Seviye geçiş anında oluşan sahte `setChanged` tetikleyicisi engellenerek A1, A2 ve B1 sekmelerinde kartın 1. sıraya sıfırlanma anomalisi kökten giderilmiştir.
      - **Senkronizasyon ve Emniyetli Ayrılma:** Seviye değişimi tetiklendiğinde veya ekran değiştirildiğinde ayrılmakta olan seviyenin ilerlemesi anında diske kaydedilir; yeni seçilen seviyenin kayıtlı ilerlemesi ve kelime kimlikleri senkronize edilerek eski ID'lerin yeni seviyeyi bloke etmesi kalıcı olarak engellenir.
      - **Uygulama Genelinde Süreklilik & Son Seviye Hafızası:** Kullanıcı Ana Sayfa'ya dönüp karta yeniden girdiğinde (`lingua_flashcard_last_level`), tarayıcıyı yenilediğinde veya oturum kapandığında en son çalıştığı seviye ve o seviyedeki kaldığı kart ve setten sıfır veri kaybıyla kesintisiz devam eder.
    - **Hands-Free Arka Plan & Kilit Ekranı Dinleme Modu (Background & Lock Screen Audio):** 
      - **Kesintisiz Çift Dilli Oynatma Döngüsü:** Kartlar ekranında yer alan "Dinleme Modu" butonu ile başlatılan bu mod, ilgili 20'lik kelime setini ekrana dokunmaya veya bakmaya gerek kalmadan seslendirir: Önce kartın ön yüzündeki kelime (İngilizce) telaffuz edilir, ardından ayarlanabilir düşünme süresi (3s / 4s / 5s, varsayılan 4s) beklenir, ardından kartın çevirisi (Türkçe) telaffuz edilir ve kart otomatik olarak sonraki adıma geçer.
      - **Mobil Kilit Ekranı ve Sekme Arka Planı Desteği (HTML5 Audio + Silent Loop Keep-Alive):** Mobil işletim sistemlerinin (iOS Safari, Android Chrome) sekme arka plana atıldığında veya ekran kilitlendiğinde Web Speech API'yi dondurma (sleep/suspend) engeli; kesintisiz HTML5 Audio taşıyıcı döngüsü (Silent Loop Keep-Alive) ile aşılmıştır. Kullanıcı telefonunu cebine koysa veya ekranı kapatsa dahi telaffuz zinciri kesintisiz çalışmaya devam eder.
      - **Tarayıcı Sekmesi Mute ve Pause Kontrolü:** Tarayıcı sekmesinde gerçek bir medya akışı çalıştığı için masaüstünde sekme doğrudan hoparlör ikonuyla veya sağ tıkla tek dokunuşla susturulabilir (mute/unmute) ve medya tuşlarıyla duraklatılabilir.
      - **Kilit Ekranı ve Arka Planda Kesintisiz Çalma Mimarisi (Background Audio Keep-Alive & Zero-Referrer TTS):** Mobil tarayıcılarda (iOS Safari, Android Chrome) `window.speechSynthesis` API'si ekran kilitlendiğinde veya başka uygulamaya geçildiğinde işletim sistemi tarafından derhal dondurulmaktadır. Bu engeli aşmak için telaffuzlar gerçek `<audio>` elementi üzerinden `no-referrer` politikasıyla doğrudan Google TTS motorundan akıtılır (`index.html` üzerinde `<meta name="referrer" content="no-referrer">` ve `speechAudio.referrerPolicy = 'no-referrer'`). Böylece harici domain kaynaklı 404 engelleri tamamen aşılmıştır.
      - **Donanımsal Ses Döngüsü Zamanlayıcısı (Hardware Audio Clock Keep-Alive):** Ekran kilitlendiğinde işletim sisteminin `setTimeout` zamanlayıcılarını uyutması (sleep/freeze), 3 saniyelik PCM WAV sessizlik taşıyıcısının (`carrierAudio`) `ontimeupdate` donanım saatine bağlanarak aşılmıştır. Düşünme süresi ve kart geçişleri telefon kilitliyken dahi milisaniyesi milisaniyesine kusursuz çalışır.
      - **Kilit Ekranı Flaşkart Artwork & Donanım Kontrolleri:** iOS ve Android kilit ekranı albüm görseli için `public/icon-512.png` ve `public/icon-192.png` gerçek HTTPS medya görselleri ile dinamik kart çizimleri `navigator.mediaSession.metadata.artwork` dizisine tanımlanmıştır. Kilit ekranında o anki kelime (`[1/20] Word`), faz durumu (`🤔 Düşünün...` / `✨ Çeviri: ...`) ve albüm bilgisi görünür; kilit ekranı medya tuşlarıyla ve Bluetooth kulaklıklarla durdurma, devam etme, sonraki/önceki karta geçiş tam kontrol altındadır.
      - **Dinleme Modu Set Sonu 10 Saniye Otomatik Yeni Sete Geçiş & Kart-Ses Senkronizasyon Koruması (Hands-Free Auto-Advance & Strict Set Sync):** Dinleme modu ile çalışılırken set bittiğinde kullanıcının cebinden telefonu çıkarmasına gerek kalmaması için "Harika Bir Set!" ekranında 10 saniyelik görsel bir geri sayım barı (`autoAdvanceCountdown`) çalışır. Kullanıcı 10 saniye boyunca ekrana dokunmazsa, sistem otomatik olarak bir sonraki seti yükler ve sesli dinleme modunu kesintisiz olarak başlatır. Kullanıcı dilerse "Hemen Yeni Sete Geç" ile beklemeden geçebilir veya "Otomatik Geçişi Durdur / İptal Et" butonuyla sayacı durdurabilir. Yeni sete geçişte (`handleNewSet`), eski setlerden veya eski yerel anahtarlardan (`lingua_flashcard_active_ids_LIBRARY_A1`) kalan bayat kimliklerin arayüzde önceki setin kartını göstermesi engellenmiş; `currentSet` kütüphane modunda doğrudan aktif set numarasına kilitlenmiş, `activeIds` ve `localStorage` yeni setin kelime ID'leriyle anında atomik olarak senkronize edilerek telaffuz edilen kelime ile ekranda gösterilen kartın her zaman birebir aynı olması (%100 görsel-işitsel senkronizasyon) güvenceye alınmıştır.
      - **Yüzen Kontrol Paneli (ListeningModeBar):** Kartın üstünde anlık fazı ("Kelime Okunuyor", "Düşünme Payı: 4s", "Çeviri Okunuyor", "Sıradakine Geçiliyor..."), bekleme süresi seçicilerini (3s, 4s, 5s), oynat/duraklat ve kart atlama butonlarını içeren Apple standartlarında minimalist, yarı saydam (`backdrop-blur`) ve şık kontrol çubuğu sunulur.
    - **Kart Geçiş Senkronizasyonu & Bilgi Gizliliği Koruması (Zero-Leak Flip Transition & Yellow Card Visibility):** 
      - **Sarı Çeviri Kartı Görünürlüğü (Yellow Card Visibility):** Dinleme modunda düşünme süresi tamamlandığında kart mutlaka 3D animasyonla arka yüze çevrilir (`isFlipped = true`) ve sarı arka yüz (çeviri) ekranda net şekilde açılır. Çeviri telaffuzu bittikten sonra kullanıcının kartı rahatça okuyabilmesi için sarı kart 2.2 saniye boyunca ekranda sabit görünür kalır; erken kapanma engellenmiştir.
      - **Bilgi Sızıntısı Önleme:** Çeviri okunduktan ve 2.2 saniyelik okuma payı tamamlandıktan sonra, doğrudan sonraki kelimeye geçilmez; normal moddaki `handleNext` mantığıyla önce kart ön yüze döndürülür (`isFlipped = false`). 350ms'lik dönme süresinden sonra yeni kelimeye geçilir (`advanceToNext`). Böylece sonraki kelimenin çevirisi geçiş anında asla ve asla yansımaz ("spoiler" etkisi sıfırlanmıştır).
    - **Kademeli Kelime Kapsamı & Temel 300 Seçicisi (Tiered Word Scope: Temel 300 vs Tümü):**
      - **Pedagojik Temel 300 Yaklaşımı:** Her CEFR seviyesinde (A1-C2) 1.000+ kelimelik devasa havuzun yeni başlayanları bunaltmaması ve en sık kullanılan çekirdek kelimelerin öncelikle pekiştirilmesi için varsayılan olarak **"⭐ Temel 300"** (15 set, 300 kelime) kapsamı sunulur.
      - **Kapsam Geçişi (Scope Toggle):** Seviye sekmelerinin hemen altında yer alan minimalist ve kompakt segmented pill (`[⭐ Temel 300] [📚 Tümü (1000+)]`) ile kullanıcı dilediğinde seviyenin tüm kelime havuzuna (1.000+ kelime, 52 set) tek tıkla geçiş yapabilir.
      - **Kalıcı Tercih Saklama:** Kullanıcının seçtiği kapsam tercihi yerel depolamada (`lingua_flashcard_library_scope`) güvenle saklanır ve oturumlar arasında korunur.
      - **Kapsam Bazlı Bağımsız İlerleme Hafızası (Scope-Isolated Persistent Memory: Temel 300 <-> Tümü):** Kullanıcı "Temel 300" ve "Tümü" filtreleri arasında geçiş yaptığında önceki çalışması asla sıfırlanmaz. Her seviye ve her kapsam için izole depolama anahtarları (`lingua_flashcard_current_index_${mode}_${level}_${scope}`, `lingua_flashcard_set_num_${mode}_${level}_${scope}`, `lingua_flashcard_active_ids_${mode}_${level}_${scope}`) kullanılır. Örneğin B2 seviyesinde "Temel 300"de Set 2 Kart 5'te olan bir kullanıcı "Tümü"ne geçip Set 4 Kart 10'a ulaştığında, tekrar "Temel 300"e döndüğünde Set 2 Kart 5'ten; "Tümü"ne döndüğünde ise Set 4 Kart 10'dan eksiksiz ve anlık olarak devam eder. Eski tekil anahtarlarla geriye dönük tam uyumluluk (backward compatibility) sağlanmıştır.
    - **Toplam Kelime Sayısı Göstergesi & İlerleme Çubuğu Kontrast Tasarımı (Set Progress Bar & High-Contrast Track):**
      - İlerleme çubuğunda kaçıncı sette bulunulduğunun yanı sıra, seçili kapsamdaki toplam kelime adedi parantez içinde açıkça belirtilir: `SET 1 / 15 (300)` veya `SET 1 / 52 (1026)`.
      - **Yüksek Kontrastlı Oluk (Track Groove):** Koyu tema zemininde (`bg-black` / `bg-zinc-950`) kaybolan eski `bg-zinc-950 border-white/5` oluk yapısı yerine; Apple standartlarında belirgin, yüksek kontrastlı `h-2 bg-zinc-800 rounded-full border border-zinc-700/80 shadow-inner` kanal yapısı uygulanmıştır. İlerleme dolgusu (`bg-blue-500` / `bg-emerald-500`), bu net oluk hattı üzerinde doluluk oranını karanlıkta dahi mükemmel optik ayrışmayla gösterir.
    - **Üst Menü ve Seviye Sekmeleri Simetrik Merkezleme Mimarisi (Header & Level Tabs Centered Alignment):** 
      - **Dengeli 3 Sütunlu Izgara:** Flaşkartlar ekranının üst başlığında `grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start` dengeli 3 sütunlu ızgara yapısı kullanılarak sol blok (`Ana Sayfa` butonu) ve sağ blok (`Home` simgesi) eşit genişlikte dengelenmiş, orta sütun matematiksel olarak ekran merkezine oturtulmuştur.
      - **Üst Butonlara Göre Ortalanmış Seviye Sekmeleri:** `Dinleme Modu`, `Mod Seç`, `TR -> EN` buton grubu ile altındaki `A1 - C2` seviye sekmeleri ve kapsam seçici hapı aynı orta kolon içinde `flex flex-col items-center justify-center` yapısıyla ortalanmıştır. Dinleme modu butonuna sol kenardan hizalanma sebebiyle sağ tarafta oluşan asimetrik boşluk tamamen giderilmiş, kusursuz bir optik merkezleme sağlanmıştır.
    - **Mobil Web Responsive & Küçük Ekran Optimizasyonları (320px - 480px Viewport Optimization):** 
      - **Kaydırmasız Tek Ekran Yerleşimi (Viewport-Fit UX):** iPhone SE (375px), Android (360px) ve küçük mobil cihazlarda dikey kaydırmayı (scroll) tamamen ortadan kaldırmak amacıyla kart boyutları (`aspect-[4/4.8] max-h-[38vh] sm:max-h-[46vh] min-h-[250px] sm:min-h-[290px]`, iç padding `p-4 sm:p-6`) ve dikey boşluklar dinamik olarak optimize edilmiştir. "Öğrenmedim / Biliyorum" ve "Sıradaki / Başarılı" butonlarının en küçük mobil cihazlarda dahi tek ekranda görünür kalması güvenceye alınmıştır.
      - **Kompakt Başlık ve Esnek Tipografi:** Üst başlıkta dar ekran kenar boşlukları (`px-3 sm:px-6 md:px-10 py-2.5 sm:py-4`) ve mod butonlarında esnek tipografi (`text-[10px] sm:text-xs`) ile kompakt padding (`px-2.5 py-1.5 sm:px-3.5 sm:py-2`) kullanılarak dar ekranda taşma önlenmiştir.
      - **Yatay Kaydırılabilir Seviye Sekmeleri:** Seviye sekmeleri (A1 - C2) dikeyde satır kırarak ekran yüksekliğini işgal etmek yerine gizli çubuklu, pürüzsüz yatay kaydırma (`overflow-x-auto no-scrollbar shrink-0`) yapısıyla sunulmuştur.
      - **Dokunmatik Hedef Erişilebilirliği (Touch Target Accessibility):** Hands-Free Dinleme Modu oynatıcı çubuğunda (`ListeningModeBar`) dar mobil genişlik (`max-w-md sm:max-w-xl`), taşmayan durum rozetleri (`truncate`) ve Apple HIG standartlarına uygun dokunmatik buton hedefleri (`min-w-[36px] min-h-[36px]`) sağlanmıştır.
    - **Kusursuz ve Anlık Sekme Geçişi (Zero-Flicker Tab Transition):** Seviye sekmeleri (A1-C2) arasında geçiş yapıldığında, yerel veri paketleri (`getLocalLibraryWords`) sayesinde kelimeler anlık (0ms) ve senkronize olarak yüklenir. Asenkron veri çekimleri sırasında oluşan ara durumlar için `isLoading` ve `isLevelTransitioning` koruması getirilmiş; sekme geçişi esnasında "Kelime Bulunamadı" modalının anlık görünmesi (flicker) tamamen engellenmiştir.
    - **Seçim & Sıralama Mantığı:** Kelimeler oluşturulma tarihine göre 20'şerli setlere bölünür. Seviye sekmeleri (A1, A2, B1, B2, C1, C2 vb.) ve çalışma modları arasında geçiş yapıldığında 1. kelimenin sürekli değişmesini önlemek adına deterministik/sabit sıralama uygulanır.
    - **Kütüphane Kelime Düzeltmeleri & Oxford 3000/5000 CEFR Seviye Uyumluluğu:** 
      - A1 kelime havuzunda bağlamsal doğruluğu artırmak için Türkçe çeviriler rafine edilmiştir (Örn: "Blog" -> "Web günlüğü", "Cell" -> "Hücre").
      - **A1 Seviye Denetimi (Oxford CEFR A1 Standardı):** A1 havuzundaki kelimeler Oxford 3000/5000 resmi CEFR veri tabanıyla çapraz denetlenmiş; başlangıç seviyesine uygunsuz olan ve B1/B2 seviyelerine ait 65 kelime (örneğin A1 4. sette yer alan soyut `Instruction` [B1] kelimesi yerine temel `Rule` [A1]; ayrıca `Examination` -> `Project`, `Software` -> `Sound`, `Keyboard` -> `News` vb.) doğrudan kategoriye uygun resmi Oxford A1 kelimeleriyle değiştirilmiştir.
      - **A2 Seviye Denetimi (Oxford CEFR A2 Standardı):** A2 havuzunda yer alan 27 adet C1 kelimesi (`Broadband`, `Hardware`, `Upgrade` vb.) ve 106 adet ileri/akademik B2 kelimesi (`Absolute`, `Adequate`, `Efficient`, `Vital`, `Contract`, `Surgery` vb.) tespit edilmiş; tamamı pedagojik olarak tam uyumlu 133 adet resmi Oxford A2 kelimesiyle (`Communicate`, `Electronic`, `Code`, `Deal`, `Achieve`, `Condition` vb.) güncellenmiştir.
      - Tüm güncellemeler hem `src/data/json/` hem de `docs/` altındaki Excel (`.xlsx`) dosyalarıyla tam senkronize edilmiştir.
    - **Mod Değiştirme:** Kartlar çalışma ekranının üst menüsünde bulunan "Mod Seç" butonu ile istenildiğinde mod seçim ekranına dönülebilir.
    - **Otomatik Telaffuz:** Kartın İngilizce yüzü görüntülendiği anda seslendirme otomatik yapılır.

- **Quiz (Test Çöz - Çalışma Modları & Kütüphane Entegrasyonu):** 
    - **2 Farklı Çalışma Modu (Mode Selector):**
      1. **Kütüphaneden Çöz (Ortak Alan):** Tüm kullanıcıların erişebildiği global kütüphanedeki A1, A2, B1, B2, C1, C2 seviye kelime havuzları ile test çözme imkanı. Test ekranı başlığında yer alan seviye sekmeleri ile anında seviye değiştirilebilir; her seviye için bağımsız kalıcı hafıza anahtarları (`lingua_quiz_set_num_${level}`, `lingua_quiz_current_index_${level}`, `lingua_quiz_active_ids_${level}`) kullanılır. Yanlış şıklar (distractors) ilgili seviyenin kelime havuzundan dinamik olarak çekilir.
      2. **Listendeki Kelimelerle Çöz (Bireysel Alan):** Kullanıcının kendi eklediği kişisel kelime listesi üzerinden kronolojik 20'şerli setlerle test çözme ortamı.
    - **Çalışma Modu Seçici Modal (`QuizModeSelectionModal`):** Dashboard üzerinden veya test içindeki "Mod Seç" butonuyla açılan, 1. Kütüphaneden Çöz (Emerald) ve 2. Listendeki Kelimelerle Çöz (Mor) seçeneklerini içeren minimalist modal ("Yeni kelimelerle çalış" modu test çözme mantığına uygun olmadığı için hariç tutulmuştur).
    - Çoktan seçmeli, puan tabanlı dinamik testler.
    - **Seçim Mantığı:** Aktif kelimeler kronolojik veya seviye bazlı olarak 20'şerli setlere bölünür ve set içi karıştırılarak test oluşturulur.
    - **Kaldığın Yerden Devam:** Çalışılan aktif set numarası ve set içindeki aktif soru sırası çalışma modu ve seviyeye göre izole olarak otomatik kaydedilir. Test yarım kalırsa kalınan set ve sorudan devam edilir.
    - **İlerleme Takibi & Kompakt Format:** Ekranın üstünde yer alan progress bar, Kartlar modülündeki formatla tam olarak hizalanmıştır: Barın hemen üstündeki tek satırda hem mevcut set içi ilerleme (`İlerleyen: X / Y`) hem de set ve toplam kelime sayısı (`SET X / Y (Toplam)`) gösterilir. Barın altında yer alan gereksiz ikinci satır kaldırılarak dikey alan tasarrufu sağlanmıştır.
    - **Sıfır Kaydırma & Viewport-Fit Tasarım (Zero-Scroll Layout):** Test Çöz ekranında aşırı dikey boşluklar, padding'ler ve buton min-yükseklikleri optimize edilerek soru kartı ve 4 seçeneğin tüm ekran çözünürlüklerinde (özellikle laptop ve dar mobil ekranlarda) kaydırma çubuğu (scroll) gerektirmeden tek ekrana tam sığması sağlanmıştır.
    - **Otomatik Telaffuz & Ses Kontrolü:** Cevap seçildiği anda doğru İngilizce kelimenin telaffuzu otomatik olarak seslendirilir. TR-EN yön butonunun yanındaki hoparlör ikonu ile bu özellik açılıp kapatılabilir.
    - **Yapılan Yanlışları İzleme:** Test bitiş ekranında yanlış cevaplanan kelimeleri detaylı inceleme ve telaffuzlarını dinleme modalı.
    - **WhatsApp ile Skor Paylaşımı & Meydan Okuma (Quiz Challenge):**
      - **Header ve Bitiş Ekranı Paylaşım Butonu:** Kütüphaneden Çalış test ekranının sağ üst köşesinde (skor rozetinin hemen yanında) ve test tamamlandığında bitiş ekranında yer alan "Skorunu Paylaş / Meydan Oku" butonu ile aktif set ve alınan puan tek tıkla paylaşılabilir.
      - **Ultra-Kısa WhatsApp Davet Linki & Parametreleri:** Seviye, set numarası ve alınan puan ultra-kompakt `?ch=LEVEL-SET-SCORE` formatında kodlanır (örn: `?ch=B1-1-20`). WhatsApp ve mobilde satır sonu kırılması, bölünme veya yüzlerce karakterlik `ids` şişkinliği tamamen önlenir. Geriye dönük uyumluluk (`?challenge=quiz&lvl=...`) korunur.
      - **İzole Çalışma Garantisi (Zero-Conflict Session):** Linke tıklayan arkadaşların kendi çalışma setleri, kaldıkları soru sıraları veya aktif ID'leri **kesinlikle ezilmez ve sıfırlanmaz**. Meydan okuma oturumu bellekte izole çalışır (`isChallenge: true`) ve yerel depolama anahtarlarını etkilemez.
      - **Girişsiz Misafir Erişimi & Sıfır-Siyah Ekran Koruması:** Hesabı olmayan veya giriş yapmamış arkadaşlar Auth engeline takılmadan linke tıklayarak doğrudan yarışmaya katılır. Uygulama başlatma anında mod ve seviye senkronize yüklenir, oturumsuz durumlarda Dashboard veya null render çökmesi engellenir.
      - **Kazandın / Kaybettin Sonuç Modalı & WhatsApp Yanıtı:** Davetli testi tamamladığında kendi puanı ile meydan okuyanın puanını karşılaştıran dinamik sonuç modalı açılır (`Kazandın! 🏆`, `Kaybettin! 😢`, `Berabere! 🤝`) ve "WhatsApp ile Sonucu Gönder" butonuyla hazır karşılaştırma metnini meydan okuyana geri gönderebilir.
    - **Boş Liste Koruması:** Kullanıcının henüz kendi kelimesi olmasa bile Dashboard'dan Test Çöz modülünü başlatıp doğrudan Kütüphaneden Çöz moduna geçebilmesi.

- **Cümleler (Sentence Builder & Kütüphane Cümle Pratiği):** 
    - İnteraktif yazım pratiği ve mod seçim modalı.
    - **Hizalanmış Mod Seçim Sırası (Aligned Mode Selector):** Cümleler modülündeki çalışma modları sırası, Kartlar modülü ile tam olarak hizalanmıştır:
      1. **Kütüphaneden Çalış** (Ortak alan; yardımcı fiil ve modallar özelinde çalışma)
      2. **Listendeki Kelimelerle Çalış** (Bireysel alan; kullanıcının kendi kelime listesi)
      3. **Yeni Cümlelerle Çalış** (Resim yükleme ve özel setler)
    - **Esnek Kontrol:** Kısaltmaları (I'm / I am, She's / She is) kabul eden akıllı eşleşme algoritması.
    - **Sesli Geri Bildirim:** Doğru cevaplarda otomatik telaffuz.
    - **Kaldığın Yerden Devam:** Her set için son çalışılan satırın otomatik kaydedilmesi ve scroll focus.
    - **Bitiş Ekranı Pop-up İyileştirmesi ve Kilitlenme Koruması (Finish Modal Resilience):**
      - Set tamamlandığında açılan "Harika Bir Set!" modalına (X) kapatma butonu eklenmiştir.
      - "Yeni Set Üret" tıklandığında eski tamamlanma kayıtları yerelden ve hafızadan temizlenerek yeni 34 cümlenin sorunsuz yüklenmesi sağlanmıştır.
      - "Karma Çalışma" %100 bitmişse, kütüphaneden tekrar tıklandığında bitmiş ekranı yerine doğrudan yeni bir karma set üretilir.
      - Cümle tamamlama kontrolü (`isAllCompleted`) sahte/bayat anahtarlara karşı yalnızca setteki geçerli cümle ID'lerini doğrulayacak şekilde güçlendirilmiştir.
      - "Dashboard'a Dön" işlemi SPA standartlarında pürüzsüz rota geçişine (`setMode(AppMode.HOME)`) dönüştürülmüştür.

### 2.3. İçerik Yönetimi
- **LinguaCard Kütüphanesi:** A1-C2 seviye kelime setleri ve Gramer konularına (Yardımcı fiiller, Modal'lar vb.) göre kategorize edilmiş hazır çalışma setleri.
- **Kapsamlı Arşiv OCR ve Türkçe Karakter Temizliği (34 Set & 1.031 Cümle Düzeltmesi):**
  - Orijinal Perfectionist English taranmış PDF kaynakları (`docs/resources/PratikYap/`) alt ajanlar tarafından 4 ana grupta (Aux 1-9, Aux 10-18, Modal 1-8, Modal 9-16) sayfa sayfa incelenmiş; şüpheli ve bozuk cümleler PDF görüntü kırpmalarıyla doğrulanmıştır.
  - Toplam **1.031 cümle** düzeltilerek hem `src/data/libraryData.ts` hem de `src/data/json/all_sentences.json` dosyalarına atomik olarak işlenmiştir.
  - Öne çıkan düzeltmeler:
    - Bozuk Türkçe karakter ve OCR hataları (`aux-11 s93`: `"Uğ yıl içinde farklı bir ıılkede yaşayacağım."` ➔ `"Üç yıl içinde farklı bir ülkede yaşayacağım."`).
    - Eksik/kesik bırakılmış çevirilerin orijinal kaynakla tamamlanması (`aux-17 s93`: `"KG"` ➔ `"Kötü iş etiğine göre, muhtemelen önümüzdeki yıl bu şirket için çalışıyor olmayacaksın."`, `aux-14 s36`, `aux-14 s47`, `aux-15 s1`, `aux-17 s12`, `aux-17 s44`, `aux-17 s71`, `aux-18 s41`, `modal-11 s57`, `modal-12 s58`).
    - Kaymış/atlamış cümlelerin telafisi (`aux-11 s58` İngilizce karşılığı düzeltildi ve eksik `aux-11 s59` `"Frank Tıp okuyacak."` arşive eklendi; `modal-16 s1` boş İngilizce metni tamamlandı).
    - Anlamı bozan kritik OCR bozulmaları giderildi (`modal-12 s56`: `"Öldüğün gibi dışarı çıkabilirsin."` ➔ `"Olduğun gibi dışarı çıkabilirsin."`, `modal-15 s59`: `"Ölüm doktor olmak istiyor."` ➔ `"Oğlum doktor olmak istiyor."`).
    - Karakter, rakam ve ses kaymaları (`6gren` ➔ `öğren`, `sGyliiyor` ➔ `söylüyor`, `deiilller` ➔ `değiller`, `ıınıversite` ➔ `üniversite`, `ııniforma` ➔ `üniforma`, `calığşmak` ➔ `çalışmak`, `tırmanistan` ➔ `tırmanıştan`, `dain` ➔ `dağın`, `dlcumii` ➔ `ölçümü`).
  - Tüm düzeltmeler `tests/turkishCharacterAndOcrFixes.test.js` birim testleriyle TDD standardında güvenceye alınmıştır.
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
- **Modüller Arası Tutarlı Mod Seçim Modalları (Cross-Module Aligned Selection Modals):** Kartlar, Cümleler ve Test Çöz modüllerinde ortak görsel hiyerarşi, renk kodlaması (Yeşil: Kütüphane, Mor: Kişisel Liste, Mavi: Yeni İçerik/AI) ve standart ikonografi:
  - **Kartlar:** 1. Kütüphaneden Çalış, 2. Listendeki Kelimelerle Çalış, 3. Yeni Kelimelerle Çalış
  - **Cümleler:** 1. Kütüphaneden Çalış, 2. Listendeki Kelimelerle Çalış, 3. Yeni Cümlelerle Çalış
  - **Test Çöz:** 1. Kütüphaneden Çöz, 2. Listendeki Kelimelerle Çöz (Yeni kelimeler hariç tutulmuştur)
- **A1–C2 Seviye Sekmeleri:** Kütüphane ve Test modlarında 6 CEFR seviyesi (A1, A2, B1, B2, C1, C2) arasında sıfır gecikmeli (0ms) ve titreşimsiz (zero-flicker) sekme geçişi.
- **Hands-Free Dinleme Modu Deneyimi:** Ekrana dokunmadan kilit ekranından ve Bluetooth kulaklık üzerinden çalışma imkanı; şık yüzen kontrol barı (`ListeningModeBar`), animasyon geçiş koruması ve sızıntısız kart akışı.
- **Hassas Dikey Hizalama & Tipografik Denge:** Başlık kontrolleri ile seviye sekmelerinin matematiksel olarak aynı dikey hizada konumlanması, 3 sütunlu dengeli ızgara yapısı.
- **Mobil Web Öncelikli & Viewport-Fit Uyum:** 320px - 480px küçük ekranlarda ve laptop pencerelerinde dikey kaydırmayı ortadan kaldıran dinamik viewport sığdırma ve dokunmatik erişilebilirlik. Test Çöz ekranında tüm şıklar kaydırma yapmadan tek ekranda görüntülenir.
- **Sade ve Odaklı Arayüz:** Dashboard üzerindeki yönlendirme tooltip'leri kaldırılarak daha temiz, dikkat dağıtmayan ve doğrudan aksiyona odaklanan minimalist arayüz sağlanmıştır.
- **Kompakt ve Dengeli Anasayfa Hiyerarşisi (Compact UI Ergonomics):** 
  - **Header:** Aşırı büyük `w-16 h-16` logo kutusu ve `w-14 h-14` profil butonu, Apple standartlarında minimalist `w-11 h-11` ve `w-10 h-10` ölçeklerine; başlık boyutu `text-2xl` ve padding `px-6 py-5` seviyesine optimize edilmiştir.
  - **Pratik Banner'ı:** Aşırı yer kaplayan `rounded-[32px]` ve `p-8` gövde, `rounded-2xl` ve `p-5 md:p-6` formatına çekilmiş; "AI ile Yükle" ve "Manuel Ekle" butonları kompakt dokunma ergonomisiyle (`px-4 py-2.5 rounded-xl`) küçültülmüştür.
  - **Modül Kartları (Kartlar, Test Çöz, Cümleler):** İkon kutuları `w-10 h-10`, kart başlıkları `text-base` ve kart gövdeleri `rounded-2xl p-4 sm:p-5` olarak düzenlenmiş, ekran alanından tasarruf edilmiştir.
  - **Kelime Listem Alanı:** Başlık (`text-lg`), arama çubuğu (`py-2.5 rounded-xl text-sm`) ve "Hızlı Ekle" butonu (`py-2.5 px-4 rounded-xl`) kompaktlaştırılmıştır.
  - **Kelime Kartları:** `p-4 rounded-2xl` gövde, `text-base` İngilizce başlık, `text-xs` Türkçe anlam, `min-h-[72px]` kompakt örnek cümle flip kutusu ve ergonomik işlem butonları ile tek bakışta daha fazla kelime görünür kılınmıştır.
- **Kompakt ve Kaydırmasız Set Sonu Bildirim Popupları (Zero-Scroll Completion Views):**
  - **QuizMode:** Kullanıcıyı dikey scroll yapmaya zorlayan aşırı büyük `p-10 rounded-[56px]`, `w-20 h-20` ikon, `text-7xl` skor ve `py-4 rounded-3xl` buton yapıları; `p-4 sm:p-5 rounded-3xl`, `w-9 h-9` ikon, `text-4xl` skor ve `py-2.5 rounded-xl` kompakt buton yapısına kavuşturulmuştur. Tüm skor istatistikleri ve aksiyon butonları mobil ekran dahil tek ekranda, kaydırmasız olarak görüntülenir. Ayrıca "Mod Seç / Değiştir" butonu popup'tan kaldırılarak kafa karışıklığı önlenmiş; "Arkadaşlarını Challenge'a Davet Et" CTA butonu `Swords` ikonu ile 1. sıraya taşınmıştır.
  - **FlashcardMode & SentenceMode & Özel Setler:** "Harika Bir Set!" bitiş kartlarındaki `p-12 / p-10`, devasa kupa ikonları ve kalın butonlar kompakt `p-4 sm:p-5 rounded-3xl` ve `py-2.5 rounded-xl` buton ergonomisiyle hizalanmıştır.
- **WhatsApp ve Sosyal Medya Marka Kimliği (Open Graph & PWA Brand Asset):**
  - WhatsApp link paylaşımlarında çıkan yanıltıcı sarı-siyah dinleme modu ikonu tamamen kaldırılmıştır.
  - LinguaCard'ın resmi kurumsal kimliği (mavi-indigo gradient açık kitap ikonu + LinguaCard tipografisi + "YAPAY ZEKA DESTEKLİ KELİME ÖĞRENME PLATFORMU" sloganı); `public/og-image.png` (1200x630 geniş banner), `public/icon-512.png` ve `public/icon-192.png` kare formatlarında yeniden üretilmiştir.
  - `index.html` içerisine `og:image`, `og:image:secure_url`, `og:title`, `og:description` ve `twitter:image` meta etiketleri eksiksiz eklenmiştir.
- **Premium Arayüz:** Karanlık mod odaklı, neon efektli, glassmorphism ve akıcı animasyonlar.

---

## 4. Teknik Altyapı
- **Frontend:** React 19 + Vite (Performance-first).
- **Veritabanı & Auth:** Supabase (Real-time data, RLS & secure authentication). 30 Ekim 2026 Supabase PostgREST güvenlik güncellemesi gereğince tüm public tablolar (`words`, `user_progress`) için `anon`, `authenticated` ve `service_role` rolleri açık `GRANT` direktifleriyle güvenceye alınmıştır.
- **Veri Şeması:** `words` (`category`, `word_type`, `set_name`, `user_id`), `user_progress` (`word_id`, `user_id`, `status`, `module`).
- **Ses & Arka Plan Medya Motoru:** Web Speech API (`speechSynthesis`), HTML5 Audio (`audioStudyService`), Silent Keep-Alive Loop (arka planda dondurma engeli), Media Session API (`navigator.mediaSession`).
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
- **Aktif Lokal Sürüm:** `v1.2.19` (22 Ekim 2026)
- **Hedef Sürüm Kilometre Taşı (Milestone):** `v1.2.0` (A1-C2 Tam Kütüphane, Hands-Free Dinleme Modu, Bağımsız Hafıza ve Mobil Responsive Paketi)
- **Sürüm Formatı:** `vX.Y.Z - DDMMYY`
- **Otomatik Artış:** Yerelde yeni bir özellik geliştirildiğinde veya fix yapıldığında versiyon numarası mutlaka artırılır ve tarih damgası güncellenir. Sürüm `1.0.99` değerine ulaştıktan sonra `1.2.0` şeklinde devam eder.
- **Lokal ve Canlı Versiyon Ayrımı:** Kullanıcıya bilgilendirme yapılırken Lokal Versiyon ile Canlı Versiyon (`gh-pages`) her zaman ayrı ve net olarak belirtilir. Canlı derlemede `prebuild` tetiklenmesiyle oluşan versiyon artışı raporlanır.

---

## 7. Gelecek Yol Haritası (Roadmap)
- [x] **A2-B2 Kelime Setlerinin Tamamlanması:** A2-1000, B1-1000 ve B2-1000 seviye verilerinin hazırlanması, docs klasörüne Excel (`.xlsx`) olarak eklenmesi ve kütüphaneye entegrasyonu tamamlandı.
- [x] **C1-C2 Kelime Setlerinin Tamamlanması:** C1-1000 ve C2-1000 seviye verilerinin hazırlanması, docs klasörüne Excel (`.xlsx`) olarak eklenmesi ve kütüphaneye entegrasyonu tamamlandı.
- [x] **Hands-Free Arka Plan & Kilit Ekranı Dinleme Modu:** HTML5 Audio Silent Loop, Media Session API ve Bluetooth donanım kontrolleri tamamlandı.
- [x] **Bilgi Gizliliği Korumalı Kart Geçiş Senkronizasyonu:** Çevirinin yeni kelimeye sızmasını engelleyen 3D animasyonlu geçiş fazı tamamlandı.
- [x] **Seviye Bazlı Bağımsız Kalıcı Hafıza:** Her CEFR seviyesi (A1-C2) için bağımsız indeks, set ve aktif ID depolaması tamamlandı.
- [x] **Üst Başlık Dikey Hizalama Mimarisi:** 3 sütunlu dengeli ızgara ve sol kenar dikey hizalaması tamamlandı.
- [x] **Mobil Web Responsive & Küçük Ekran Uyumu:** 320px-480px ekranlarda viewport-fit kaydırmasız kart tasarımı ve dokunmatik erişilebilirlik tamamlandı.
- [ ] **Aralıklı Tekrar (Spaced Repetition):** Unutma eğrisine göre kart hatırlatma.
- [ ] **Mobil Native Uygulama:** iOS ve Android sürümleri.
