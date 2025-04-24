import { useTranslation } from "react-i18next";
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

export default LanguageSwitcher;