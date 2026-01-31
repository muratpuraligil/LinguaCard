import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

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

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // Prompts
        const PROMPT_GENERAL = `
Analyze this image and identify distinct English words or objects visible in it.
For each item, provide JSON: {"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}

Return ONLY a valid JSON array.
        `;

        const PROMPT_DOCUMENT = `
You are analyzing an image containing sentences for language learning.

CRITICAL TASK: Extract ALL visible text lines EXACTLY as written.

RULES:
1. Read EVERY line - do not skip any
2. Do NOT create new sentences
3. Copy text VERBATIM
4. If 30 lines exist, return 30 items
5. Multi-column: Read left column first, then right

For each line:
- Detect language (English/Turkish)
- English text → "example_sentence", translate to "turkish_sentence"
- Turkish text → "turkish_sentence", translate to "example_sentence"
- Extract keyword for "english" and "turkish"

Return ONLY raw JSON array:
[{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const selectedPrompt = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_GENERAL;

        // Model selection
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
            }
        });

        // Generate content
        const imagePart = {
            inlineData: {
                data: pureBase64,
                mimeType: mimeType || 'image/jpeg'
            }
        };

        const result = await model.generateContent([selectedPrompt, imagePart]);
        const response = result.response;
        const text = response.text();

        if (!text || text.length < 10) {
            throw new Error("AI returned empty response");
        }

        // Parse JSON
        const cleanJson = text.replace(/```json|```/g, '').trim();
        let parsedData;

        try {
            parsedData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw output:", text.substring(0, 500));
            throw new Error("AI returned invalid JSON format.");
        }

        const finalArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        console.log(`✓ Extracted ${finalArray.length} items`);

        return new Response(JSON.stringify({ word: finalArray }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error?.message || error);
        return new Response(JSON.stringify({ error: error?.message || 'Processing failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
