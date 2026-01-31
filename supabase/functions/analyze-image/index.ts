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

        // 2. STEP: FIND VISION MODEL
        // We look for models that support 'generateContent' and contain 'gemini' and 'vision' or 'flash/pro'
        const viableModel = models.find((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            (m.name.includes('gemini') && (m.name.includes('flash') || m.name.includes('pro') || m.name.includes('vision')))
        );

        if (!viableModel) {
            throw new Error(`No suitable vision models found. Available: ${models.map(m => m.name).join(', ')}`);
        }

        const modelName = viableModel.name.replace('models/', '');
        console.log(`✓ Auto-detected available model: ${modelName}`);

        // 3. STEP: GENERATE CONTENT
        const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const pureBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

        // --- PROMPTS ---

        // 1. VOCABULARY MODE (For Main Dashboard):
        // Strict rule: Extract ONLY distinct single words. Ignore full sentences, URLs, and noise.
        const PROMPT_VOCABULARY = `
        Analyze this image and extract a list of useful English vocabulary words.
        
        STRICT RULES:
        1. Extract ONLY single words or short phrases (max 3 words).
        2. IGNORE full sentences, paragraphs, or long text blocks.
        3. IGNORE URLs, web links, email addresses (e.g. https://..., .com).
        4. IGNORE nonsense text or system logs.
        5. For each word, provide proper Turkish translation and a SIMPLE example sentence.
        
        Return JSON array:
        [
          {
            "english": "apple",
            "turkish": "elma",
            "example_sentence": "I ate a red apple.",
            "turkish_sentence": "Kırmızı bir elma yedim."
          }
        ]
        `;

        // 2. DOCUMENT/SENTENCE MODE (For Custom Sets):
        // Strict rule: OCR transcription. Read everything line by line.
        const PROMPT_DOCUMENT = `
        You are a strict OCR engine. Extract ALL visible text lines EXACTLY as written.
        
        RULES:
        1. Read EVERY line verbatim. Do not skip.
        2. Do NOT summarize.
        3. If 30 lines exist, return 30 items.
        4. Multi-column: Read left column first, then right.
        
        Return JSON array:
        [
          {
            "english": "Main Keyword",
            "turkish": "Anahtar Kelime",
            "example_sentence": "Full text line from image",
            "turkish_sentence": "Translated text line"
          }
        ]
        `;

        const PROMPT = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_VOCABULARY;

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
            const errText = await genResp.text();
            throw new Error(`Generation failed with ${modelName}: ${errText}`);
        }

        const data = await genResp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("Empty AI response");

        // Parse JSON
        const cleanJson = text.replace(/```json|```/g, '').trim();
        let parsedData;

        try {
            parsedData = JSON.parse(cleanJson);
        } catch {
            const start = cleanJson.indexOf('[');
            const end = cleanJson.lastIndexOf(']');
            if (start > -1 && end > -1) {
                parsedData = JSON.parse(cleanJson.substring(start, end + 1));
            } else {
                // Final fallback: wrap object in array if single object
                if (cleanJson.trim().startsWith('{')) {
                    parsedData = [JSON.parse(cleanJson)];
                } else {
                    throw new Error("Invalid JSON format");
                }
            }
        }

        return new Response(JSON.stringify({
            word: Array.isArray(parsedData) ? parsedData : [parsedData],
            model: modelName
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
