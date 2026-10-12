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
