import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../Components/LanguageContext";
import logo from "../assets/logo.svg";
import "./RegisterPage.css";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { language } = useContext(LanguageContext);

    const t = {
        en: {
            register:"Register", email:"Email", password:"Password", confirmpass:"Confirm Password", 
            alredy:"Already have an account ? Log in", confirm:"Confirm"
        },
        th: {
            register:"สมัครสมาชิก", email:"อีเมล", password:"รหัสผ่าน", confirmpass:"ยืนยันรหัสผ่าน", 
            alredy:"มีบัญชีอยู่แล้วใช่ไหม? เข้าสู่ระบบ", confirm:"ยืนยัน"
        },
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        // เช็คความถูกต้องข้อมูล
        if (!email || !password || !confirmPassword) {
            setError("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }
        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            return;
        }

        // บันทึกข้อมูลสมัครผู้ใช้ ลง localStorage (สำหรับตัวอย่าง) หรือส่ง api backend
        localStorage.setItem("registeredEmail", email);
        localStorage.setItem("registeredPassword", password);

        // กลับหน้า Login
        navigate("/login")
    };

    const handleBack = () => navigate("/login");

return (
    <>
        <div className="back-button">
          <button
            onClick={handleBack} className="back-btn">
            Back
          </button>
        </div>

    <div className="register-container">
        
            <img src={logo} alt="logo" className="logo-register" />
        
            <div className="register-form">
                <h3>{t[language].register}</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={t[language].email}
                        required
                    />
                    <div className="password-wrapper">
                        <input
                        
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={t[language].password}
                        required
                    />
                    </div>

                    <div className="password-wrapper">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t[language].confirmpass}
                        required
                    />
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button type="submit" className="btn-register">
                       {t[language].confirm}
                    </button>
                </form>
                <span className="goto-login" onClick={() => navigate("/login")}>
                    {t[language].alredy}
                </span>
            </div>
        </div>
     </>
    );
}