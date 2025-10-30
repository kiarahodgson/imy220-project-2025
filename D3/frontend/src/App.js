import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";

import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ProjectPage from "./pages/ProjectPage";
import SearchPage from "./pages/SearchPage";

import Header from "./components/Header";
import { api } from "./api";

function readStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("merge_user");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Failed to parse stored user", err);
    return null;
  }
}

function WithHeader({ children, user, onLogout }) {
  return (
    <>
      <Header user={user} onLogout={onLogout} />
      <main className="container">{children}</main>
    </>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());

  useEffect(() => {
    if (typeof window === "undefined") return () => {};

    function handleAuthChange(evt) {
      if (evt?.detail && "user" in evt.detail) {
        setCurrentUser(evt.detail.user);
      } else {
        setCurrentUser(readStoredUser());
      }
    }

    function handleStorage(evt) {
      if (evt.key === "merge_user") {
        try {
          setCurrentUser(evt.newValue ? JSON.parse(evt.newValue) : null);
        } catch {
          setCurrentUser(null);
        }
      }
    }

    window.addEventListener("merge-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("merge-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.debug("[Logout]", err);
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("merge_user");
      window.localStorage.removeItem("merge_token");
      window.dispatchEvent(new CustomEvent("merge-auth-changed", { detail: { user: null } }));
    }
    setCurrentUser(null);
    navigate("/");
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route
        path="/home"
        element={
          currentUser ? (
            <WithHeader user={currentUser} onLogout={handleLogout}>
              <HomePage currentUser={currentUser} />
            </WithHeader>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/profile/:id" //dynamic route
        element={
          currentUser ? (
            <WithHeader user={currentUser} onLogout={handleLogout}>
              <ProfilePage currentUser={currentUser} />
            </WithHeader>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/project/:id"
        element={
          currentUser ? (
            <WithHeader user={currentUser} onLogout={handleLogout}>
              <ProjectPage currentUser={currentUser} />
            </WithHeader>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/search"
        element={
          currentUser ? (
            <WithHeader user={currentUser} onLogout={handleLogout}>
              <SearchPage />
            </WithHeader>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
