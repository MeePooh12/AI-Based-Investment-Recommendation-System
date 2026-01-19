import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg";
import "./ForgotPassword.css"

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting...");

    try {
      const res = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) setMessage("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
      else setError(data.error || "เกิดข้อผิดพลาด");
    
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  const handleBack = () => navigate("/login");

  return (
    <>
      <div className="back-button">
              <button onClick={handleBack} className="back-btn">Back</button>
      </div>
      
    <div className="forgot-page">
      <img src={logo} alt="logo" className="logo-forgot" />
      <div className="forgot-from">
        <h2>ลืมรหัสผ่าน</h2>
          <p>กรอกอีเมลเพื่อรับลิงก์เปลี่ยนรหัสผ่าน</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="forgot-btn">
            ส่งลิงก์
          </button>
        </form>
      </div>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
    </>
  );
}