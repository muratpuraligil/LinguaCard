# LinguaCard Hindsight Memory (Kalıcı Mimari Hafıza)

Bu döküman, LinguaCard projesinde ajanların edindiği deneyimleri, mimari kalıpları, çözülen kritik hataları ve sistem gerçeklerini kalıcı bir hafıza (Long-term Memory) olarak tutar.

---

## 🧠 1. Kalıcı Deneyimler & Çözülen Kritik Hatalar (Retained Learnings)

### 1.1. Flaşkartlar İlerleme Takibi ve Kaldığı Yerden Devam
- **Hafıza Gerçeği:** `FlashcardMode` bileşeni unmount olduğunda (örneğin Dashboard'a dönüldüğünde) `currentIndex` varsayılan olarak `0` oluyordu.
- **Kalıcı Çözüm:** `STORAGE_KEYS.CURRENT_INDEX` (`lingua_flashcard_current_index_{mode}_{level}`) ve `STORAGE_KEYS.SET_NUM` (`lingua_flashcard_set_num_{mode}_{level}`) yerel depolamada saklanır. Sayfa yeniden açıldığında kullanıcı kaldığı karttan devam eder.
- **Set Yenileme / Ekleme Kuralı:** Yeni kelime topluca eklendiğinde (`App.tsx`), yeni kelimelerin setin başına gelmesi için aktif set ve indeks anahtarları temizlenir.

### 1.2. 3 Kademeli AI Dayanıklılığı (Resilient OCR & Fallback)
- **Hafıza Gerçeği:** Edge Function veya Gemini API kesintilerinde kullanıcı arayüzü kilitlenmemelidir.
- **Kalıcı Çözüm:** 1. Kademe Supabase Edge Function (`gemini-2.0-flash`), 2. Kademe İstemci Gemini API (`VITE_GEMINI_API_KEY`), 3. Kademe Yerel Metin Ayrıştırıcısı (Local Parser) kesintisiz yedekli çalışır.

### 1.3. Karakter Bozulmaları ve Dizge Eşleştirme (String Normalization)
- **Hafıza Gerçeği:** Cümle pratiği ve OCR'dan gelen verilerde `'` ile `’`, `é`, `¢`, `§`, OCR kaynaklı `|` -> `I`, `1` -> `I` hataları meydana gelebilir.
- **Kalıcı Çözüm:** `src/utils/stringUtils.ts` içerisindeki `isMatch` ve `cleanPunctuation` yardımcıları tüm modüllerde (`SentenceMode`, `LibraryPracticeScreen`, `CustomSetStudyMode`) standart olarak kullanılmalıdır.

### 1.4. Orijinal Doküman Kaynakları & OCR/Gramer Düzeltmeleri
- **Hafıza Gerçeği:** Projedeki kütüphane cümleleri `docs/resources/PratikYap/` klasöründeki orijinal Perfectionist English PDF antrenman ve cevap anahtarı kitapçıklarından taranmıştır. Bazı cümlelerde orijinal PDF basımında dizgi hataları (örn. `18. WILL HAVE BEEN Ving.pdf` sayfa 3 satır 72'de kural gereği `have been boiling` olması gerekirken orijinal PDF'te `have been boil` basılmıştır) veya tarama/OCR aşamasında ünlem/harf karışıklıkları (örn. Modal-5 satır 22'de `so! can't` -> `so I can't`, `Alt:` -> `Altı`, `galamıyorum` -> `çalamıyorum`; Aux-12 satır 65'te `kalacaoim` -> `kalacağını`) oluşabilir.
- **Kalıcı Çözüm:** Cümle şüphelerinde doğrudan orijinal PDF sayfaları (`docs/resources/PratikYap/`) incelenmeli, hem basım kaynağındaki orijinal durum hem de doğru dilbilgisi kuralı kullanıcıya açıkça sunulmalı; `all_sentences.json` ve `libraryData.ts` dosyaları TDD testleriyle doğrulanarak düzeltilmelidir.
- **Kapsamlı Arşiv Denetimi (34 Set & 1.031 Düzeltme):** Tüm arşiv (18 Yardımcı Fiil, 16 Modal Verb, ~3.400 cümle) alt ajanlarla taranmış PDF sayfalarından incelenerek `aux-11 s93` (`"Uğ yıl..."` -> `"Üç yıl içinde farklı bir ülkede yaşayacağım."`), `aux-17 s93` (`"KG"` -> tam çeviri), `aux-11 s59` (eksik cümlenin eklenmesi), `modal-12 s56` (`"Öldüğün gibi..."` -> `"Olduğun gibi..."`) ve `modal-15 s59` (`"Ölüm..."` -> `"Oğlum..."`) gibi 1.031 cümle düzeltilmiş ve `tests/turkishCharacterAndOcrFixes.test.js` ile doğrulanmıştır.

### 1.5. Supabase Auth `initializePromise` & `onAuthStateChange` Kilitlenmesi (Circular Deadlock)
- **Hafıza Gerçeği:** `@supabase/auth-js` (`v2.89+`) istemcisi başlatıldığında `this.initializePromise` içinde `_recoverAndRefresh()` çalışır ve yerel depolamada geçerli bir oturum varsa `await this._notifyAllSubscribers('SIGNED_IN', currentSession)` çağrılır. Eğer `supabase.auth.onAuthStateChange` içerisine doğrudan `async` bir fonksiyon verilip içeride `await wordService.getAllWords()` gibi bir Supabase sorgusu çalıştırılırsa, Supabase sorgusu token almak için `await supabase.auth.getSession()` -> `await this.initializePromise` beklerken `initializePromise` de `onAuthStateChange` callback'inin bitmesini bekler. Bu döngüsel kilitlenme (circular deadlock) sonucunda hiçbir ağ isteği çıkmaz ve ekran sonsuza dek `"SİSTEM HAZIRLANIYOR..."` ekranında asılı kalır.
- **Kalıcı Çözüm:**
  1. `onAuthStateChange` callback'i içinde asla doğrudan `await supabase.*` veya `await wordService.*` çağrısı yapılmaz; veri çekme işlemleri `setTimeout(..., 0)` ile auth kilit döngüsünün dışına ertelenir.
  2. `supabaseClient.ts` içinde `navigator.locks` kilitlenmelerine karşı 3 saniye zaman aşımı korumalı `safeAuthLock` kullanılır.
  3. `App.tsx` içerisinde `loadingSession` durumu `getSession()` tamamlanır tamamlanmaz (kelime sorgusunu beklemeden, önbellekteki kelimeleri anında göstererek) kapatılır ve 4 saniyelik emniyet zamanlayıcısı (`safetyTimer`) ile sonsuz yükleme ekranı engellenir.

### 1.6. Manuel Kelime Ekleme - AI Analizi & Zaman Aşımı Koruması (AI Fill Resilience)
- **Hafıza Gerçeği:** `WordList.tsx` içerisindeki "AI ile Tamamla" butonunda `handleAiFill` fonksiyonu `await supabase.auth.getSession()` çağrısı yaparak gereksiz yere auth kilidine takılabiliyordu. Ayrıca Tier 1 Supabase Edge Function (`analyze-image`), Tier 2 doğrudan Gemini REST çağrısı (`geminiService.ts`) ve bileşen üzerinde zaman aşımı (timeout) koruması bulunmadığı için ağ veya API aksamalarında buton kalıcı olarak `"AI ANALİZ EDİYOR..."` durumunda kilitleniyordu. Ek olarak `geminiService.ts` içindeki eski modeller (`gemini-2.0-flash`, `gemini-1.5-flash`) emekliye ayrıldığı için doğrudan çağrılar 404 dönüyordu.
- **Kalıcı Çözüm:**
  1. `WordList.tsx`'te gereksiz `getSession()` engeli kaldırıldı; `useRef` destekli `AbortController` ve 12 saniyelik emniyet zamanlayıcısı (`safetyTimeout`) ile unmount anında iptal koruması eklendi.
  2. `analyzeImage.ts` içinde Tier 1 Edge Function çağrısına 7 saniyelik `Promise.race` zaman aşımı getirildi.
  3. `geminiService.ts` içindeki model listesi güncel modellere (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.8-flash`, `gemini-flash-latest`) güncellendi ve 6 saniyelik `fetch` AbortSignal zaman aşımı eklendi.
  4. Tier 3 `localTextParser.ts` yerel sözlüğüne "drop off" vb. popüler kalıplar eklenerek tam çevrimdışı yedekleme sağlandı.

### 1.7. Supabase PostgREST Data API 30 Ekim İzin Standardı (Explicit GRANT Requirement)
- **Hafıza Gerçeği:** 30 Ekim 2026 itibarıyla Supabase, `public` şemasında yeni oluşturulan tablolara PostgREST / Veri API otomatik yetkisi vermeyi durdurmuştur. Açık `GRANT` izinleri tanımlanmayan tablolara istemci SDK'sından (`supabase-js`) yapılan istekler `permission denied` hatası döndürür. Mevcut tablolar (`words`, `user_progress`) bu değişiklikten geriye dönük etkilenmese de, yeni tablo eklemeleri veya sıfırdan şema kurulumları açık `GRANT` gerektirir. Ücretsiz plan (Free Tier) veya maliyetle ilgisi yoktur, saf yetkilendirme kuralıdır.
- **Kalıcı Çözüm:**
  1. `database/SUPABASE_SETUP.sql` ve tüm gelecekteki migration dosyalarında tablo oluşturulurken `anon`, `authenticated` ve `service_role` rolleri için `GRANT SELECT, INSERT, UPDATE, DELETE` izinleri zorunlu olarak eklenmelidir.
  2. `tests/supabasePermissions.test.js` birim testi ile kurulum ve migrasyon dosyalarının bu kurala uyduğu otomatik doğrulanır.


### 1.8. Hands-free Dinleme Modunda Çevirinin Erken Sızması (Card Flip Transition Leak)
- **Hafıza Gerçeği:** Hands-free dinleme modunda çeviri okunduktan sonra kart arkaya dönük (`isFlipped = true`) kalıyordu. Süre dolup `next()` çağrıldığında `currentIndex` hemen artıyor, kart henüz arkaya dönükken bir sonraki kelimenin arkası (çevirisi) ekranda anlık olarak belirip sonra dönüyordu. Bu durum sonraki kelimenin anlamının erkenden görülmesine neden oluyordu.
- **Kalıcı Çözüm:**
  1. `audioStudyService.ts` içinde çeviri telaffuzu bittiğinde doğrudan kelime artırılmaz; önce `transition` fazı tetiklenir.
  2. `FlashcardMode.tsx` bileşeninde `phase === 'transition'` durumunda veya manuel sonraki/önceki butonuna basıldığında `isFlipped = false` yapılarak kart mevcut kelime gösterilirken ön yüze döndürülür.
  3. Kartın 3D dönme animasyonu tamamlandıktan sonra yeni kelimeye geçilir; sonraki kelimenin daima ve yalnızca ön yüzüyle ekrana gelmesi garanti edilir.

### 1.9. Flashcard Üst Başlık Hizalama & Merkezleme (Header Button & Level Tab Centering)
- **Hafıza Gerçeği:** `FlashcardMode.tsx` üst başlığında `flex justify-between` kullanıldığında sol buton (`Ana Sayfa` metinli) ve sağ buton (`Home` sadece ikon) eşit genişlikte olmadığı için orta buton grubu hafifçe sağa kayıyordu. Daha sonra `items-start` ile sol kenardan hizalama yapıldığında ise seviye sekmeleri ile üstteki mod butonları farklı genişlikte olduğundan sağ tarafta asimetrik boşluk kalıyordu.
- **Kalıcı Çözüm:**
  1. Üst başlık `grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start` düzeninde kalarak sol ve sağ kolonlar eşit genişlikte tutulur ve orta kolon ekranın tam merkezine oturtulur.
  2. Orta kolon içerisinde mod butonları ve seviye sekmeleri `flex flex-col items-center justify-center` düzenine alınarak seviye sekmelerinin ve kapsam seçicinin üstteki butonlara göre simetrik biçimde ortalanması sağlandı.

### 1.10. Kademeli Kelime Kapsamı (Temel 300 vs. Tümü) ve İlerleme Göstergesi
- **Hafıza Gerçeği:** Her seviyede 1.000+ kelime bulunması yeni başlayan öğrenciler için başlangıçta göz korkutucu olabilmekteydi. Ayrıca kullanıcının o an aktif sette ve havuzda toplam kaç kelimeyle çalıştığını bilmesi gerekiyordu.
- **Kalıcı Çözüm:**
  1. `FlashcardMode.tsx` içerisine varsayılan olarak `CORE_300` ("⭐ Temel 300", ilk 300 kelime / 15 set) ve opsiyonel `ALL` ("📚 Tümü (1000+)") desteği eklendi.
  2. Kapsam tercihi `lingua_flashcard_library_scope` anahtarıyla yerel depolamada saklanır.
  3. İlerleme çubuğunda toplam kelime sayısı parantez içinde net olarak gösterilir: `SET 1 / 15 (300)` veya `SET 1 / 52 (1026)`.

### 1.11. Mobil Web Kilit Ekranı Flaşkart Artwork & Arka Planda Kesintisiz Çalma
- **Hafıza Gerçeği:** 
  1. `window.speechSynthesis` API'si mobil tarayıcılarda (iOS Safari, Android Chrome) ekran kilitlendiğinde veya başka uygulamaya geçildiğinde WebKit/Chromium tarafından anında uyutulur/durdurulur. Bu nedenle dinleme modu sadece tarayıcı açıkken çalışıyor, ekran kilitlenince donuyordu.
  2. Google Translate TTS endpoint'ine tarayıcıdan istek atıldığında `Referer: https://...` başlığı iletildiği için Google 404 döndürüyor ve kod `speechSynthesis`'e düşüyordu.
  3. iOS Safari `navigator.mediaSession.metadata.artwork` içinde büyük base64 `data:` URI'lerini reddediyor; geçerli HTTPS dosya URL'leri (`icon-512.png`) istiyordu.
  4. Ekran kilitlendiğinde işletim sistemi `setTimeout` ve `setInterval` sayaçlarını donduruyordu.
- **Kalıcı Çözüm:**
  1. `index.html` içerisine `<meta name="referrer" content="no-referrer">` ve `speechAudio.referrerPolicy = 'no-referrer'` eklendi. Google TTS istekleri Referer olmadan 200 OK ile doğrudan gerçek MP3 olarak `<audio>` elementi üzerinden akar.
  2. 3 saniyelik PCM WAV sessizlik taşıyıcısı (`carrierAudio`) arka planda sürekli döngüde tutularak mobil ses oturumu açık bırakılır.
  3. Düşünme süresi ve kart geçiş sayaçları işletim sisteminin dondurabileceği `setTimeout` yerine `carrierAudio.ontimeupdate` donanım saatine bağlandı (`setPhaseTimer`). Ekran kilitliyken dahi ses ve kart geçişleri kesintisiz devam eder.
  4. Kilit ekranı albüm görseli için `public/icon-512.png` ve `public/icon-192.png` gerçek HTTPS URL'leri sağlandı.
  5. Set bittiğinde `FlashcardMode.tsx` içinde 10 saniyelik görsel sayaç çalışır (`autoAdvanceCountdown`); kullanıcı müdahale etmezse bir sonraki sete otomatik geçer ve dinleme modunu kesintisiz sürdürür.

### 1.10. Mobil Web Responsive (320px - 480px Küçük Ekran Optimizasyonu)
- **Hafıza Gerçeği:** iPhone SE (375px) ve Android (360px) gibi dar mobil ekranlarda kartlar ekranı ve floating dinleme çubuğu açıldığında butonların ekrandan taşması, seviye sekmelerinin sararak dikey yüksekliği artırması ve kart yüksekliğinin alt aksiyon butonlarını ("Öğrendim", "Sıradaki") ekran dışına itmesi nedeniyle dikey kaydırma gereksinimi oluşabiliyordu.
- **Kalıcı Çözüm:**
  1. **Başlık Izgarası & Dolgusu:** Üst bar padding'i dar ekranlarda `px-3 sm:px-6 md:px-10 py-2.5 sm:py-4` olarak ayarlanmış; `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` dengeli ızgara korunarak orta kolonun taşması engellenmiştir.
  2. **Mod Butonları & Seviye Sekmeleri:** Mod butonlarında `text-[10px] sm:text-xs` ve `px-2.5 py-1.5 sm:px-3.5 sm:py-2` boyutlandırması uygulanmıştır. Seviye sekmelerine `overflow-x-auto no-scrollbar` ve `shrink-0` verilerek yatayda akıcı ve gizli çubuklu kaydırma sağlanmıştır.
  3. **Viewport-Fit Kart Sınırları:** Kart alanı için `max-h-[38vh] sm:max-h-[46vh]` ve `min-h-[250px] sm:min-h-[290px]` yükseklikleri belirlenerek "Öğrendim" ve "Sıradaki" butonlarının en küçük mobil cihazlarda dahi dikey kaydırma olmadan tek ekranda görünür kalması güvenceye alınmıştır.
  4. **ListeningModeBar Mobil Ergonomisi:** Çubuk genişliği `max-w-md sm:max-w-xl`, dokunmatik hedefler Apple HIG standartlarında `min-w-[36px] min-h-[36px]`, durum rozetleri ise dar alanlarda metin kesintisi (truncate) ve kompakt padding ile korunmuştur.

---

## 🛡️ 2. Bellek Yönetimi & Temizlik Standartları (Memory Leaks Prevention)
- **Web Speech API:** `window.speechSynthesis.speak()` kullanılan tüm bileşenlerde unmount anında `window.speechSynthesis.cancel()` çağrılmalıdır.
- **Blob URL Yönetimi:** `URL.createObjectURL` ile oluşturulan nesneler iş bittiğinde veya unmount anında sadece `blob:` ile başlıyorsa `URL.revokeObjectURL()` ile serbest bırakılmalıdır.
- **Toast ve Zamanlayıcılar:** `setTimeout` referansları `useRef` ile tutulmalı, yeni bildirimde veya unmount anında `clearTimeout()` edilmelidir.

---

## 🎨 3. Tasarım & UX İlkeleri (Product & Frontend Design)
- **Karanlık Neon Teması:** Siyah arka plan (`#000000`, `zinc-900`, `zinc-950`), cam morfolojisi (glassmorphism), renkli parıltı (glow) efektleri ve `Plus Jakarta Sans` fontu korunur.
- **Dokunma ve Geri Bildirim:** Tüm butonlarda `active:scale-95`, net `hover` efektleri ve erişilebilir kontrast oranları esastır.
- **Yüklenme & Boş Durumlar:** Listeler veya seviyeler boş olduğunda kullanıcıyı yönlendiren eylem butonları (`Mod Seç`, `Kelime Ekle`, `A1 Seviyesine Geç`) yer alır.

---

## 🚀 4. Sürüm ve Yayınlama Disiplini (Kaizen & Git Pushing)
- **Versiyon Artışı:** Her fix veya özellik geliştirmede `src/version.ts` ve `package.json` senkronize artırılır (`scripts/bump-version.js`).
- **PRD Takibi:** `docs/PRD.md` her işlevsel değişiklikte otomatik güncellenir.
- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `chore:` standartlarına sadık kalınır.
- **Lokal vs Canlı Versiyon Ayrımı:** `npm run deploy` öncesinde çalışan `prebuild` (`scripts/bump-version.js`) canlıya derlenen sürümü 1 artırır. Kullanıcıya bilgi verilirken hem **Lokal Versiyon** hem de **Canlı Versiyon** (`gh-pages`) ayrı ayrı ve tam doğru numarasıyla bildirilmelidir.

---

## 🧪 5. Test Güdümlü Geliştirme (Test Driven Development - TDD)
- **RED-GREEN-REFACTOR:** Yeni mantık, algoritma veya bugfix geliştirirken önce test yazılır ve çalıştığında başarısız olduğu görülür (`node --test`). Minimal kod ile test yeşile geçirilir, ardından refactoring yapılır.
- **İzole Birim Testler:** `node:test` ve `node:assert` yerleşik test motoru ile yardımcı fonksiyonlar (`stringUtils`, progress hesaplayıcıları vb.) harici ağır bağımlılıklara ihtiyaç duymadan milisaniyeler içinde test edilir.


---

## 💾 6. Çok Boyutlu İlerleme Durum Yönetimi (Multi-Dimensional Scope & Level Persistence)
- **Problem:** Flaşkart modunda seviyeler (`A1..C2`) arasında bağımsız ilerleme varken, seviye içi kapsam filtreleri (`Temel 300` vs `Tümü`) eklendiğinde depolama anahtarlarında sadece `${mode}_${level}` bulunması filtre değişiminde ilerlemenin sıfırlanmasına (`currentIndex: 0`, `currentSetNum: 1`) sebep oluyordu.
- **Çözüm:** Depolama anahtarları `${mode}_${level}_${scope}` biçiminde 3 boyutlu hale getirildi (`getStoredCurrentIndex`, `getStoredSetNum`, `getStoredActiveIds`). Kapsam değişimi anında (`handleScopeChange`) ayrılmakta olan kapsamın verisi diske yazılır ve hedef kapsamın verisi okunarak state'e yüklenir. Eski tek boyutlu anahtarlara geriye dönük fallback sağlandı. Kapsam ve seviye değişikliklerinde `prevConfigRef` senkronize tutularak sahte `setChanged` sıfırlamaları tamamen engellendi.
