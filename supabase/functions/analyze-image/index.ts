// ============================================
// AI ANALYZER (AUTO-DISCOVERY MODE)
// ============================================

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { imageBase64, mimeType, analysisType = 'general' } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!imageBase64) throw new Error('Image data missing');
        if (!apiKey) throw new Error('API Key configuration missing');

        // 1. STEP: AVAILABLE MODELS DISCOVERY
        // We ask Gemini: "Which models do I have access to?"
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listResp = await fetch(listUrl);

        if (!listResp.ok) {
            throw new Error(`Failed to list models: ${listResp.status} ${listResp.statusText}`);
        }

        const listData = await listResp.json();
        const models = listData.models || [];

        // 2. STEP: SMART MODEL SELECTION
        // Filter for valid generative models (gemini + generateContent)
        const allCandidates = models.filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            m.name.includes('models/gemini') &&
            !m.name.includes('embedding')
        );

        // Sorting Priority:
        // 1. "gemini-1.5-flash" (Best balance of speed/quota)
        // 2. "gemini-1.5-pro" (Higher quality)
        // 3. Others (experimental, 1.0, etc.)
        const sortedModels = allCandidates.sort((a: any, b: any) => {
            const nameA = a.name;
            const nameB = b.name;

            const score = (name: string) => {
                if (name.includes('gemini-1.5-flash') && !name.includes('exp')) return 3; // Top priority
                if (name.includes('gemini-1.5-flash')) return 2;
                if (name.includes('gemini-1.5-pro')) return 1;
                return 0;
            };

            return score(nameB) - score(nameA);
        });

        if (sortedModels.length === 0) {
            throw new Error(`No Gemini models found accessing API with provided key.`);
        }

        console.log(`Available models (sorted): ${sortedModels.map((m: any) => m.name.split('/').pop()).join(', ')}`);

        // 3. STEP: GENERATION LOOP (Failover Strategy)
        const pureBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

        // --- PROMPTS ---

        // 1. VOCABULARY MODE
        const PROMPT_VOCABULARY = `
        Analyze this image and extract a list of useful English vocabulary words.
        
        STRICT RULES:
        1. Extract ONLY single words or short phrases (max 3 words).
        2. IGNORE full sentences, paragraphs, or long text blocks.
        3. IGNORE URLs, web links, email addresses.
        4. IGNORE nonsense text.
        5. For each word, provide proper Turkish translation and a SIMPLE example sentence.
        
        Return JSON array (min 1 item):
        [{"english": "apple", "turkish": "elma", "example_sentence": "I ate a red apple.", "turkish_sentence": "Kırmızı bir elma yedim."}]
        `;

        // 2. DOCUMENT MODE
        const PROMPT_DOCUMENT = `
        You are a strict OCR engine. Extract ALL visible text lines EXACTLY as written.
        
        RULES:
        1. Read EVERY line verbatim. Do not skip.
        2. Do NOT summarize.
        3. If 30 lines exist, return 30 items.
        
        Return JSON array:
        [{"english": "Keyword", "turkish": "Anahtar", "example_sentence": "Original Text Line", "turkish_sentence": "Translated Line"}]
        `;

        const PROMPT = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_VOCABULARY;

        let lastError = null;
        let successModel = '';
        let resultData = null;

        // Try models in order until one succeeds
        for (const modelInfo of sortedModels) {
            const modelName = modelInfo.name.replace('models/', '');
            try {
                console.log(`Using model: ${modelName}...`);

                const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const genResp = await fetch(genUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: PROMPT },
                                { inline_data: { mime_type: mimeType || 'image/jpeg', data: pureBase64 } }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 8192
                        }
                    })
                });

                if (!genResp.ok) {
                    // If Quota Exceeded (429), strictly continue loop
                    if (genResp.status === 429) {
                        console.warn(`Quota exceeded for ${modelName}, trying next...`);
                        lastError = new Error(`Quota exceeded for ${modelName}`);
                        continue;
                    }
                    const errText = await genResp.text();
                    throw new Error(`Cloud Error (${genResp.status}): ${errText}`);
                }

                const data = await genResp.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) {
                    console.warn(`${modelName} returned empty text, trying next...`);
                    continue;
                }

                // Success!
                successModel = modelName;

                // Parse JSON
                const cleanJson = text.replace(/```json|```/g, '').trim();
                try {
                    resultData = JSON.parse(cleanJson);
                } catch {
                    const start = cleanJson.indexOf('[');
                    const end = cleanJson.lastIndexOf(']');
                    if (start > -1 && end > -1) {
                        resultData = JSON.parse(cleanJson.substring(start, end + 1));
                    } else if (cleanJson.trim().startsWith('{')) {
                        resultData = [JSON.parse(cleanJson)];
                    } else {
                        throw new Error("Invalid JSON format");
                    }
                }

                break; // Exit loop on success

            } catch (err: any) {
                console.warn(`Failed with ${modelName}: ${err.message}`);
                lastError = err;
            }
        }

        if (!resultData) {
            throw lastError || new Error("All models failed to process image.");
        }

        return new Response(JSON.stringify({
            word: Array.isArray(resultData) ? resultData : [resultData],
            model: successModel
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("FATAL:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
