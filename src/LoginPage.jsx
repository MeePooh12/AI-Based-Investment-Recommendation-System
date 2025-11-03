import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./LoginPage.css";
import logo from "./assets/logo.svg";
import { LanguageContext } from "./Components/LanguageContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // สถานะแสดงรหัส
  const [isLoading, setIsLoading] = useState(false);
  const { language, toggleLanguage } = useContext(LanguageContext);
    console.log("Language context:", { language });
  const navigate = useNavigate();

  const t = {
    en: {
      title: "AI-BASED INVESTMENT RECOMMENDATION SYSTEM",
      email: "Email Address",
      password: "Password",
      remember: "Remember me",
      forgot: "Forgot Password?",
      signin: "Sign in",
      signup: "Sign up",
      loading: "LOADING...",
    },
    th: {
      title: "ระบบแนะนำการลงทุนด้วย AI",
      email: "อีเมล",
      password: "รหัสผ่าน",
      remember: "จดจำฉันไว้",
      forgot: "ลืมรหัสผ่าน?",
      signin: "เข้าสู่ระบบ",
      signup: "สมัครสมาชิก",
      loading: "กำลังโหลด...",
    },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const defaultEmail = "admin@gmail.com";
    const defaultPassword = "963.";
    
    if (email === defaultEmail && password === defaultPassword) {
      if (remember) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      localStorage.setItem("isLoggedIn", "true");

      const username = email.split("@")[0];
      localStorage.setItem("username", username);

      setIsLoading(true);
    } else {
      alert("Email หรือ Password ไม่ถูกต้อง");
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden"; // ล็อค scroll
    return () => {
      document.body.style.overflow = "auto"; // ปลดล็อคเมื่อออกจากหน้า
    };
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => navigate("/search"), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, navigate]);
  
  return (
    <div className="login-container">
      <button className="lang-switch" onClick={toggleLanguage}>
        {language === "en" ? "EN" : "ไทย"}
      </button>

      <div className="login-left">
        <div className="logo-circle">
          <img src={logo} alt="Logo" className="logo-img" />
        </div>
      </div>

      <div className="login-right">
        <div className="login-form">
          <h3>ระบบแนะนำการลงทุนด้วย AI</h3>
          <img src="ai.svg" alt="Logo" className="logo-top" />
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t[language]?.email || t.en.email}
              required
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"} // เปลี่ยน type ตาม showPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t[language]?.password || t.en.password}
                required
              ></input>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              ></button>
            </div>

            <div className="login-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />
                 {t[language]?.remember || t.en.remember}
              </label>
              <span className="forgot">{t[language]?.forgot || t.en.forgot}</span>
            </div>

            <button type="submit" className="btn-login">
              {t[language]?.signin || t.en.signin}
            </button>
            <button type="button" className="register-link" 
                onClick={() => navigate("/register")}>
              {t[language]?.signup || t.en.signup}
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {isLoading && (
          <motion.div 
          className="loading-content">
            <img src={logo} alt="Logo" className="loading-logo" />
            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>
            <p className="loading-text">{t[language]?.loading || t.en.loading}</p>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
