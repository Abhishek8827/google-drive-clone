import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/header.css";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// Use the provided local image path (developer-provided image)
const LOCAL_ACCOUNT_IMG = "/mnt/data/85305649-f90a-4e98-99c6-eb9bedf4b937.png";

export default function Header({ darkMode, toggleTheme, searchTerm, setSearchTerm }) {
  // --- Existing State ---
  const [appsOpen, setAppsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountsCollapsed, setAccountsCollapsed] = useState(false);

  // --- NEW STATE for Settings & Help ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // --- Refs ---
  const appsRef = useRef(null);
  const profileRef = useRef(null);
  const settingsRef = useRef(null); // <-- NEW REF
  const helpRef = useRef(null);     // <-- NEW REF
  const navigate = useNavigate();

  const apps = [
    { id: "account", title: "Account", iconType: "img", icon: "https://i.pravatar.cc/300" },
    { id: "drive", title: "Drive", iconType: "svg", icon: "add_to_drive" },
    { id: "business", title: "Business Profile", iconType: "svg", icon: "store" },
    { id: "gmail", title: "Gmail", iconType: "svg", icon: "mail" },
    { id: "youtube", title: "YouTube", iconType: "svg", icon: "play_circle" },
    { id: "gemini", title: "Gemini", iconType: "svg", icon: "stars" },
    { id: "maps", title: "Maps", iconType: "svg", icon: "place" },
    { id: "search", title: "Search", iconType: "svg", icon: "search" },
    { id: "calendar", title: "Calendar", iconType: "svg", icon: "calendar_month" },
    { id: "chrome", title: "Chrome", iconType: "svg", icon: "language" },
    { id: "news", title: "News", iconType: "svg", icon: "newspaper" },
    { id: "photos", title: "Photos", iconType: "svg", icon: "photo" },
  ];

  useEffect(() => {
    function onDocClick(e) {
      if (appsOpen && appsRef.current && !appsRef.current.contains(e.target)) setAppsOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      
      // --- Close Settings/Help if clicked outside ---
      if (settingsOpen && settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
      if (helpOpen && helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    }
    
    function onEsc(e) {
      if (e.key === "Escape") {
        setAppsOpen(false);
        setProfileOpen(false);
        setSettingsOpen(false);
        setHelpOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [appsOpen, profileOpen, settingsOpen, helpOpen]);

  function onAppClick(app) {
    setAppsOpen(false);
    switch (app.id) {
      case "drive": navigate("/drive"); break;
      case "gmail": window.open("https://mail.google.com", "_blank", "noopener"); break;
      case "youtube": window.open("https://www.youtube.com", "_blank", "noopener"); break;
      default: window.open("https://www.google.com/search?q=" + encodeURIComponent(app.title), "_blank", "noopener"); break;
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out failed", err);
    } finally {
      navigate("/signin", { replace: true });
    }
  }

  function handleProfileToggle() {
    setProfileOpen((s) => !s);
    if (!profileOpen) setAppsOpen(false);
  }

  function handleAddAccount() { console.log("Add another account clicked"); }
  function handleSwitchAccount(accountId) { console.log("Switch to account:", accountId); }

  return (
    <>
      <div className={`header ${darkMode ? "dark" : "light"}`} role="banner">
        {/* LOGO */}
        <div className="header_logo" aria-hidden>
          <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" alt="Drive logo" />
          <span className="logo_text">Drive</span>
        </div>

        {/* SEARCH */}
        <div className="header_search" role="search" aria-label="Search files">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Search here..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search"
          />
          {searchTerm !== "" && (
            <button className="clear_btn" onClick={() => setSearchTerm("")} aria-label="Clear search">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* ICONS */}
        <div className="header_icons" role="navigation" aria-label="Header actions">
          <div className="icons_left hil">
            {/* Theme Toggle */}
            <span 
              className="material-symbols-outlined header-icon" 
              onClick={toggleTheme} 
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? "light_mode" : "dark_mode"}
            </span>

            {/* --- HELP ICON WITH DROPDOWN --- */}
            <div className="icon-wrap" ref={helpRef}>
              <span 
                className={`material-symbols-outlined header-icon ${helpOpen ? "active" : ""}`} 
                title="Support"
                onClick={() => { setHelpOpen(!helpOpen); setSettingsOpen(false); }}
              >
                help
              </span>
              {helpOpen && (
                <div className="popup-menu">
                  <div className="popup-item">Help</div>
                  <div className="popup-item">Training</div>
                  <div className="popup-item">Updates</div>
                  <div className="popup-separator"></div>
                  <div className="popup-item">Terms and Policy</div>
                  <div className="popup-item">Send feedback to Google</div>
                </div>
              )}
            </div>

            {/* --- SETTINGS ICON WITH DROPDOWN --- */}
            <div className="icon-wrap" ref={settingsRef}>
              <span 
                className={`material-symbols-outlined header-icon ${settingsOpen ? "active" : ""}`} 
                title="Settings"
                onClick={() => { setSettingsOpen(!settingsOpen); setHelpOpen(false); }}
              >
                settings
              </span>
              {settingsOpen && (
                <div className="popup-menu">
                  <div className="popup-item">Settings</div>
                  <div className="popup-item">Get Drive for desktop</div>
                  <div className="popup-item">Keyboard shortcuts</div>
                </div>
              )}
            </div>
          </div>

          <div className="icons_right hil">
            <button className="header-icon appsBtn" onClick={() => setAppsOpen((s) => !s)} aria-haspopup="dialog" aria-expanded={appsOpen} title="Google apps">
              <span className="material-symbols-outlined">apps</span>
            </button>

            <div className="profile_wrapper" onClick={handleProfileToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleProfileToggle(); }} aria-haspopup="dialog" aria-expanded={profileOpen}>
              <img src="https://i.pravatar.cc/300" className="profile_icon" alt="profile" />
            </div>

            <button className="header-icon signoutBtn" onClick={handleLogout} title="Sign out">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* APPS GRID DIALOG */}
      {appsOpen && (
        <div className="appsOverlay" role="dialog" aria-modal="true" aria-label="Google apps">
          <div className="appsDialog" ref={appsRef}>
            <div className="appsHeader">
              <div className="appsTitle">Google apps</div>
              <button className="appsClose" onClick={() => setAppsOpen(false)} aria-label="Close apps">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="appsGrid">
              {apps.map((a) => (
                <button key={a.id} className="appTile" onClick={() => onAppClick(a)} title={a.title}>
                  <div className="appIconWrap">
                    {a.iconType === "img" ? <img src={a.icon} alt={a.title} className="appTileImg" /> : <span className="material-symbols-outlined appTileSvg">{a.icon}</span>}
                  </div>
                  <div className="appTitle">{a.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE DIALOG */}
      {profileOpen && (
        <div className="profileOverlay" role="dialog" aria-modal="true" aria-label="Account menu">
          <div className="profileDialog" ref={profileRef}>
            <div className="profileTop">
              <div className="profileEmail">user@example.com</div>
              <button className="profileClose" onClick={() => setProfileOpen(false)} aria-label="Close profile">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="profileAvatarArea">
              <div className="avatarRing">
                <img src={LOCAL_ACCOUNT_IMG} alt="Account avatar" className="largeAvatar" onError={(e) => { e.target.onerror = null; e.target.src="https://i.pravatar.cc/300"; }} />
              </div>
              <div className="greeting">Hi, User!</div>
              <a className="manageBtn" href="https://myaccount.google.com" target="_blank" rel="noreferrer">Manage your Google Account</a>
            </div>
            <div className="accountsSection">
              <button className="collapseBtn" onClick={() => setAccountsCollapsed((s) => !s)} aria-expanded={!accountsCollapsed} aria-controls="profile-accounts-list">
                {accountsCollapsed ? "Show more accounts" : "Hide more accounts"}
                <span className={`material-symbols-outlined chev ${accountsCollapsed ? "" : "open"}`}>expand_more</span>
              </button>
              <div id="profile-accounts-list" className={`accountsList ${accountsCollapsed ? "collapsed" : "expanded"}`}>
                <div className="accountRow" onClick={() => handleSwitchAccount("user2")} role="button">
                  <img className="accountThumb" src="https://i.pravatar.cc/100" alt="User 2" />
                  <div className="accountInfo">
                    <div className="accountName">Secondary User</div>
                    <div className="accountEmail">user2@example.com</div>
                  </div>
                </div>
              </div>
              <div className="profileActions">
                <button className="addAccount" onClick={handleAddAccount}>Add another account</button>
                <button className="signoutFull" onClick={() => { setProfileOpen(false); handleLogout(); }}>Sign out</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}