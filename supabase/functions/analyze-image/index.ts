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
        const { imageBase64, mimeType, textInput, analysisType = 'general' } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();

        if (!imageBase64 && !textInput) throw new Error('Input data (image or text) missing');
        if (!apiKey) throw new Error('API Key configuration missing');

        // 1. STEP: AVAILABLE MODELS DISCOVERY
        // We ask Gemini: "Which models do I have access to?"
        let sortedModels = [];
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const listResp = await fetch(listUrl);

            if (!listResp.ok) {
                console.warn(`Model list failed (${listResp.status}), falling back to default.`);
            } else {
                const listData = await listResp.json();
                const models = listData.models || [];

                // 2. STEP: SMART MODEL SELECTION
                const allCandidates = models.filter((m: any) =>
                    m.supportedGenerationMethods?.includes('generateContent') &&
                    m.name.includes('models/gemini') &&
                    !m.name.includes('embedding')
                );

                sortedModels = allCandidates.sort((a: any, b: any) => {
                    const nameA = a.name;
                    const nameB = b.name;

                    const score = (name: string) => {
                        if (name.includes('gemini-1.5-flash') && !name.includes('exp')) return 3;
                        if (name.includes('gemini-1.5-flash')) return 2;
                        if (name.includes('gemini-1.5-pro')) return 1;
                        return 0;
                    };

                    return score(nameB) - score(nameA);
                });
            }
        } catch (e) {
            console.warn("Model discovery error:", e);
        }

        // Fallback if discovery failed or returned empty
        if (sortedModels.length === 0) {
            console.log("Using fallback model: gemini-1.5-flash");
            sortedModels = [{ name: 'models/gemini-1.5-flash' }];
        }

        console.log(`Available models (sorted): ${sortedModels.map((m: any) => m.name.split('/').pop()).join(', ')}`);

        // 3. STEP: GENERATION LOOP
        const pureBase64 = imageBase64?.includes(",") ? imageBase64.split(",")[1] : imageBase64;

        // --- PROMPTS ---

        // 1. VOCABULARY MODE
        const PROMPT_VOCABULARY = `
        Analyze this image and extract a list of useful English vocabulary words.
        
        STRICT RULES:
        1. Extract ONLY single words or short phrases (max 3 words).
        2. IGNORE full sentences, paragraphs, or long text blocks.
        3. IGNORE URLs, web links, email addresses.
        4. IGNORE nonsense text.
        5. For each word, provide proper Turkish translations (include 2-3 common meanings separated by commas/slashes if applicable) and a SIMPLE example sentence.
        
        Return JSON array (min 1 item):
        [{"english": "know", "turkish": "bilmek, tanımak", "example_sentence": "I know the answer.", "turkish_sentence": "Cevabı biliyorum."}]
        `;

        // 2. DOCUMENT MODE
        const PROMPT_DOCUMENT = `
        You are a strict OCR engine with translation capabilities.
        
        TASK:
        1. Extract ALL visible text lines from the image EXACTLY as written.
        2. Detect the language of each extracted line (English or Turkish).
        3. Map them correctly to the JSON fields.

        RULES:
        - If text is ENGLISH: Put it in "example_sentence". Translate it to Turkish and put in "turkish_sentence".
        - If text is TURKISH: Put it in "turkish_sentence". Translate it to English and put in "example_sentence".
        - Extract a key noun/verb from the English sentence as "english" keyword, and its Turkish Meaninig as "turkish".

        Return JSON array:
        [
          {
            "english": "Car", 
            "turkish": "Araba", 
            "example_sentence": "The cars are in the garage.", 
            "turkish_sentence": "Arabalar garajda."
          }
        ]
        `;

        // 3. TEXT ANALYSIS MODE (NEW)
        const PROMPT_TEXT_ANALYSIS = `
        You are a helpful language assistant.
        Analyze the following text input: "${textInput}".

        TASK:
        1. Identify if the input is English or Turkish.
        2. If English:
           - Use it as the 'english' word.
           - Provide its Turkish translation ('turkish').
           - Create a simple English example sentence using this word ('example_sentence').
           - Translate that sentence to Turkish ('turkish_sentence').
        3. If Turkish:
           - Use it as the 'turkish' word.
           - Provide its English translation ('english').
           - Create a simple English example sentence using the translated English word ('example_sentence').
           - Translate that sentence to Turkish ('turkish_sentence').
        
        Return ONLY a single JSON object (not array):
        {
          "english": "...",
          "turkish": "...",
          "example_sentence": "...",
          "turkish_sentence": "..."
        }
        `;

        let PROMPT = PROMPT_VOCABULARY;
        if (textInput) PROMPT = PROMPT_TEXT_ANALYSIS;
        else if (analysisType === 'document') PROMPT = PROMPT_DOCUMENT;

        let lastError = null;
        let successModel = '';
        let resultData = null;

        // Try models in order until one succeeds
        for (const modelInfo of sortedModels) {
            const modelName = modelInfo.name.replace('models/', '');
            try {
                console.log(`Using model: ${modelName}...`);

                const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                // Construct parts based on input type
                const parts: any[] = [{ text: PROMPT }];
                if (!textInput && pureBase64) {
                    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: pureBase64 } });
                }

                const genResp = await fetch(genUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts }],
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
