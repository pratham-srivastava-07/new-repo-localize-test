const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const PROJECT_DIR = path.resolve(args[0] || path.join(__dirname, "../react"));
const PUBLIC_TRANSLATIONS_FILE = path.join(PROJECT_DIR, "public/locales/en/translation.json");
const I18N_FILE = path.join(PROJECT_DIR, "src/i18n.ts");
const LANGUAGE_FILE = path.join(PROJECT_DIR, "src/Language.tsx");

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

function generateShortHash(text) {
  return crypto.createHash("md5").update(text).digest("hex").substring(0, 6);
}

function formatTranslationKey(text) {
  let cleanedText = text.trim().replace(/^"|"$/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  if (!cleanedText) return null;
  if (/^\d/.test(cleanedText)) cleanedText = "_" + cleanedText;
  if (cleanedText.length > 30) {
    let words = cleanedText.split("_").slice(0, 3).join("_");
    return `${words}_${generateShortHash(cleanedText)}`;
  }
  return cleanedText;
}

function shouldTranslate(text) {
  // Conditions to skip translation
  if (!text || text.trim().length < 3) return false;
  if (/^[0-9]+$/.test(text.trim())) return false;
  if (text.includes("{") || text.includes("}") || text.includes("$")) return false;
  if (text.includes("()") || text.includes("=>")) return false;
  if (text.includes("t(")) return false;
  if (/^[`~!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(text.trim())) return false;
  return true;
}

// Helper function to check if a position is in a comment
function isInComment(content, startPos) {
  // Check if position is in a single-line comment
  let lineStartPos = content.lastIndexOf("\n", startPos);
  lineStartPos = lineStartPos === -1 ? 0 : lineStartPos;
  
  const lineBeforePos = content.substring(lineStartPos, startPos);
  if (lineBeforePos.includes("//")) {
    return true;
  }
  
  // Check if position is in a multi-line comment (/* */)
  const lastCommentStart = content.lastIndexOf("/*", startPos);
  if (lastCommentStart !== -1) {
    const lastCommentEnd = content.lastIndexOf("*/", startPos);
    if (lastCommentEnd === -1 || lastCommentEnd < lastCommentStart) {
      return true;
    }
  }
  
  // Check if position is in a JSX comment ({/* */})
  const lastJsxCommentStart = content.lastIndexOf("{/*", startPos);
  if (lastJsxCommentStart !== -1) {
    const lastJsxCommentEnd = content.lastIndexOf("*/}", startPos);
    if (lastJsxCommentEnd === -1 || lastJsxCommentEnd < lastJsxCommentStart) {
      return true;
    }
  }
  
  return false;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;
  const fileName = path.basename(filePath, path.extname(filePath)).replace(/-/g, "_");

  if (!translations[fileName]) {
    translations[fileName] = {};
  }

  // Check if file has active code (not just comments)
  // Remove comments for this check to see if there's any code left
  const contentWithoutComments = content
    .replace(/\/\/.*$/gm, '') // Remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // Remove JSX comments
    .trim();
  
  if (!contentWithoutComments) {
    return; // Skip entirely commented files
  }

  // Check if translation import/usage already exists in the active code
// Function to check if a given line is commented out
function isCommentedLine(content, startPos) {
  const beforePos = content.substring(0, startPos);

  // Check for single-line comment
  const lastLineStart = beforePos.lastIndexOf("\n");
  const lineContent = beforePos.substring(lastLineStart);
  if (lineContent.trim().startsWith("//")) return true;

  // Check for multi-line comment
  const openMultiComment = beforePos.lastIndexOf("/*");
  const closeMultiComment = beforePos.lastIndexOf("*/");
  if (openMultiComment !== -1 && (closeMultiComment === -1 || closeMultiComment < openMultiComment)) {
    return true;
  }

  // Check for JSX comment ({/* */})
  const openJsxComment = beforePos.lastIndexOf("{/*");
  const closeJsxComment = beforePos.lastIndexOf("*/}");
  if (openJsxComment !== -1 && (closeJsxComment === -1 || closeJsxComment < openJsxComment)) {
    return true;
  }

  return false;
}

// Function to check if a given block of code is inside a multi-line comment
function isInsideCommentBlock(content, position) {
  const beforePos = content.substring(0, position);
  const insideBlockComment = beforePos.lastIndexOf("/*") > beforePos.lastIndexOf("*/");
  return insideBlockComment;
}

// Check if import exists in active (non-commented) code
const activeCodeHasImport = content
  .split("\n")
  .some((line, idx) => line.includes("import { useTranslation } from 'react-i18next';") &&
    !isCommentedLine(line) &&
    !isInsideCommentBlock(content, content.indexOf(line)));

// Check if "const { t } = useTranslation();" exists in active code
const activeCodeHasT = content
  .split("\n")
  .some((line, idx) => line.includes("const { t } = useTranslation();") &&
    !isCommentedLine(line) &&
    !isInsideCommentBlock(content, content.indexOf(line)));

  // Add translation import and hook if not present in active code
  if (!activeCodeHasImport) {
    // content = `import { useTranslation } from 'react-i18next';\n` + content;
    // modified = true;
    const lines = content.split("\n");
    let insertIndex = 0;
    
    // Skip over initial comments to find first non-comment line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (line === "") continue;
      
      // Check if line is a comment
      const isSingleLineComment = line.startsWith("//");
      const isStartOfMultiLineComment = line.startsWith("/*");
      const isEndOfMultiLineComment = line.includes("*/") && !line.startsWith("/*");
      const isJSXCommentStart = line.includes("{/*");
      const isJSXCommentEnd = line.includes("*/}");
      
      if (isSingleLineComment) {
        continue; // Skip single line comments
      } else if (isStartOfMultiLineComment) {
        // Skip until we find the end of the multi-line comment
        while (i < lines.length && !lines[i].includes("*/")) {
          i++;
        }
        // Skip the line with */ too
        continue;
      } else if (isJSXCommentStart && !isJSXCommentEnd) {
        // Skip until we find the end of the JSX comment
        while (i < lines.length && !lines[i].includes("*/}")) {
          i++;
        }
        // Skip the line with */} too
        continue;
      } else {
        // Found first non-comment line
        insertIndex = i;
        break;
      }
    }
    
    // Insert import statement after comments
    lines.splice(insertIndex, 0, `import { useTranslation } from 'react-i18next';`);
    content = lines.join("\n");
    modified = true;
  }
  
  if (!activeCodeHasT) {
    let lines = content.split("\n");
    let insertIndex = -1;
    let insideFunction = false;
    
    // First pass: find all function declarations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for normal function component
      if (line.startsWith("export default function") || line.startsWith("function ")) {
        // Find the first { after the function declaration
        for (let j = i; j < lines.length; j++) {
          if (lines[j].includes("{")) {
            insertIndex = j + 1; // Position right after the opening bracket
            insideFunction = true;
            break;
          }
        }
        break;
      }
      // Check for arrow function component
      else if ((line.startsWith("const") || line.startsWith("let")) && 
               line.includes("=") && line.includes("(") && 
               !isCommentedLine(content, content.indexOf(line)) &&
               !isInsideCommentBlock(content, content.indexOf(line))) {
        insertIndex = i + 1;
        insideFunction = true;
        break;
      }
    }
  
    if (insertIndex !== -1 && insideFunction) {
      lines.splice(insertIndex, 0, "  const { t } = useTranslation();");
      content = lines.join("\n");
      modified = true;
    } else {
      // No suitable location found - don't add the declaration
      console.log(`⚠️ Couldn't find appropriate position for t declaration in ${filePath}`);
    }
  }

  // Process tag content with comment awareness
  const regex = />([\s]*[^<>{}\n]+[\s]*)</g;
  let match;
  let newContent = content;
  const replacements = [];
  
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0];
    const text = match[1];
    const matchStartPos = match.index;
    
    // Skip if this match is in a comment
    if (isInComment(content, matchStartPos)) {
      continue;
    }
    
    const cleanedText = text.trim();
    if (!isCommentedLine(content, matchStartPos) &&shouldTranslate(cleanedText)) {
      let key = formatTranslationKey(cleanedText);
      if (key) {
        translations[fileName][key] = cleanedText;
        
        // Preserve spacing before and after the text
        const leadingSpace = text.match(/^(\s*)/)[0];
        const trailingSpace = text.match(/(\s*)$/)[0];
        
        const replacement = `>${leadingSpace}{t('${fileName}.${key}')${trailingSpace}}<`;
        replacements.push({ 
          start: matchStartPos, 
          end: matchStartPos + fullMatch.length,
          replacement: replacement
        });
        
        modified = true;
      }
    }
  }
  
  // Apply replacements in reverse order to not mess up positions
  replacements.sort((a, b) => b.start - a.start);
  for (const rep of replacements) {
    newContent = newContent.substring(0, rep.start) + rep.replacement + newContent.substring(rep.end);
  }
  
  content = newContent;

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

// i18n.ts creation
if (!fs.existsSync(I18N_FILE)) {
  const i18nContent = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const availableLanguages = ['en', 'hindi'];

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

// Language.tsx creation
if (!fs.existsSync(LANGUAGE_FILE)) {
  const languageFileContent = `import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import i18next from "i18next";
import { MdLanguage } from "react-icons/md";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
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

  const handleSelect = (lng) => {
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

export default LanguageSwitcher;`;
  fs.writeFileSync(LANGUAGE_FILE, languageFileContent, "utf-8");
  console.log("✅ Created Language.tsx in src/");
}