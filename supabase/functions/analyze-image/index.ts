// ============================================
// AI ANALYZER (DIAGNOSTIC MODE)
// ============================================

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const errors: string[] = []; // Collect all errors log

    try {
        const { imageBase64, mimeType, analysisType = 'general' } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!imageBase64) throw new Error('Image data missing');
        if (!apiKey) throw new Error('API Key configuration missing');

        const pureBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
        const finalMimeType = mimeType || 'image/jpeg';

        const PROMPT = analysisType === 'document'
            ? `Extract ALL visible text lines from this image EXACTLY as written. Return JSON array: [{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]`
            : `Identify objects/words. Return JSON array: [{"english":"...","turkish":"...","example_sentence":"...","turkish_sentence":"..."}]`;

        // Strategy: List of endpoints to try
        const attempts = [
            { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, name: 'flash-v1beta' },
            { url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`, name: 'flash-v1' },
            { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`, name: 'pro-v1beta' },
        ];

        let resultText = "";
        let successInfo = "";

        for (const attempt of attempts) {
            try {
                console.log(`Trying ${attempt.name}...`);
                const response = await fetch(`${attempt.url}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: PROMPT },
                                { inline_data: { mime_type: finalMimeType, data: pureBase64 } }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 8192
                        }
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    errors.push(`${attempt.name} failed (${response.status}): ${errText.substring(0, 200)}`);
                    console.warn(errors[errors.length - 1]);
                    continue;
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                    resultText = text;
                    successInfo = attempt.name;
                    break;
                } else {
                    errors.push(`${attempt.name} returned empty candidate`);
                }

            } catch (e: any) {
                errors.push(`${attempt.name} exception: ${e.message}`);
            }
        }

        if (!resultText) {
            // Throw ALL collected errors to see what happened
            throw new Error(`All attempts failed. Logs: ${JSON.stringify(errors)}`);
        }

        // Parse JSON
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        let parsedData;
        try {
            parsedData = JSON.parse(cleanJson);
        } catch {
            // Simple array extraction fallback
            const start = cleanJson.indexOf('[');
            const end = cleanJson.lastIndexOf(']');
            if (start > -1 && end > -1) {
                parsedData = JSON.parse(cleanJson.substring(start, end + 1));
            } else {
                throw new Error("Invalid JSON format from AI");
            }
        }

        return new Response(JSON.stringify({ word: Array.isArray(parsedData) ? parsedData : [parsedData], model: successInfo }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("FATAL:", error.message);
        return new Response(JSON.stringify({
            error: error.message,
            details: errors
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
