import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Data from "./components/Data";
import SignIn from "./components/SignIn";
import PrivateRoute from "./components/PrivateRoute";

import "./index.css";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- NEW: View State (myDrive, recent, starred, trash) ---
  const [currentView, setCurrentView] = useState("myDrive");

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      return newMode;
    });
  };

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/drive" replace />} />
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/drive"
          element={
            <PrivateRoute>
              <div className={`app-root ${darkMode ? "dark-mode" : ""}`}>
                <Header 
                  darkMode={darkMode} 
                  toggleTheme={toggleTheme} 
                  searchTerm={searchTerm} 
                  setSearchTerm={setSearchTerm} 
                />
                <div className="app-shell">
                  {/* Pass view state to Sidebar */}
                  <Sidebar 
                    currentView={currentView} 
                    setCurrentView={setCurrentView} 
                  />
                  {/* Pass view state to Data to filter files */}
                  <Data 
                    searchTerm={searchTerm} 
                    currentView={currentView} 
                  />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/drive" replace />} />
      </Routes>
    </Router>
  );
}