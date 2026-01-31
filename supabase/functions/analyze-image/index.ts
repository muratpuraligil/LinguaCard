// ============================================
// STRICT OCR ENGINE - NO HALLUCINATION
// ============================================

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageBase64, mimeType, analysisType = 'general' } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!imageBase64) throw new Error('Image data missing');
        if (!apiKey) throw new Error('API Key missing');

        const pureBase64 = imageBase64.includes(",")
            ? imageBase64.split(",")[1]
            : imageBase64;

        // --- PROMPT CONFIGURATION ---

        const PROMPT_GENERAL = `
          Analyze this image and extract visible English words or objects.
          Return JSON: [{"english":"word","turkish":"kelime","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const PROMPT_DOCUMENT = `
YOU ARE AN OPTICAL CHARACTER RECOGNITION (OCR) SYSTEM.

YOUR ONLY TASK:
Read the image and transcribe EVERY visible text line EXACTLY as written.

CRITICAL RULES:
1. DO NOT generate new sentences
2. DO NOT create examples
3. DO NOT summarize or shorten
4. COPY the text VERBATIM (word-for-word)
5. If you see 30 lines, return 30 items
6. If you see 10 lines, return 10 items
7. Multi-column layouts: Read LEFT column completely, then RIGHT column

LANGUAGE DETECTION:
- If text is ENGLISH → put in "example_sentence", translate to Turkish in "turkish_sentence"
- If text is TURKISH → put in "turkish_sentence", translate to English in "example_sentence"
- Extract main keyword for "english" and "turkish" fields

OUTPUT FORMAT (Raw JSON only):
[
  {
    "english": "keyword",
    "turkish": "anahtar kelime",
    "example_sentence": "EXACT text from image",
    "turkish_sentence": "Translation"
  }
]

VERIFICATION STEP:
Before responding, count the lines in the image and verify your JSON array has the SAME number of items.
`;

        const selectedPrompt = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_GENERAL;

        // --- MODEL PRIORITY (OCR-optimized) ---
        const modelsToTry = [
            'gemini-1.5-pro',          // Most stable Pro version
            'gemini-1.5-flash',        // Fast fallback
            'gemini-2.0-flash-exp'     // Experimental backup
        ];

        let resultText = "";
        let usedModel = "";

        for (const modelName of modelsToTry) {
            try {
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: selectedPrompt },
                                { inline_data: { mime_type: mimeType || 'image/jpeg', data: pureBase64 } }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.0,        // Zero creativity
                            topP: 0.05,              // Extreme determinism
                            topK: 1,                 // Only most likely token
                            maxOutputTokens: 32768   // Allow large lists
                        }
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    console.warn(`Model ${modelName} failed:`, data.error?.message);
                    continue;
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.length > 10) {
                    resultText = text;
                    usedModel = modelName;
                    console.log(`✓ Success with ${modelName}, output length: ${text.length}`);
                    break;
                }
            } catch (e) {
                console.error(`Error with ${modelName}:`, e);
            }
        }

        if (!resultText) {
            throw new Error("All AI models failed to process the image.");
        }

        // --- PARSING ---
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        let parsedData;

        try {
            parsedData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw output:", resultText.substring(0, 500));
            throw new Error("AI returned invalid JSON format.");
        }

        const finalArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        console.log(`✓ Extracted ${finalArray.length} items using ${usedModel}`);

        return new Response(JSON.stringify({ word: finalArray, model: usedModel, count: finalArray.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Processing failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
