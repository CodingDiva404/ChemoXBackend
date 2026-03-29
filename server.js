app.post("/generate-theory", async (req, res) => {
    try {
        const { title, aim } = req.body || {};

        // ✅ validation
        if (!title || !aim) {
            return res.status(400).json({
                error: "Title and Aim are required"
            });
        }

        const cacheKey = `${title}-${aim}`;

        if (theoryCache[cacheKey]) {
            console.log("⚡ Serving from cache");
            return res.json({
                text: theoryCache[cacheKey],
                cached: true
            });
        }

        const prompt = `
Explain the theory for the experiment:

Title: ${title}
Aim: ${aim}

Return ONLY 5 bullet points.
Each point must be under 15 words.
Start each line with "-".
No paragraphs, no extra text.
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        maxOutputTokens: 150,
                        temperature: 0.5,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini API Error:", errText);
            return res.status(500).json({ error: "Gemini API failed" });
        }

        const data = await response.json();

        let text = "No response from AI";

        if (data.candidates && data.candidates.length > 0) {
            text = data.candidates[0]?.content?.parts?.[0]?.text || text;
        }

        theoryCache[cacheKey] = text;

        console.log("💾 Saved to cache");

        res.json({ text, cached: false });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "AI failed" });
    }
});