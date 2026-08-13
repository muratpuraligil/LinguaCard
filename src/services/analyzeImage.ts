import { supabase } from './supabaseClient';
import { analyzeImageDirect, analyzeTextDirect } from './geminiService';
import { parseTextLocally } from './localTextParser';

const normalizeWord = (w: any) => ({
  english: (w.english || w.word_en || '').trim(),
  turkish: (w.turkish || w.word_tr || w.english || 'Kelime').trim(),
  example_sentence: (w.example_sentence || w.example_sentence_en || `I am practicing '${w.english || 'this phrase'}'.`).trim(),
  turkish_sentence: (w.turkish_sentence || w.example_sentence_tr || `'${w.english || 'bu kalıbı'}' pratik yapıyorum.`).trim()
});

/**
 * Görseli analiz etmek için Supabase Edge Function'ı çağırır.
 * Edge Function başarısız olursa istemci tarafı Gemini API'sine düşer.
 */
export async function analyzeImage(
  base64Image: string,
  session: any,
  signal?: AbortSignal,
  analysisType: 'general' | 'document' = 'general'
) {
  const [meta] = base64Image.split(",");
  const mimeType = meta?.match(/data:(.*);base64/)?.[1] || "image/jpeg";

  // Tier 1: Supabase Edge Function
  try {
    const pureBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: {
        imageBase64: pureBase64,
        mimeType: mimeType,
        analysisType: analysisType
      }
    });

    if (!error && data) {
      const rawList = data.word ? (Array.isArray(data.word) ? data.word : [data.word]) : (Array.isArray(data) ? data : []);
      if (rawList.length > 0) {
        return rawList.map(normalizeWord);
      }
    }
    if (error) console.warn("Supabase Edge Function uyarısı:", error);
  } catch (edgeErr) {
    console.warn("Supabase Edge Function erişilemedi, istemci Gemini servisine geçiliyor...", edgeErr);
  }

  // Tier 2 Fallback: Client-Side Direct Gemini API
  try {
    const directResults = await analyzeImageDirect(base64Image, mimeType);
    if (directResults && directResults.length > 0) {
      return directResults.map(normalizeWord);
    }
  } catch (directErr) {
    console.error("İstemci Gemini görsel analizi hatası:", directErr);
  }

  throw new Error("Görsel analiz edilemedi. Lütfen yazının daha net olduğu bir görsel deneyin.");
}

/**
 * Metin analizi için Supabase Edge Function'ı çağırır.
 * Sırasıyla Edge Function -> İstemci Gemini -> Yerel Metin Ayrıştırıcısı (Local Parser) dener.
 */
export async function analyzeText(
  text: string,
  session: any,
  signal?: AbortSignal
) {
  // Tier 1: Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: {
        textInput: text,
        analysisType: 'text'
      }
    });

    if (!error && data) {
      const rawList = data.word ? (Array.isArray(data.word) ? data.word : [data.word]) : (Array.isArray(data) ? data : []);
      if (rawList.length > 0) {
        return rawList.map(normalizeWord);
      }
    }
    if (error) console.warn("Supabase Edge Function metin analizi uyarısı:", error);
  } catch (edgeErr) {
    console.warn("Edge Function metin analizi başarısız, istemci Gemini servisine geçiliyor...", edgeErr);
  }

  // Tier 2 Fallback: Client-Side Direct Gemini API
  try {
    const directResults = await analyzeTextDirect(text);
    if (directResults && directResults.length > 0) {
      return directResults.map(normalizeWord);
    }
  } catch (directErr) {
    console.warn("İstemci Gemini metin analizi başarısız, yerel metin ayrıştırıcısına geçiliyor...", directErr);
  }

  // Tier 3 Fallback: Local Intelligent Text Parser (Kopyala-yapıştır metinlerinde asla başarısız olmaz)
  const localResults = parseTextLocally(text);
  if (localResults && localResults.length > 0) {
    return localResults.map(normalizeWord);
  }

  throw new Error("Metin içerisinden kelime çıkarılamadı.");
}
