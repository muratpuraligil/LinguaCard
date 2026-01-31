// ============================================
// AI IMAGE ANALYZER (STABLE VERSION)
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

        // PROMPTS
        const PROMPT_GENERAL = `
Analyze this image and identify distinct English words or objects visible in it.
For each item, provide:
- "english": The word in English
- "turkish": Turkish translation
- "example_sentence": A simple English sentence
- "turkish_sentence": Turkish translation of the sentence

Return ONLY a valid JSON array (no markdown):
[{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const PROMPT_DOCUMENT = `
You are analyzing an image that contains a list of sentences for language learning.

TASK: Extract ALL visible text lines from the image EXACTLY as written.

RULES:
1. Read EVERY line in the image
2. Do NOT skip any lines
3. Do NOT create new sentences
4. Copy text VERBATIM (word-for-word)
5. If you see 30 lines, return 30 items
6. Multi-column layout: Read left column first, then right column

For each line:
- Detect if it's English or Turkish
- If English: Put in "example_sentence" and translate to "turkish_sentence"
- If Turkish: Put in "turkish_sentence" and translate to "example_sentence"
- Extract a keyword for "english" and "turkish" fields

Return ONLY a raw JSON array:
[{"english":"keyword","turkish":"anahtar kelime","example_sentence":"Full English sentence","turkish_sentence":"Tam Türkçe cümle"}]
        `;

        const selectedPrompt = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_GENERAL;

        // Try these models in order
        const modelsToTry = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-2.0-flash-exp'
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
                            temperature: 0.1,
                            maxOutputTokens: 8192
                        }
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    console.warn(`Model ${modelName} failed:`, data.error?.message || 'Unknown error');
                    continue;
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.length > 10) {
                    resultText = text;
                    usedModel = modelName;
                    console.log(`✓ Success with ${modelName}`);
                    break;
                }
            } catch (e) {
                console.error(`Error with ${modelName}:`, e);
                continue;
            }
        }

        if (!resultText) {
            throw new Error("All AI models failed to process the image.");
        }

        // Parse response
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        let parsedData;

        try {
            parsedData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw output:", resultText.substring(0, 500));
            throw new Error("AI returned invalid JSON format.");
        }

        const finalArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        console.log(`✓ Extracted ${finalArray.length} items`);

        return new Response(JSON.stringify({ word: finalArray }), {
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
