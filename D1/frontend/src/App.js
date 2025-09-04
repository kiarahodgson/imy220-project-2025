import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";

import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ProjectPage from "./pages/ProjectPage";

import Header from "./components/Header";
import { dummyProjects, dummyUsers, currentUserMock } from "./data/dummyData";

function WithHeader({ children }) {
  return (
    <>
      <Header />
      <main className="container">{children}</main>
    </>
  );
}

export default function App() {
  const [currentUser] = useState(currentUserMock);

  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route
        path="/home"
        element={
          <WithHeader>
            <HomePage projects={dummyProjects} />
          </WithHeader>
        }
      />
      <Route
        path="/profile/:id" //dynamic route
        element={
          <WithHeader>
            <ProfilePage
              users={dummyUsers}
              projects={dummyProjects}
              currentUser={currentUser}
            />
          </WithHeader>
        }
      />
      <Route
        path="/project/:id"
        element={
          <WithHeader>
            <ProjectPage projects={dummyProjects} users={dummyUsers} />
          </WithHeader>
        }
      />

      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
