import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import Header from "./Header";

export default function PrivateLayout() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
