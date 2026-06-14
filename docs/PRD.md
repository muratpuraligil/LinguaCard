# LinguaCard PRD (Product Requirements Document) - v1.0.1

## 1. Vizyon ve Hedef
LinguaCard, kullanıcıların kendi çalışma materyallerini (kitaplar, makaleler, videolar, PDF'ler veya kopyalanmış metinler) dijital çalışma kartlarına dönüştürmelerini sağlayan, Yapay Zeka (AI) destekli kişisel bir dil geliştirme ekosistemidir.

Temel hedef; statik ve sıkıcı "hazır kelime listeleri" yerine, kullanıcının **kendi bağlamında karşılaştığı** içerikleri akıllıca analiz edip interaktif antrenmanlara dönüştürmektir.

---

## 2. Temel Özellikler

### 2.1. Akıllı Veri Girişi (AI Entegrasyonu)
- **Görüntü İşleme (OCR):** Kitap sayfaları veya notların fotoğraflarından kelime ve cümle ayıklama.
- **PDF Desteği:** PDF dökümanlarını doğrudan yükleyerek içerik analizi yapabilme.
- **Metin Yapıştırma (CTRL+V):** Panodaki metinleri doğrudan yapıştırarak AI analizini başlatma.
- **Akıllı Hızlı Ekleme:** Tek kelime girildiğinde AI'nın otomatik anlam, örnek cümle ve çeviri üretmesi.
- **Akıllı Bağlamsal Ekleme:** Cümleler, Kütüphane ve Özel Set çalışmalarında kelimelere çift tıklandığında AI'nın arka planda otomatik olarak kelime anlamını, örnek cümleyi ve çevirisini üretip kaydetmesi.

### 2.2. Öğrenme ve Pratik Modülleri
- **Flaşkartlar (Flashcards):** 
    - **Seçim Mantığı:** Aktif (arşivlenmemiş, özel set ismi olmayan veya "Demo Kelimeler" setine ait) kelimeler içinden rastgele karıştırılarak (shuffled) seçilen 20'şerli kart setleri.
    - **Kaldığın Yerden Devam:** Aktif kart setinin (20 kelime) ve çalışılan kart sırasının (indeks) yerel belleğe (`localStorage`) otomatik kaydedilmesi. Sayfadan çıkılsa veya tarayıcı yenilense dahi aynı setten ve kalınan sıradan devam edebilme özelliği.
    - **Otomatik Telaffuz:** Kartın İngilizce olan yüzü ekranda görüntülendiği anda (kart çevrildiğinde veya yeni karta geçildiğinde) otomatik telaffuz yapılır.
    - **Görsel Geliştirmeler (TR Kartı):** Türkçe kelimeleri içeren kart yüzlerinin arka planı `bg-zinc-900` olarak ayarlanarak, koyu sayfa arka planından ayırt edilmesi kolaylaştırılmıştır.
    - **Bilgi Metni:** Navigasyon kontrollerinin altında *"Bu çalışma, kelime listene eklemiş olduğun kelimelerden oluşmaktadır."* bilgi metni yer alır.
- **Quiz (Test Çöz):** 
    - Çoktan seçmeli, puan tabanlı dinamik testler.
    - **Otomatik Telaffuz & Ses Kontrolü:** Cevap seçildiği anda doğru İngilizce kelimenin telaffuzu otomatik olarak seslendirilir. TR-EN yön butonunun yanındaki hoparlör ikonu ile bu özellik açılıp kapatılabilir (durumu `localStorage`'da saklanır). Kapatıldığında hoparlör ikonu üstü çizili görünüm alır.
    - **Yapılan Yanlışları İzleme:** Test bitiş ekranında "Yanlışları görmek için tıkla" bağlantısı bulunur. Tıklandığında yanlış cevaplanan kelimeler, anlamları, örnek cümleleri ve seslendirme butonlarıyla birlikte modal olarak açılır.
- **Cümleler (Sentence Builder):** 
    - İnteraktif yazım pratiği.
    - **Esnek Kontrol:** Kısaltmaları (I'm / I am, She's / She is) kabul eden akıllı eşleşme algoritması.
    - **Sesli Geri Bildirim:** Doğru cevaplarda otomatik telaffuz.
    - **Kaldığın Yerden Devam:** Her set için son çalışılan satırın otomatik kaydedilmesi ve scroll focus.

### 2.3. İçerik Yönetimi
- **LinguaCard Kütüphanesi:** Gramer konularına (Yardımcı fiiller, Modal'lar vb.) göre kategorize edilmiş hazır çalışma setleri.
- **Özel Cümle Setleri:** Kullanıcının kendi oluşturduğu isimlendirilmiş çalışma paketleri (örn: "Unit 1 - Reading").
- **Arşivleme:** Öğrenilen kelimelerin ana listeden temizlenip başarı kütüphanesine aktarılması.

---

## 3. Kullanıcı Deneyimi (UX)
- **Dinamik Dashboard:** "Devam Eden Çalışmalar" ve "Tamamlanan Çalışmalar" ayrımı ile görsel ilerleme takibi.
- **Bölüm Başlıkları:** Kart modülleri ile kelime listesi arasına eklenen belirgin "Kelime Listem" başlığı sayesinde sayfa alt kısımları görsel olarak net bir şekilde ayrılmıştır.
- **Rehberli Tur (Onboarding):** İlk girişlerde veya yeni özelliklerde tetiklenen interaktif tanıtım turu.
- **Premium Arayüz:** Karanlık mod odaklı, neon efektli, glassmorphism ve akıcı animasyonlar içeren modern tasarım.
- **Kütüphane Tasarımı:** Yardımcı Fiiller ve Kip(Modal) Fiiller ekranında solid koyu paneller, neon çerçeveler, arka plan renk geçişleri ve özel kavisli 'Rastgele Oluştur' butonu ile zengin görsel kontrast.
- **Klavye Desteği:** Formlarda 'Enter' ile kontrol, 'Double Click' ile kelimeyi listeye ekleme gibi kısayollar.

---

## 4. Teknik Altyapı
- **Frontend:** React 19 + Vite (Performance-first).
- **Veritabanı & Auth:** Supabase (Real-time data & secure authentication).
- **Yapay Zeka:** Google Gemini AI (Google Generative AI SDK).
- **Dosya İşleme:** Offscreen Canvas (Resim boyutlandırma) + Base64 Pipeline (PDF & High-res OCR).

---

## 5. Uygulama Kuralları ve Mantık
- **Puanlama:** Quiz modunda her doğru cevap 10 puan kazandırır.
- **Esneklik:** Cümle çalışmalarında büyük/küçük harf ve noktalama işaretleri toleranslı kontrol edilir.
- **Veri Güvenliği:** Kullanıcı verileri kişiye özeldir; sadece "Demo" ve "Kütüphane" verileri genel paylaşımlıdır.

---

## 6. Sürüm Takibi ve Release Yönetimi
- **Sürüm Formatı:** `vX.Y.Z - DDMMYY` (Örn: `v1.0.1 - 270426`)
- **Görsel Takip:** Uygulamanın sağ alt köşesinde sabitlenmiş, düşük opaklıklı ve modern bir sürüm badge'i bulunur.
- **Otomatik Artış:** Her majör güncelleme veya hata düzeltmesi sonrasında versiyon numarası manuel olarak artırılır ve tarih damgası güncellenir.

---

## 7. Gelecek Yol Haritası (Roadmap)
- [ ] **Aralıklı Tekrar (Spaced Repetition):** Unutma eğrisine göre kart hatırlatma.
- [ ] **Mobil Native Uygulama:** iOS ve Android için native mağaza sürümleri.
- [ ] **Sesli Giriş:** Cümleleri yazmak yerine konuşarak tamamlama desteği.
- [ ] **İstatistik Dashboard:** Haftalık/Aylık öğrenme grafikleri.
