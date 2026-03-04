import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [bgLocked, setBgLocked] = useState(false);

  const fileInputRef = useRef();
  const bgInputRef = useRef();
  const sceneRef = useRef();

  const MAX_IMAGES = 15;

  /* ===============================
     LOAD SAVED DATA
  =============================== */
  useEffect(() => {
    const saved = localStorage.getItem("art-world");
    const savedBg = localStorage.getItem("art-world-bg");
    const savedLock = localStorage.getItem("art-world-bg-lock");

    if (saved) setCharacters(JSON.parse(saved));
    if (savedBg) setBackgroundImage(savedBg);
    if (savedLock) setBgLocked(JSON.parse(savedLock));
  }, []);

  useEffect(() => {
    localStorage.setItem("art-world", JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    if (backgroundImage) {
      localStorage.setItem("art-world-bg", backgroundImage);
    }
  }, [backgroundImage]);

  useEffect(() => {
    localStorage.setItem("art-world-bg-lock", JSON.stringify(bgLocked));
  }, [bgLocked]);

  /* ===============================
     REMOVE WHITE BACKGROUND
  =============================== */
  const removeBackground = (imgSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgSrc;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const maxSize = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height);
          width *= scale;
          height *= scale;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };

  /* ===============================
     UPLOAD DRAWING
  =============================== */
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      const cleanImage = await removeBackground(event.target.result);

      const newChar = {
        id: Date.now(),
        src: cleanImage,
        x: Math.random() * window.innerWidth * 0.5,
        y: Math.random() * window.innerHeight * 0.4,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
      };

      setCharacters((prev) => {
        let updated = [...prev, newChar];
        if (updated.length > MAX_IMAGES) {
          updated = updated.slice(updated.length - MAX_IMAGES);
        }
        return updated;
      });
    };

    reader.readAsDataURL(file);
    e.target.value = null;
  };

  /* ===============================
     BACKGROUND UPLOAD
  =============================== */
  const handleBackgroundUpload = (e) => {
    if (bgLocked) return;

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      setBackgroundImage(event.target.result);
    };

    reader.readAsDataURL(file);
    e.target.value = null;
  };

  /* ===============================
     CLEAR ALL DRAWINGS
  =============================== */
  const clearAll = () => {
    if (window.confirm("Clear all drawings?")) {
      setCharacters([]);
      localStorage.removeItem("art-world");
    }
  };

  /* ===============================
     FULLSCREEN
  =============================== */
  const goFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  /* ===============================
     FLOAT PHYSICS
  =============================== */
  useEffect(() => {
    let frame;

    const animate = () => {
      setCharacters((prev) =>
        prev.map((char) => {
          let { x, y, vx, vy } = char;

          x += vx;
          y += vy;

          const maxX = window.innerWidth - 170;
          const maxY = window.innerHeight - 230;

          if (x <= 0 || x >= maxX) vx = -vx;
          if (y <= 0 || y >= maxY) vy = -vy;

          return { ...char, x, y, vx, vy };
        })
      );

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  /* ===============================
     DRAG
  =============================== */
  const handleDrag = (id) => (e) => {
    const scene = sceneRef.current.getBoundingClientRect();

    const move = (moveEvent) => {
      const x = moveEvent.clientX - scene.left;
      const y = moveEvent.clientY - scene.top;

      setCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, x, y, vx: 0, vy: 0 } : c))
      );
    };

    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  /* ===============================
     EXPORT
  =============================== */
  const exportScene = async () => {
    const canvas = await html2canvas(sceneRef.current);
    const link = document.createElement("a");
    link.download = "floating-art.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ textAlign: "center" }}>
      {/* BUTTON BAR */}
      <div
        style={{
          padding: "12px 0",
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {[
          {
            label: "Upload Drawing",
            action: () => fileInputRef.current.click(),
          },
          {
            label: "Change Background",
            action: () => bgInputRef.current.click(),
            disabled: bgLocked,
          },
          {
            label: bgLocked ? "🔒 Background Locked" : "🔓 Lock Background",
            action: () => setBgLocked(!bgLocked),
          },
          { label: "🧹 Clear All", action: clearAll },
          { label: "🖥 Fullscreen", action: goFullscreen },
          { label: "Export", action: exportScene },
        ].map((btn, index) => (
          <button
            key={index}
            onClick={btn.action}
            disabled={btn.disabled}
            style={{
              padding: "10px 18px",
              borderRadius: "30px",
              border: "none",
              background: btn.disabled
                ? "#cccccc"
                : "linear-gradient(135deg,#667eea,#764ba2)",
              color: "white",
              fontWeight: "600",
              cursor: btn.disabled ? "not-allowed" : "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!btn.disabled) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 14px rgba(0,0,0,0.25)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0px)";
              e.target.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
            }}
          >
            {btn.label}
          </button>
        ))}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleUpload}
          style={{ display: "none" }}
        />

        <input
          type="file"
          accept="image/*"
          ref={bgInputRef}
          onChange={handleBackgroundUpload}
          style={{ display: "none" }}
        />
      </div>

      <h2 style={{ margin: 0 }}>✨ Floating Art World ✨</h2>

      {/* SCENE */}
      <div
        ref={sceneRef}
        style={{
          width: "100%",
          height: "80vh",
          position: "relative",
          overflow: "hidden",
          marginTop: "5px",
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : "linear-gradient(135deg,#4facfe,#00f2fe)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {characters.map((char) => (
          <div
            key={char.id}
            onMouseDown={handleDrag(char.id)}
            style={{
              position: "absolute",
              left: char.x,
              top: char.y,
              cursor: "grab",
            }}
          >
            <img
              src={char.src}
              style={{
                maxHeight: "150px",
                width: "auto",
                pointerEvents: "none",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
