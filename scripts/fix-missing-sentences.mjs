import fetch from 'node-fetch';

const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

const headers = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json'
};

async function fixMissingSentences() {
  console.log("Kelimeler veritabanından çekiliyor...");
  
  try {
    // 1. Tüm kelimeleri çek
    const getUrl = `${supabaseUrl}/rest/v1/words?select=id,word_en,word_tr,example_sentence_en,example_sentence_tr`;
    const resp = await fetch(getUrl, { headers });
    if (!resp.ok) {
      throw new Error(`Kelimeler çekilemedi: ${resp.statusText}`);
    }
    
    const words = await resp.json();
    console.log(`Toplam ${words.length} kelime bulundu.`);

    // 2. Geçersiz olanları filtrele
    const invalidWords = words.filter(w => {
      const en = (w.word_en || '').trim().toLowerCase();
      const ex = (w.example_sentence_en || '').trim().toLowerCase();
      
      // Örnek cümle yoksa, kelimenin kendisiyse veya 3 harften kısaysa geçersizdir
      return !ex || ex === en || ex.length <= 3;
    });

    console.log(`Düzeltilmesi gereken ${invalidWords.length} kelime tespit edildi.`);

    if (invalidWords.length === 0) {
      console.log("Düzeltilmesi gereken kelime yok. İşlem tamamlandı.");
      return;
    }

    // 3. Her birini Edge Function kullanarak düzelt
    for (let i = 0; i < invalidWords.length; i++) {
      const w = invalidWords[i];
      const wordText = w.word_en || w.word_tr;
      console.log(`[${i + 1}/${invalidWords.length}] "${wordText}" düzeltiliyor...`);

      try {
        const fnResp = await fetch(`${supabaseUrl}/functions/v1/analyze-image`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            textInput: wordText,
            analysisType: 'text'
          })
        });

        if (!fnResp.ok) {
          console.error(`Edge Function hatası (${fnResp.status}): ${fnResp.statusText}`);
          continue;
        }

        const fnData = await fnResp.json();
        const extracted = fnData.word && fnData.word[0];

        if (extracted && extracted.example_sentence) {
          const newExEn = extracted.example_sentence;
          const newExTr = extracted.turkish_sentence || '';
          
          console.log(`-> Üretilen Cümle: "${newExEn}" (${newExTr})`);

          // Veritabanını güncelle
          const updateUrl = `${supabaseUrl}/rest/v1/words?id=eq.${w.id}`;
          const patchResp = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              example_sentence_en: newExEn,
              example_sentence_tr: newExTr
            })
          });

          if (patchResp.ok) {
            console.log(`-> Başarıyla güncellendi.`);
          } else {
            console.error(`-> Güncelleme hatası: ${patchResp.statusText}`);
          }
        } else {
          console.warn(`-> AI anlamlı bir cümle üretemedi.`);
        }
      } catch (err) {
        console.error(`-> Hata oluştu:`, err.message);
      }

      // API limitlerine takılmamak için kısa bir bekleme
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log("Tüm kelimeler başarıyla tarandı ve düzeltildi.");

  } catch (error) {
    console.error("HATA:", error.message);
  }
}

fixMissingSentences();
