import React, { useRef, useState, useEffect } from "react";
import "../css/sidebar.css";
import { storage, db, auth } from "../firebase";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";

export default function Sidebar({ currentView, setCurrentView }) {
  const [collapsed, setCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  // Expand states
  const [myDriveExpanded, setMyDriveExpanded] = useState(true);
  const [foldersExpanded, setFoldersExpanded] = useState(true); 

  const fileInputRef = useRef(null);
  const user = auth.currentUser;

  const customFolders = [
    { id: "private", name: "Private" },
    { id: "college", name: "College" },
    { id: "documents", name: "Documents" },
  ];

  // --- Helper: Format Bytes to Readable String ---
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // --- Calculate Storage ---
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "files"), where("ownerId", "==", user.uid));
    
    // Real-time listener for file additions/deletions
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let calculatedSize = 0;
      snapshot.forEach((doc) => {
        calculatedSize += doc.data().size || 0;
      });
      setTotalSize(calculatedSize);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Storage Bar Logic (Fixed at 2GB limit for demo)
  const totalLimitGB = 2; 
  const totalLimitBytes = totalLimitGB * 1024 * 1024 * 1024;
  const usedPercent = Math.min((totalSize / totalLimitBytes) * 100, 100);

  // --- Upload Logic ---
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { alert("Please sign in"); return; }

    setUploading(true);
    const path = `files/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(sRef, file);

    uploadTask.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { console.error(err); setUploading(false); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "files"), {
          name: file.name,
          size: file.size,
          type: file.type,
          downloadURL: url,
          storagePath: path,
          ownerId: user.uid,
          uploadedAt: serverTimestamp(),
          starred: false,
          trashed: false,
        });
        setUploading(false);
        setUploadProgress(0);
      }
    );
  }

  const handleGetStorage = () => {
    window.open("https://one.google.com/plans?i=m&utm_source=drive&utm_medium=web&utm_campaign=g1_widget_normal&g1_landing_page=7#upgrade", "_blank");
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Upload Popup */}
      {uploading && (
        <div className="uploadPopup">
          <div className="uploadPopupHeader"><span>Uploading...</span><span>{uploadProgress}%</span></div>
          <div className="uploadPopupProgress"><div className="uploadPopupFill" style={{ width: `${uploadProgress}%` }} /></div>
        </div>
      )}

      {/* 1. TOP SECTION */}
      <div className="sidebar-top">
        <button className="new-btn" onClick={() => fileInputRef.current.click()} title="New">
          <span className="material-symbols-outlined plus-icon">add</span>
          {!collapsed && <span className="new-text">New</span>}
        </button>
        <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} />
      </div>

      {/* 2. NAVIGATION */}
      <div className="sidebar-nav">
        <div 
          className={`nav-item ${currentView === "home" ? "active" : ""}`}
          onClick={() => setCurrentView("home")}
          title="Home"
        >
          <span className="material-symbols-outlined nav-icon">home</span>
          {!collapsed && <span className="nav-text">Home</span>}
        </div>

        <div 
          className={`nav-item ${currentView === "myDrive" ? "active" : ""}`}
          onClick={() => setCurrentView("myDrive")}
          title="My Drive"
        >
          {!collapsed && (
            <span 
              className="material-symbols-outlined arrow-icon" 
              onClick={(e) => { e.stopPropagation(); setMyDriveExpanded(!myDriveExpanded); }}
            >
              {myDriveExpanded ? "arrow_drop_down" : "arrow_right"}
            </span>
          )}
          <span className="material-symbols-outlined nav-icon">hard_drive</span>
          {!collapsed && <span className="nav-text">My Drive</span>}
        </div>

        {/* FOLDERS SUB-SECTION */}
        {myDriveExpanded && !collapsed && (
          <div className="sub-folder-container">
             <div className="nav-item sub-header" onClick={() => setFoldersExpanded(!foldersExpanded)}>
               <span className="material-symbols-outlined arrow-icon">
                 {foldersExpanded ? "arrow_drop_down" : "arrow_right"}
               </span>
               <span className="material-symbols-outlined nav-icon" style={{fontSize: 18}}>folder</span>
               <span className="nav-text">Folders</span>
             </div>

             {foldersExpanded && customFolders.map(folder => (
               <div 
                 key={folder.id}
                 className={`nav-item sub-item ${currentView === folder.id ? "active" : ""}`}
                 onClick={() => setCurrentView(folder.id)}
               >
                 <span className="material-symbols-outlined nav-icon" style={{fontSize: 18}}>folder_open</span>
                 <span className="nav-text">{folder.name}</span>
               </div>
             ))}
          </div>
        )}

       

        <div className="spacer"></div>

        <div className={`nav-item ${currentView === "shared" ? "active" : ""}`} onClick={() => setCurrentView("shared")} title="Shared with me">
          <span className="material-symbols-outlined nav-icon">group</span>
          {!collapsed && <span className="nav-text">Shared with me</span>}
        </div>

        <div className={`nav-item ${currentView === "recent" ? "active" : ""}`} onClick={() => setCurrentView("recent")} title="Recent">
          <span className="material-symbols-outlined nav-icon">schedule</span>
          {!collapsed && <span className="nav-text">Recent</span>}
        </div>

        <div className={`nav-item ${currentView === "starred" ? "active" : ""}`} onClick={() => setCurrentView("starred")} title="Starred">
          <span className="material-symbols-outlined nav-icon">star</span>
          {!collapsed && <span className="nav-text">Starred</span>}
        </div>

        <div className="spacer"></div>


        <div className={`nav-item ${currentView === "trash" ? "active" : ""}`} onClick={() => setCurrentView("trash")} title="Bin">
          <span className="material-symbols-outlined nav-icon">delete</span>
          {!collapsed && <span className="nav-text">Bin</span>}
        </div>

        {collapsed && (
          <div className="nav-item" title="Storage">
            <span className="material-symbols-outlined nav-icon">cloud_queue</span>
          </div>
        )}
      </div>

      {/* 3. STORAGE PROGRESS (Hidden when collapsed) */}
      {!collapsed && (
        <div className="storage-section">
          <div className="storage-progress-bg">
            <div className="storage-progress-fill" style={{ width: `${usedPercent}%` }}></div>
          </div>
          
          <div className="storage-text">
            {formatBytes(totalSize)} of {totalLimitGB} GB used
          </div>
          
          <button className="get-storage-btn" onClick={handleGetStorage}>
            Get more storage
          </button>
        </div>
      )}

      {/* 4. TOGGLE BUTTON */}
      <div className={`sidebar-footer-toggle ${collapsed ? "center" : "right"}`}>
         <button className="collapse-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>
           <span className="material-symbols-outlined">
             {collapsed ? "chevron_right" : "chevron_left"}
           </span>
         </button>
      </div>
    </aside>
  );
}