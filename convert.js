#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require('axios')

const args = process.argv.slice(2);
const PROJECT_DIR = path.resolve(args[0] || path.join(__dirname, "./frontend"));
const PUBLIC_TRANSLATIONS_FILE = path.join(PROJECT_DIR, "public/locales/en/translation.json");
const I18N_FILE = path.join(PROJECT_DIR, "src/i18n.ts");
const LANGUAGE_FILE = path.join(PROJECT_DIR, "src/Language.tsx");
const API_URL = "http://localhost:3002/translate"; // Replace with your actual API URL
const API_KEY = "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";
const TARGET_LANGUAGES = ["hindi", "marathi", "telugu"];
const TRANSLATIONS_DIR =path.join(PROJECT_DIR, "public/locales/");

if (!fs.existsSync(path.dirname(PUBLIC_TRANSLATIONS_FILE))) {
  fs.mkdirSync(path.dirname(PUBLIC_TRANSLATIONS_FILE), { recursive: true });
}

let translations = {};
if (fs.existsSync(PUBLIC_TRANSLATIONS_FILE)) {
  try {
    translations = JSON.parse(fs.readFileSync(PUBLIC_TRANSLATIONS_FILE, "utf-8"));
  } catch (error) {
    console.error("⚠️ Error reading existing translations:", error);
  }
} else {
  fs.writeFileSync(PUBLIC_TRANSLATIONS_FILE, JSON.stringify({}, null, 2), "utf-8");
}

const TEXT_REGEX = /(>\s*)([\s\S]*?)(\s*<)/g;
const ATTR_REGEX = /(title|placeholder|alt|value|aria-label)="([^"]+)"/g;
const MAP_REGEX = /\btext\s*:\s*"(.*?)"/g;

function generateShortHash(text) {
  return crypto.createHash("md5").update(text).digest("hex").substring(0, 6);
}

function formatTranslationKey(text) {
  let cleanedText = text.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  if (!cleanedText) return null;
  if (/^\d/.test(cleanedText)) {
    cleanedText = "_" + cleanedText;
  }
  if (cleanedText.length > 30) {
    let words = cleanedText.split("_").slice(0, 3).join("_");
    return `${words}_${generateShortHash(cleanedText)}`;
  }
  return cleanedText;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;
  const fileName = path.basename(filePath, path.extname(filePath)).replace(/-/g, "_");

  if (!translations[fileName]) {
    translations[fileName] = {};
  }

  if (!content.includes("import { useTranslation } from 'react-i18next';")) {
    content = `import { useTranslation } from 'react-i18next';\n` + content;
    modified = true;
  }

  if (!content.includes("const { t } = useTranslation();")) {
    let lines = content.split("\n");
    let functionIndex = lines.findIndex(line => line.includes("function ") || line.includes("const ") && line.includes("= ("));
    if (functionIndex !== -1) {
      lines.splice(functionIndex + 1, 0, "  const { t } = useTranslation();");
      content = lines.join("\n");
      modified = true;
    }
  }

  content = content.replace(TEXT_REGEX, (match, before, text, after) => {
    const cleanedText = text.trim().replace(/\n/g, " ");
    let key = formatTranslationKey(cleanedText);
    if (key && !translations[fileName][key]) translations[fileName][key] = cleanedText;
    modified = true;
    return key ? `${before}{t('${fileName}.${key}')}${after}` : match;
  });

  content = content.replace(ATTR_REGEX, (match, attr, text) => {
    const cleanedText = text.trim();
    let key = formatTranslationKey(cleanedText);
    if (key && !translations[fileName][key]) translations[fileName][key] = cleanedText;
    modified = true;
    return key ? `${attr}={t('${fileName}.${key}')}` : match;
  });

  content = content.replace(MAP_REGEX, (match, text) => {
    const cleanedText = text.trim();
    let key = formatTranslationKey(cleanedText);
    if (key) translations[fileName][key] = cleanedText;
    modified = true;
    return key ? `t('${fileName}.${key}')` : match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`✅ Updated: ${filePath}`);
  }
}

function scanProject(dir) {
  let stack = [dir];
  while (stack.length) {
    const currentDir = stack.pop();
    fs.readdirSync(currentDir).forEach((file) => {
      let fullPath = path.join(currentDir, file);
      if (file === "node_modules" || file.startsWith(".")) return;
      if (fs.statSync(fullPath).isDirectory()) {
        stack.push(fullPath);
      } else if (file.endsWith(".jsx") || file.endsWith(".tsx") || file.endsWith(".js")) {
        processFile(fullPath);
      }
    });
  }
}

console.log(`🔍 Scanning project: ${PROJECT_DIR}`);
scanProject(PROJECT_DIR);
fs.writeFileSync(PUBLIC_TRANSLATIONS_FILE, JSON.stringify(translations, null, 2), "utf-8");
console.log("✅ Extraction completed! Check public/locales/en/translation.json");


if (!fs.existsSync(I18N_FILE)) {
  const i18nContent = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const availableLanguages = ['en', 'hi'];

const detectionOptions = {
  order: ['navigator', 'htmlTag', 'path', 'subdomain'],
  checkWhitelist: true,
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    supportedLngs: availableLanguages,
    detection: detectionOptions,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;`;

 

  fs.writeFileSync(I18N_FILE, i18nContent, "utf-8");
  
  console.log("✅ Created i18n.ts in src/");
}

  if(!fs.existsSync(LANGUAGE_FILE)) {
    const languageFileContent = `import { useTranslation } from "react-i18next";
    import { useState, useEffect } from "react";
    import i18next from "i18next";
    import { MdLanguage } from "react-icons/md";

    const languages = [
    { code: "en", label: "English" },
    { code: "hindi", label: "हिंदी" },
    ];

    const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
      const savedLanguage = localStorage.getItem("selectedLanguage");
      if (savedLanguage) {
        i18next.changeLanguage(savedLanguage);
      }
    }, []);

    const handleSelect = (lng: any) => {
      i18next.changeLanguage(lng);
      localStorage.setItem("selectedLanguage", lng);
      setMenuOpen(false);
    };

    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "transparent",
            color: "white",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          <MdLanguage fontSize="1.5rem" color="#eab180" />
          {i18n.language.toUpperCase()}
        </button>
        {menuOpen && (
          <ul
            style={{
              position: "absolute",
              top: "40px",
              left: 0,
              background: "#e65116",
              color: "white",
              listStyle: "none",
              padding: "5px 0",
              margin: 0,
              borderRadius: "10px",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.15)",
              minWidth: "100px",
            }}
          >
            {languages.map(({ code, label }) => (
              <li
                key={code}
                onClick={() => handleSelect(code)}
                style={{
                  padding: "5px 20px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "500",
                }}
                
              >
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
    };

    export default LanguageSwitcher;
    `
    fs.writeFileSync(LANGUAGE_FILE, languageFileContent, "utf-8")
    console.log("✅ Created Language.tsx in src/");
}
function translateToLanguages() {
    TARGET_LANGUAGES.forEach(async (lang) => {
      try {
        console.log(`🌍 Translating to ${lang}...`);
        const url = `${API_URL}/${lang}?path=${TRANSLATIONS_DIR}&apiKey=${API_KEY}`;
        const response = await axios.get(url);
  
        if (response.status === 200) {
          console.log(`✅ ${lang} translation completed!`);
        } else {
          console.error(`❌ Failed to translate to ${lang}:`, response.data);
        }
      } catch (error) {
        console.error(`❌ Error translating to ${lang}:`, error.message);
      }
    });
  }
  
  function waitForFile(filePath, callback) {
    console.log(`⏳ Waiting for ${filePath} to be created...`);
    const interval = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(interval);
        console.log(`✅ Found ${filePath}, starting translation...`);
        callback();
      }
    }, 2000);
  }
  
  console.log(`🔍 Scanning project: ${PROJECT_DIR}`);
  waitForFile(PUBLIC_TRANSLATIONS_FILE, translateToLanguages);
  