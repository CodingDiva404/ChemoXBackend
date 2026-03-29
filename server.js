import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   🧠 SIMPLE CACHE (IN-MEMORY)
========================= */
const theoryCache = {};

/* =========================
   API
========================= */
app.post("/generate-theory", async (req, res) => {
    try {
        if (!title || !aim) {
            return res.status(400).json({ error: "Title and Aim are required" });
        }

        // 🔑 Unique cache key
        const cacheKey = `${title}-${aim}`;

        /* =========================
           ✅ RETURN FROM CACHE
        ========================= */
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

        const data = await response.json();

        let text = "No response from AI";

        if (data.candidates && data.candidates.length > 0) {
            text = data.candidates[0]?.content?.parts?.[0]?.text || text;
        } else if (data.error) {
            console.error("Gemini Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        /* =========================
           💾 SAVE TO CACHE
        ========================= */
        theoryCache[cacheKey] = text;

        console.log("💾 Saved to cache");

        res.json({ text, cached: false });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "AI failed" });
    }
});

/* =========================
   Health Checkup
========================= */
app.get("/health", (req, res) => {
    res.send("OK");
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

