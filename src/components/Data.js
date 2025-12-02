import React, { useEffect, useState } from "react";
import "../css/data.css";
import { db, auth, storage } from "../firebase";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

export default function Data({ searchTerm, currentView }) {
  const [gridVisible, setGridVisible] = useState(true);
  const [listVisible, setListVisible] = useState(true);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // --- SELECTION & MODAL STATES ---
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [activeFile, setActiveFile] = useState(null); // For Preview Modal
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // --- CONTEXT MENU STATE ---
  const [contextMenu, setContextMenu] = useState(null); // { x, y, file }

  // --- AUTH & DATA LOADING ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    // Order by newest first
    const q = query(collection(db, "files"), orderBy("uploadedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setFiles(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // Normalize older data if necessary
          name: doc.data().name || "Untitled",
          size: doc.data().size || 0,
          mimeType: doc.data().contentType || doc.data().type || "unknown",
        }))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- CLICK OUTSIDE TO CLOSE MENU ---
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // --- HELPERS ---
  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --- ICON RENDERER (Updated for specific colors/types) ---
  const renderFileThumbnail = (file) => {
    const mime = (file.mimeType || "").toLowerCase();
    const name = (file.name || "").toLowerCase();

    // 1. IMAGES
    if (mime.startsWith("image/") && file.downloadURL) {
      return (
        <img
          src={file.downloadURL}
          alt={file.name}
          className="fileThumb"
          loading="lazy"
        />
      );
    }
    // 2. PDF (Red)
    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      return (
        <div className="fileIcon fileIcon--pdf">
          <span className="material-symbols-outlined">picture_as_pdf</span>
        </div>
      );
    }
    // 3. WORD (Blue)
    if (
      mime.includes("wordprocessingml") ||
      mime.includes("msword") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    ) {
      return (
        <div className="fileIcon fileIcon--word">
          <span className="material-symbols-outlined">article</span>
        </div>
      );
    }
    // 4. EXCEL (Green)
    if (
      mime.includes("spreadsheetml") ||
      mime.includes("excel") ||
      name.endsWith(".xls") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".csv")
    ) {
      return (
        <div className="fileIcon fileIcon--excel">
          <span className="material-symbols-outlined">table_view</span>
        </div>
      );
    }
    // 5. POWERPOINT (Yellow)
    if (
      mime.includes("presentationml") ||
      name.endsWith(".ppt") ||
      name.endsWith(".pptx")
    ) {
      return (
        <div className="fileIcon fileIcon--ppt">
          <span className="material-symbols-outlined">slideshow</span>
        </div>
      );
    }
    // 6. VIDEO (Red)
    if (mime.startsWith("video/") || name.endsWith(".mp4")) {
      return (
        <div className="fileIcon fileIcon--video">
          <span className="material-symbols-outlined">movie</span>
        </div>
      );
    }
    // 7. AUDIO (Purple)
    if (mime.startsWith("audio/") || name.endsWith(".mp3")) {
      return (
        <div className="fileIcon fileIcon--audio">
          <span className="material-symbols-outlined">headphones</span>
        </div>
      );
    }
    // 8. DEFAULT
    return (
      <div className="fileIcon fileIcon--generic">
        <span className="material-symbols-outlined">description</span>
      </div>
    );
  };

  // --- ACTIONS ---
  const handleRename = async () => {
    if (!activeFile || !renameValue.trim()) return;
    try {
      await updateDoc(doc(db, "files", activeFile.id), { name: renameValue });
      setRenameOpen(false);
      // Update local state immediately for better UX
      setActiveFile((prev) => ({ ...prev, name: renameValue }));
    } catch (e) {
      alert("Rename failed");
    }
  };

  const handleDelete = async () => {
    if (!activeFile) return;
    // If in trash, delete forever
    if (currentView === "trash") {
      try {
        if (activeFile.storagePath) {
          try {
            await deleteObject(storageRef(storage, activeFile.storagePath));
          } catch (e) {
            console.warn("Storage delete error", e);
          }
        }
        await deleteDoc(doc(db, "files", activeFile.id));
      } catch (e) {
        alert("Delete failed");
      }
    } else {
      // Soft delete
      await updateDoc(doc(db, "files", activeFile.id), { trashed: true });
    }
    setConfirmDeleteOpen(false);
    setActiveFile(null);
  };

  const toggleStar = async (file) => {
    await updateDoc(doc(db, "files", file.id), { starred: !file.starred });
  };

  const restoreFromTrash = async (file) => {
    await updateDoc(doc(db, "files", file.id), { trashed: false });
  };

  // --- INTERACTION HANDLERS ---
  const handleFileClick = (e, file) => {
    e.stopPropagation();
    setSelectedFileId(file.id);
    setContextMenu(null);
  };

  const handleDoubleClick = (e, file) => {
    e.stopPropagation();
    setActiveFile(file);
    setContextMenu(null);
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFileId(file.id);
    setContextMenu({ x: e.pageX, y: e.pageY, file: file });
  };

  // --- FILTERING LOGIC ---
  const filteredFiles = files.filter((file) => {
    // 1. Search
    if (
      searchTerm &&
      !file.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;

    // 2. View-specific filtering
    if (currentView === "trash") return file.trashed === true;
    if (file.trashed) return false; // Hide trashed files from all other views

    if (currentView === "starred") return file.starred === true;
    if (currentView === "recent") return true; // Recent shows all (sorted by date)

    return true; // "myDrive"
  });

  return (
    <div
      className="data"
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu(null);
      }}
    >
      {/* --- HEADER --- */}
      <div className="data_header">
        <div className="data_headerLeft">
          <button
            className="driveArrowBtn"
            onClick={() => setGridVisible(!gridVisible)}
          >
            <span className="driveLabelText">
              {currentView === "myDrive" && "My Drive"}
              {currentView === "recent" && "Recent"}
              {currentView === "starred" && "Starred"}
              {currentView === "trash" && "Trash"}
            </span>
            <span
              className={`material-symbols-outlined ${
                gridVisible ? "" : "rotate-180"
              }`}
            >
              arrow_drop_down
            </span>
          </button>
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="data_content">
        {loading && <div style={{ padding: 20 }}>Loading files...</div>}

        {!loading && filteredFiles.length === 0 && (
          <div style={{ padding: 20, color: "gray", textAlign: "center" }}>
            {currentView === "trash" ? "Trash is empty" : "No files found"}
          </div>
        )}

        {/* 1. GRID VIEW */}
        {gridVisible && (
          <div className="data_grid">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`data_file ${
                  selectedFileId === file.id ? "selected" : ""
                }`}
                onClick={(e) => handleFileClick(e, file)}
                onDoubleClick={(e) => handleDoubleClick(e, file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
              >
                <div className="thumbWrap">{renderFileThumbnail(file)}</div>
                <p>{file.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* 2. LIST VIEW (Optional second view) */}
        {listVisible && (
          <div className="data_list" style={{ marginTop: 30 }}>
            <div className="detailsRow headerRow">
              <p className="colName"><b>Name</b></p>
              <p><b>Owner</b></p>
              <p><b>Last Modified</b></p>
              <p><b>Size</b></p>
              <p><b>Actions</b></p>
            </div>
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`detailsRow rows ${
                  selectedFileId === file.id ? "selected" : ""
                }`}
                onClick={(e) => handleFileClick(e, file)}
                onDoubleClick={(e) => handleDoubleClick(e, file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
              >
                <p>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      marginRight: 8,
                      color: file.starred ? "#f4b400" : "#dadce0",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(file);
                    }}
                  >
                    {file.starred ? "star" : "star_border"}
                  </span>
                  {file.name}
                </p>
                <p>Me</p>
                <p>{formatDate(file.uploadedAt)}</p>
                <p>{formatSize(file.size)}</p>
                <div className="actionsCell">
                  <button
                    className="iconBtn"
                    title="Preview"
                    onClick={() => setActiveFile(file)}
                  >
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                  <button
                    className="iconBtn"
                    title="Menu"
                    onClick={(e) => handleContextMenu(e, file)}
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- RIGHT CLICK CONTEXT MENU --- */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-item"
            onClick={() => {
              setActiveFile(contextMenu.file);
              setContextMenu(null);
            }}
          >
            <span className="material-symbols-outlined">visibility</span> Preview
          </div>

          <div
            className="context-item"
            onClick={() => {
              window.open(contextMenu.file.downloadURL);
              setContextMenu(null);
            }}
          >
            <span className="material-symbols-outlined">download</span> Download
          </div>

          <div
            className="context-item"
            onClick={() => {
              toggleStar(contextMenu.file);
              setContextMenu(null);
            }}
          >
            <span className="material-symbols-outlined">star</span>
            {contextMenu.file.starred ? "Remove star" : "Add to Starred"}
          </div>

          <div
            className="context-item"
            onClick={() => {
              setRenameValue(contextMenu.file.name);
              setActiveFile(contextMenu.file);
              setRenameOpen(true);
              setContextMenu(null);
            }}
          >
            <span className="material-symbols-outlined">edit</span> Rename
          </div>

          <div className="context-separator"></div>

          {currentView === "trash" ? (
            <>
              <div
                className="context-item"
                onClick={() => {
                  restoreFromTrash(contextMenu.file);
                  setContextMenu(null);
                }}
              >
                <span className="material-symbols-outlined">restore_from_trash</span>{" "}
                Restore
              </div>
              <div
                className="context-item danger"
                onClick={() => {
                  setActiveFile(contextMenu.file);
                  setConfirmDeleteOpen(true);
                  setContextMenu(null);
                }}
              >
                <span className="material-symbols-outlined">delete_forever</span>{" "}
                Delete Forever
              </div>
            </>
          ) : (
            <div
              className="context-item"
              onClick={() => {
                // Soft delete
                updateDoc(doc(db, "files", contextMenu.file.id), { trashed: true });
                setContextMenu(null);
              }}
            >
              <span className="material-symbols-outlined">delete</span> Move to Trash
            </div>
          )}
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {activeFile && !renameOpen && !confirmDeleteOpen && (
        <div className="modalOverlay" onClick={() => setActiveFile(null)}>
          <div className="fileModal" onClick={(e) => e.stopPropagation()}>
            <div className="fileModalHeader">
              <div style={{ fontWeight: 700 }}>{activeFile.name}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="iconBtn"
                  onClick={() => window.open(activeFile.downloadURL)}
                  title="Download"
                >
                  <span className="material-symbols-outlined">download</span>
                </button>
                <button
                  className="iconBtn"
                  onClick={() => setActiveFile(null)}
                  title="Close"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="fileModalBody">
              {activeFile.mimeType.startsWith("image/") ? (
                <img
                  src={activeFile.downloadURL}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: "70vh" }}
                />
              ) : activeFile.mimeType === "application/pdf" ? (
                <iframe
                  src={activeFile.downloadURL}
                  title="PDF"
                  style={{ width: "100%", height: "70vh", border: "none" }}
                />
              ) : activeFile.mimeType.startsWith("video/") ? (
                <video
                  controls
                  src={activeFile.downloadURL}
                  style={{ maxWidth: "100%", maxHeight: "70vh" }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 64, color: "gray", marginBottom: 16 }}
                  >
                    description
                  </span>
                  <p>No preview available</p>
                  <a
                    href={activeFile.downloadURL}
                    className="smallBtn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RENAME MODAL --- */}
      {renameOpen && (
        <div className="modalOverlay" onClick={() => setRenameOpen(false)}>
          <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
            <h3>Rename</h3>
            <input
              className="modalInput"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
            <div className="modalActions">
              <button className="smallBtn" onClick={() => setRenameOpen(false)}>
                Cancel
              </button>
              <button
                className="smallBtn"
                style={{ background: "#1a73e8", color: "white" }}
                onClick={handleRename}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION --- */}
      {confirmDeleteOpen && (
        <div className="modalOverlay" onClick={() => setConfirmDeleteOpen(false)}>
          <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete forever?</h3>
            <p>"{activeFile?.name}" will be deleted forever.</p>
            <div className="modalActions">
              <button
                className="smallBtn"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="smallBtn danger"
                onClick={handleDelete}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}