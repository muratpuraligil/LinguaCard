import { GoogleGenerativeAI } from "npm:@google/generative-ai";

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
Analyze this image and identify distinct English words or objects.
Return JSON array: [{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const PROMPT_DOCUMENT = `
Extract ALL visible text lines from this image EXACTLY as written.

RULES:
- Read EVERY line, do not skip
- Do NOT create new sentences
- If 30 lines exist, return 30 items
- Multi-column: Read left then right

For each line:
- English text → "example_sentence", translate to "turkish_sentence"
- Turkish text → "turkish_sentence", translate to "example_sentence"
- Extract keyword for "english" and "turkish"

Return raw JSON: [{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]
        `;

        const selectedPrompt = analysisType === 'document' ? PROMPT_DOCUMENT : PROMPT_GENERAL;

        // Try models in order of preference
        const modelsToTry = [
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-1.5-flash"
        ];

        let finalResult = null;
        let usedModel = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying model: ${modelName}`);

                const model = genAI.getGenerativeModel({
                    model: modelName
                });

                const imagePart = {
                    inlineData: {
                        data: pureBase64,
                        mimeType: mimeType || 'image/jpeg'
                    }
                };

                const result = await model.generateContent([selectedPrompt, imagePart]);
                const response = await result.response;
                const text = response.text();

                if (text && text.length > 10) {
                    finalResult = text;
                    usedModel = modelName;
                    console.log(`✓ Success with ${modelName}`);
                    break;
                }
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error?.message);
                continue;
            }
        }

        if (!finalResult) {
            throw new Error("All models failed to process the image");
        }

        console.log("AI Response length:", finalResult.length);

        // Parse JSON
        const cleanJson = finalResult.replace(/```json|```/g, '').trim();
        let parsedData;

        try {
            parsedData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("JSON Parse Error. Raw:", finalResult.substring(0, 300));
            throw new Error("Invalid JSON from AI");
        }

        const finalArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        console.log(`✓ Success: ${finalArray.length} items extracted with ${usedModel}`);

        return new Response(JSON.stringify({ word: finalArray }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("Error:", error?.message || error);
        return new Response(JSON.stringify({ error: error?.message || 'Processing failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
