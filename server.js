import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express(); // ✅ REQUIRED

app.use(cors());
app.use(express.json());

/* =========================
   🧠 CACHE
========================= */
const theoryCache = {};

/* =========================
   API
========================= */
app.post("/generate-theory", async (req, res) => {
    try {
        const { title, aim } = req.body || {};

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

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
    res.send("API is running 🚀");
});


app.post("/clear-cache", (req, res) => {
    Object.keys(theoryCache).forEach(key => delete theoryCache[key]);
    res.json({ message: "Cache cleared ✅" });
});

/* =========================
   🧠 CACHE WITH EXPIRY
========================= */
const theoryCache = {}; // { [cacheKey]: { text, expiresAt } }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

app.post("/generate-theory", async (req, res) => {
    try {
        const { title, aim } = req.body || {};

        if (!title || !aim) {
            return res.status(400).json({
                error: "Title and Aim are required"
            });
        }

        const cacheKey = `${title}-${aim}`;

        // ✅ Check if cached and still valid
        if (theoryCache[cacheKey] && Date.now() < theoryCache[cacheKey].expiresAt) {
            console.log("⚡ Serving from cache");
            return res.json({
                text: theoryCache[cacheKey].text,
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
                        { parts: [{ text: prompt }] }
                    ],
                    generationConfig: {
                        maxOutputTokens: 150,
                        temperature: 0.5
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

        // 💾 Save to cache with expiry
        theoryCache[cacheKey] = {
            text,
            expiresAt: Date.now() + CACHE_TTL
        };
        console.log("💾 Saved to cache with expiry");

        res.json({ text, cached: false });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "AI failed" });
    }
});

/* =========================
   CLEAR CACHE ROUTE
========================= */
app.post("/clear-cache", (req, res) => {
    Object.keys(theoryCache).forEach(key => delete theoryCache[key]);
    res.json({ message: "Cache cleared ✅" });
});


/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});