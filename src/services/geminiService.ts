/**
 * Client-side Direct Gemini API Fallback Service
 * Used as a resilient fallback if Supabase Edge Function is down or unreachable.
 */

const CANDIDATE_MODELS = [
  'models/gemini-2.0-flash',
  'models/gemini-1.5-flash',
];

export async function analyzeTextDirect(textInput: string): Promise<any[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Client VITE_GEMINI_API_KEY is missing");

  const PROMPT = `
  Analyze text input: "${textInput}".
  Extract words/phrases. For each item provide: english, turkish translation, short example_sentence, and turkish_sentence.
  Return ONLY valid JSON array:
  [{"english": "...", "turkish": "...", "example_sentence": "...", "turkish_sentence": "..."}]
  `;

  let lastErr: any = null;

  for (const modelPath of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      });

      if (!res.ok) {
        lastErr = new Error(`Gemini REST error ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
      if (!text) continue;

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleanJson.indexOf('[');
      const end = cleanJson.lastIndexOf(']');

      let parsed: any[] = [];
      if (start > -1 && end > -1) {
        parsed = JSON.parse(cleanJson.substring(start, end + 1));
      } else {
        parsed = JSON.parse(cleanJson);
      }

      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Direct Gemini analysis failed");
}

export async function analyzeImageDirect(base64Image: string, mimeType: string = 'image/jpeg'): Promise<any[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Client VITE_GEMINI_API_KEY is missing");

  const pureBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const PROMPT = `
  Analyze image and extract English words (max 3 words per item).
  Provide Turkish translation, simple English example sentence, and its Turkish translation.
  Return ONLY valid JSON array:
  [{"english": "know", "turkish": "bilmek, tanımak", "example_sentence": "I know the answer.", "turkish_sentence": "Cevabı biliyorum."}]
  `;

  let lastErr: any = null;

  for (const modelPath of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType: mimeType || 'image/jpeg', data: pureBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      });

      if (!res.ok) {
        lastErr = new Error(`Gemini REST error ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
      if (!text) continue;

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleanJson.indexOf('[');
      const end = cleanJson.lastIndexOf(']');

      let parsed: any[] = [];
      if (start > -1 && end > -1) {
        parsed = JSON.parse(cleanJson.substring(start, end + 1));
      } else {
        parsed = JSON.parse(cleanJson);
      }

      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Direct Gemini image analysis failed");
}
