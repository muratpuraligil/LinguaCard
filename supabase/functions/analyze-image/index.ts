// ============================================
// AI ANALYZER (NATIVE FETCH - NO SDK)
// ============================================

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
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

        // --- PROMPTS ---
        const PROMPT_GENERAL = `
Analyze this image and identify distinctive English words or objects.
Return JSON array: [{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const PROMPT_DOCUMENT = `
Extract ALL visible text lines from this image EXACTLY as written.
RULES:
1. Verbatim transcription (OCR).
2. Do NOT summarize.
3. Keep original line count.
4. If 30 lines, return 30 items.

Return JSON: [{"english":"Keyword","turkish":"Anahtar Kelime","example_sentence":"Full text line","turkish_sentence":"Tam cümle çevirisi"}]
        `;

        const selectedPrompt = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_GENERAL;

        // --- ROBUST MODEL STRATEGY ---
        // We will try multiple models and API versions until one works.
        const strategies = [
            { model: "gemini-1.5-flash", version: "v1beta" },
            { model: "gemini-1.5-flash-latest", version: "v1beta" },
            { model: "gemini-1.5-flash-001", version: "v1beta" },
            { model: "gemini-1.5-pro", version: "v1beta" },
            { model: "gemini-1.5-pro-latest", version: "v1beta" },
            { model: "gemini-pro-vision", version: "v1" } // Old faithful fallback
        ];

        let resultText = "";
        let successModel = "";

        // Iterate through strategies
        for (const strat of strategies) {
            try {
                console.log(`Trying: ${strat.model} (${strat.version})...`);

                const url = `https://generativelanguage.googleapis.com/${strat.version}/models/${strat.model}:generateContent?key=${apiKey}`;

                const response = await fetch(url, {
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

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Failed ${strat.model}: ${response.status} - ${errorText.substring(0, 100)}...`);
                    continue; // Try next model
                }

                const data = await response.json();
                const candidate = data.candidates?.[0];

                if (candidate?.content?.parts?.[0]?.text) {
                    resultText = candidate.content.parts[0].text;
                    successModel = strat.model;
                    console.log(`✓ Success with ${strat.model}`);
                    break; // STOP LOOP, WE HAVE DATA
                } else {
                    console.warn(`Empty response from ${strat.model}`);
                }

            } catch (err) {
                console.error(`Error with ${strat.model}:`, err);
            }
        }

        if (!resultText) {
            throw new Error("All AI models and versions failed. Please try again later.");
        }

        // --- PARSE JSON ---
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        let parsedData;

        try {
            parsedData = JSON.parse(cleanJson);
        } catch (e) {
            // Try to find array bracket if text is messy
            const start = cleanJson.indexOf('[');
            const end = cleanJson.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                parsedData = JSON.parse(cleanJson.substring(start, end + 1));
            } else {
                throw new Error("Invalid JSON from AI");
            }
        }

        const finalArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        return new Response(JSON.stringify({ word: finalArray, model: successModel }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("Critical Error:", error.message);
        return new Response(JSON.stringify({ error: error.message || 'Processing failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
