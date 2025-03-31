const express = require("express");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const DEFAULT_API_KEY = "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";

function createGroqClient(apiKey) {
  return new Groq({ apiKey: apiKey || DEFAULT_API_KEY });
}

// Clean the translated text by removing unnecessary quotes
function cleanTranslation(text) {
  if (typeof text !== 'string') return text;
  text = text.replace(/^["'](.*)["']$/, '$1'); // Remove surrounding quotes
  text = text.replace(/\\"/g, ''); // Remove escaped quotes
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
        await new Promise(resolve => setTimeout(resolve, 100));
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

app.get("/translate/:language", async (req, res) => {
  try {
    const language = req.params.language.toLowerCase();
    const apiKey = req.query.apiKey || DEFAULT_API_KEY;
    const customDir = req.query.path;
    const translationsDir = customDir;

    const enFile = path.join(translationsDir, "en", "translation.json");
    const langDir = path.join(translationsDir, language);
    const langFile = path.join(langDir, "translation.json");

    if (!fs.existsSync(translationsDir)) {
      return res.status(500).json({
        error: "Translations directory not found.",
        details: `The directory "${translationsDir}" does not exist. Please provide a valid directory.`
      });
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (fs.existsSync(langFile)) {
      const existingTranslations = JSON.parse(fs.readFileSync(langFile, "utf-8"));
      const cleanedTranslations = JSON.parse(
        JSON.stringify(existingTranslations),
        (key, value) => typeof value === 'string' ? cleanTranslation(value) : value
      );
      return res.json(cleanedTranslations);
    }

    if (!fs.existsSync(enFile)) {
      return res.status(500).json({
        error: "English translations not found.",
        details: "Please ensure en/translation.json exists in the translations directory."
      });
    }

    const enData = JSON.parse(fs.readFileSync(enFile, "utf-8"));
    const translatedData = await translateNestedObject(enData, language, apiKey);

    // Ensure language directory exists before writing file
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

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
