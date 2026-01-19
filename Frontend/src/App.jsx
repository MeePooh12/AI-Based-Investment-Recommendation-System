import React, { useState } from "react";
import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./Components/LanguageContext";
import PrivateLayout from "./Components/PrivateLayout";
import LoginPage from "./LoginPage";
import RegisterPage from "./Pages/RegisterPage";
import RiskPage from "./Pages/RiskPage";
import FavoritePage from "./Pages/FavoritePage";
import SearchPage from "./Pages/SearchPage";
import Stockdetail from "./Components/Stockdetail";
import RecommendationPage from "./Pages/RecommendationPage";

  export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Private Routes (Header + Outlet) */}
        <Route element={<PrivateLayout />}>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stock/:symbol" element={<Stockdetail />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/favorite" element={<FavoritePage />} />
          <Route path="/recommendation" element={<RecommendationPage />} />
          
          {/* เมื่ออยู่ในโซนล็อกอินแล้ว, ให้ root ไปหน้า search */}
          <Route path="/" element={<Navigate to="/search" replace />} />
          {/* กันหลงทาง: เส้นทางไม่ตรง → ไป /search */}
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Route>

        {/* กันหลงทางนอกโซนล็อกอิน: ไป /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </LanguageProvider>
  );
}
