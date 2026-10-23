import { useEffect, useState } from "react";
import "./VirtualWallPreview.css";
import { getImageUrl, apiRequest } from "./api";

export default function VirtualWallPreview({ onBack }) {
  const [paintings, setPaintings] = useState([]);
  const [roomPhoto, setRoomPhoto] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [size, setSize] = useState(30);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(45);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPaintings() {
      try {
        const data = await apiRequest("/api/paintings");

        if (!Array.isArray(data)) {
          throw new Error("Invalid paintings response.");
        }

        if (!cancelled) {
          setPaintings(data);
          if (data.length > 0) {
            setSelectedId(data[0]._id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load paintings for preview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPaintings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (roomPhoto) URL.revokeObjectURL(roomPhoto);
    };
  }, [roomPhoto]);

  const selectedPainting = paintings.find(
    (painting) => painting._id === selectedId
  );

  const paintingImage = selectedPainting?.imageUrl
    ? getImageUrl(selectedPainting.imageUrl)
    : "";

  function handleRoomUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose a valid image file (PNG, JPG, JPEG, WEBP).");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Please choose a room photo smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setRoomPhoto((previousPhoto) => {
      if (previousPhoto) URL.revokeObjectURL(previousPhoto);
      return URL.createObjectURL(file);
    });
  }

  function resetPreview() {
    setSize(30);
    setPositionX(50);
    setPositionY(45);
  }

  return (
    <main className="virtual-page">
      <button
        type="button"
        className="virtual-back-button"
        onClick={onBack}
      >
        ← Back to Marketplace
      </button>

      <header className="virtual-header">
        <span className="virtual-eyebrow">
          ✦ ARTFIT VIRTUAL EXPERIENCE
        </span>
        <h1>See Original Art On Your Wall</h1>
        <p>
          Take a photo of your living room, bedroom, or gallery wall. Place any artwork directly in your space with interactive scaling before you purchase.
        </p>
      </header>

      <div className="virtual-layout">
        <aside className="virtual-controls">
          <section className="virtual-card">
            <span className="virtual-step">STEP 01</span>
            <h2>Upload your room photo</h2>
            <p className="virtual-description">
              Upload a clear frontal photo of your wall.
            </p>

            <label className="virtual-upload" htmlFor="roomPhoto">
              <span className="virtual-upload-icon">📷</span>
              <strong>
                {roomPhoto ? "Change room photo" : "Choose room photo"}
              </strong>
              <span>JPG, PNG or WEBP · Max 10 MB</span>
            </label>

            <input
              id="roomPhoto"
              className="virtual-file-input"
              type="file"
              accept="image/*"
              onChange={handleRoomUpload}
            />

            {roomPhoto && (
              <button
                type="button"
                className="virtual-text-button"
                onClick={() => setRoomPhoto("")}
              >
                ✕ Remove room photo
              </button>
            )}
          </section>

          <section className="virtual-card">
            <span className="virtual-step">STEP 02</span>
            <h2>Select artwork to place</h2>

            {loading && <p>Loading artwork collection...</p>}

            {error && (
              <p className="virtual-error" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && paintings.length === 0 && (
              <p>No artwork available yet. Artists will upload soon.</p>
            )}

            <div className="virtual-painting-list">
              {paintings.map((painting) => {
                const imageUrl = getImageUrl(painting.imageUrl);

                return (
                  <button
                    type="button"
                    key={painting._id}
                    className={`virtual-painting-option ${
                      selectedId === painting._id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedId(painting._id)}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={painting.title || "Artwork"}
                      />
                    ) : (
                      <span className="virtual-image-placeholder">
                        🎨
                      </span>
                    )}

                    <span className="virtual-painting-info">
                      <strong>{painting.title || "Untitled artwork"}</strong>
                      <span>₹{painting.price ?? "—"}</span>
                    </span>

                    <span className="virtual-select-mark">
                      {selectedId === painting._id ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="virtual-card">
            <span className="virtual-step">STEP 03</span>
            <h2>Adjust placement & scale</h2>

            <div className="virtual-slider-group">
              <label htmlFor="paintingSize">
                <span>Painting size / scale</span>
                <strong>{size}%</strong>
              </label>
              <input
                id="paintingSize"
                type="range"
                min="10"
                max="75"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              />
            </div>

            <div className="virtual-slider-group">
              <label htmlFor="positionX">
                <span>Horizontal (Left / Right)</span>
                <strong>{positionX}%</strong>
              </label>
              <input
                id="positionX"
                type="range"
                min="5"
                max="95"
                value={positionX}
                onChange={(event) => setPositionX(Number(event.target.value))}
              />
            </div>

            <div className="virtual-slider-group">
              <label htmlFor="positionY">
                <span>Vertical (Up / Down)</span>
                <strong>{positionY}%</strong>
              </label>
              <input
                id="positionY"
                type="range"
                min="5"
                max="95"
                value={positionY}
                onChange={(event) => setPositionY(Number(event.target.value))}
              />
            </div>

            <button
              type="button"
              className="virtual-reset-button"
              onClick={resetPreview}
            >
              ↺ Reset position & scale
            </button>
          </section>
        </aside>

        <section className="virtual-preview-card">
          <div className="virtual-preview-heading">
            <div>
              <span className="virtual-step">LIVE VISUALIZATION</span>
              <h2>Interactive Wall Preview</h2>
            </div>
            <span className="virtual-live-badge">● Live Canvas</span>
          </div>

          <div className="virtual-canvas">
            {roomPhoto ? (
              <>
                <img
                  className="virtual-room-image"
                  src={roomPhoto}
                  alt="Your uploaded room"
                />

                {selectedPainting && paintingImage && (
                  <img
                    className="virtual-artwork-overlay"
                    src={paintingImage}
                    alt={selectedPainting.title || "Selected painting"}
                    style={{
                      left: `${positionX}%`,
                      top: `${positionY}%`,
                      width: `${size}%`,
                    }}
                  />
                )}

                {selectedPainting && !paintingImage && (
                  <div className="virtual-preview-notice">
                    This painting has no image available.
                  </div>
                )}
              </>
            ) : (
              <div className="virtual-empty-preview">
                <span className="virtual-empty-icon">🖼️</span>
                <h3>Your room preview starts here</h3>
                <p>
                  Upload a photo of your room wall on the left to see
                  your selected artwork hung in your space.
                </p>
                <span className="virtual-empty-hint">
                  No wall photo uploaded yet
                </span>
              </div>
            )}
          </div>

          <div className="virtual-preview-footer">
            <div>
              <span style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)" }}>
                ACTIVE ARTWORK
              </span>
              <strong style={{ display: "block", fontSize: "17px", color: "var(--ink)", marginTop: "2px" }}>
                {selectedPainting?.title || "No artwork selected"}
              </strong>
              {selectedPainting && (
                <span style={{ color: "var(--purple)", fontWeight: "700" }}>
                  ₹{selectedPainting.price} · {selectedPainting.theme} ({selectedPainting.frameSize} frame)
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
              Drag the sliders on the left to place the artwork on your wall.
            </p>
          </div>

          <p className="virtual-disclaimer">
            * This tool renders a placement visualization. Lighting and exact dimensions may vary in person.
          </p>
        </section>
      </div>
    </main>
  );
}
