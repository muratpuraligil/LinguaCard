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
