// ============================================
// AI ANALYZER — ULTRA FAST (GEMINI 3.5 FLASH LITE)
// ============================================

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Fast & reliable model priority
const CANDIDATE_MODELS = [
    'models/gemini-2.0-flash',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
];

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { imageBase64, mimeType, textInput, analysisType = 'general' } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();

        if (!imageBase64 && !textInput) throw new Error('Input data (image or text) missing');
        if (!apiKey) throw new Error('API Key configuration missing');

        const pureBase64 = imageBase64?.includes(",") ? imageBase64.split(",")[1] : imageBase64;

        // --- PROMPTS ---

        const PROMPT_VOCABULARY = `
        Read and extract ALL visible English words, phrases, or sentences from the image line by line.
        For each line/item, provide:
        - english: extracted English word or phrase
        - turkish: Turkish translation
        - example_sentence: simple English example sentence using the item
        - turkish_sentence: Turkish translation of the example sentence

        Return ONLY a valid JSON array of objects. Do not include markdown or explanations outside JSON:
        [{"english": "make sure", "turkish": "emin olmak", "example_sentence": "Make sure you lock the door.", "turkish_sentence": "Kapıyı kilitlediğinden emin ol."}]
        `;

        const PROMPT_DOCUMENT = PROMPT_VOCABULARY;

        const PROMPT_TEXT_ANALYSIS = `
        Analyze text input line by line: "${textInput}".
        Extract words/phrases. For each item provide: english, turkish translation, short example_sentence, and turkish_sentence.
        Return ONLY a valid JSON array:
        [{"english": "...", "turkish": "...", "example_sentence": "...", "turkish_sentence": "..."}]
        `;

        let PROMPT = PROMPT_VOCABULARY;
        if (textInput) PROMPT = PROMPT_TEXT_ANALYSIS;
        else if (analysisType === 'document') PROMPT = PROMPT_DOCUMENT;

        let lastError = null;
        let successModel = '';
        let resultData = null;

        for (const modelPath of CANDIDATE_MODELS) {
            const modelName = modelPath.replace('models/', '');
            try {
                const genUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

                const parts: any[] = [{ text: PROMPT }];
                if (!textInput && pureBase64) {
                    parts.push({
                        inlineData: {
                            mimeType: mimeType || 'image/jpeg',
                            data: pureBase64
                        }
                    });
                }

                const genResp = await fetch(genUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 2048
                        }
                    })
                });

                if (!genResp.ok) {
                    if (genResp.status === 429 || genResp.status === 404) {
                        lastError = new Error(`Status ${genResp.status} for ${modelName}`);
                        continue;
                    }
                    const errText = await genResp.text();
                    throw new Error(`Cloud Error (${genResp.status}): ${errText}`);
                }

                const data = await genResp.json();
                const candidate = data.candidates?.[0];
                let text = '';
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.text && !part.thought) {
                            text = part.text;
                            break;
                        }
                    }
                    if (!text) {
                        text = candidate.content.parts
                            .filter((p: any) => p.text)
                            .map((p: any) => p.text)
                            .join('');
                    }
                }

                if (!text) {
                    lastError = new Error(`${modelName}: empty text response`);
                    continue;
                }

                successModel = modelName;

                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
                        throw new Error("JSON format error");
                    }
                }

                break;

            } catch (err: any) {
                lastError = err;
            }
        }

        if (!resultData) {
            throw lastError || new Error("All models failed.");
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
