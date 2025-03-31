const express = require("express");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const upload = multer().none(); // For handling multipart/form-data

const DEFAULT_API_KEY = "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";

function createGroqClient(apiKey) {
  return new Groq({ apiKey: apiKey || DEFAULT_API_KEY });
}

function cleanTranslation(text) {
  if (typeof text !== 'string') return text;
  text = text.replace(/^["'](.*)["']$/, '$1');
  text = text.replace(/\\"/g, '');
  return text;
}

async function translateText(text, targetLang, apiKey) {
  try {
    const groq = createGroqClient(apiKey);
    const prompt = `Translate the following text to ${targetLang}:\n"${text}"`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Provide only the direct translation without any quotes, explanations, or additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return cleanTranslation(response.choices[0].message.content.trim());
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

async function translateNestedObject(obj, targetLang, apiKey) {
  const translatedObj = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      translatedObj[key] = await translateNestedObject(value, targetLang, apiKey);
    } else if (typeof value === "string" && value.trim() !== "") {
      try {
        translatedObj[key] = await translateText(value, targetLang, apiKey);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to avoid rate limiting
      } catch (error) {
        console.error(`Error translating ${key}:`, error);
        translatedObj[key] = value;
      }
    } else {
      translatedObj[key] = value;
    }
  }

  return translatedObj;
}

app.post("/translate", upload, async (req, res) => {
  try {
    const { language, apiKey, content } = req.body;

    if (!language || !content) {
      return res.status(400).json({ error: "Missing required fields: language or content" });
    }

    const targetLang = language.toLowerCase();
    const translationsDir = path.join(__dirname, "public", "locales", targetLang);
    const langFile = path.join(translationsDir, "translation.json");

    if (!fs.existsSync(translationsDir)) {
      fs.mkdirSync(translationsDir, { recursive: true });
    }

    // Translate the provided content
    const translatedData = await translateNestedObject(content, targetLang, apiKey || DEFAULT_API_KEY);

    // Save the translated JSON to the target file
    fs.writeFileSync(langFile, JSON.stringify(translatedData, null, 2), "utf-8");

    res.json(translatedData);
  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({
      error: "Translation failed",
      details: error.message
    });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
