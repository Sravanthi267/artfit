import { useState, useEffect } from "react";
import { API_BASE_URL, getSavedSession } from "./api";

function UploadPainting({ user, onBack, onUploadSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [theme, setTheme] = useState("Nature");
  const [frameSize, setFrameSize] = useState("normal");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Revoke object URL when preview changes or component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function handleImageChange(e) {
    const file = e.target.files?.[0] || null;
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    if (!file) {
      setImage(null);
      setImagePreview("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage("Image file must be 5 MB or smaller.");
      e.target.value = "";
      setImage(null);
      setImagePreview("");
      return;
    }

    setIsError(false);
    setMessage("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleUpload(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!user?.id || user.role !== "artist") {
      setIsError(true);
      setMessage("Please log in using an active artist account.");
      return;
    }

    if (!image) {
      setIsError(true);
      setMessage("Please select a painting image file.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("price", price);
    formData.append("theme", theme);
    formData.append("frameSize", frameSize);
    formData.append("artistId", user.id);
    formData.append("image", image);

    setLoading(true);

    try {
      const session = getSavedSession();
      const token = session?.token;

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/paintings`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Upload failed with status ${response.status}`);
      }

      setMessage("Artwork uploaded successfully! It is now live in the marketplace.");
      setTitle("");
      setDescription("");
      setPrice("");
      setTheme("Nature");
      setFrameSize("normal");
      setImage(null);
      setImagePreview("");

      if (onUploadSuccess) {
        onUploadSuccess(data.painting);
      }
    } catch (error) {
      console.error("Painting upload error:", error);
      setIsError(true);
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot reach backend. Verify server is running on port 5000 and MongoDB is connected."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="upload-page dashboard">
      <section className="upload-card dashboard-card" style={{ maxWidth: "680px", margin: "0 auto" }}>
        <button
          type="button"
          className="artist-button"
          onClick={onBack}
          style={{ marginBottom: "20px" }}
        >
          ← Back to Studio Dashboard
        </button>

        <div className="page-heading" style={{ marginBottom: "18px" }}>
          <p className="eyebrow">ARTIST STUDIO</p>
          <h2 style={{ fontSize: "28px" }}>Upload New Artwork</h2>
          <p>Showcase your original painting to collectors and art lovers.</p>
        </div>

        <form onSubmit={handleUpload}>
          <label htmlFor="painting-title">Painting Title *</label>
          <input
            id="painting-title"
            type="text"
            placeholder="e.g. Whispers of the Monsoon"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label htmlFor="painting-description">Description & Story *</label>
          <textarea
            id="painting-description"
            placeholder="Tell buyers about the inspiration, medium (oil, acrylic, watercolor), and mood..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label htmlFor="painting-price">Price (₹) *</label>
              <input
                id="painting-price"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 8500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="painting-theme">Theme / Style *</label>
              <select
                id="painting-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                required
              >
                <option value="Nature">Nature & Landscapes</option>
                <option value="Abstract">Modern Abstract</option>
                <option value="Floral">Botanical & Floral</option>
                <option value="Modern">Contemporary Modern</option>
                <option value="Traditional">Indian Heritage / Traditional</option>
                <option value="Animals">Wildlife & Animals</option>
                <option value="Spiritual">Spiritual & Devotional</option>
                <option value="Ocean">Seascape & Ocean</option>
                <option value="Fantasy">Surreal & Fantasy</option>
                <option value="Minimalist">Minimalist / Scandinavian</option>
              </select>
            </div>
          </div>

          <label htmlFor="painting-size">Recommended Frame Size</label>
          <select
            id="painting-size"
            value={frameSize}
            onChange={(e) => setFrameSize(e.target.value)}
          >
            <option value="small">Small (12" × 16")</option>
            <option value="normal">Standard (18" × 24")</option>
            <option value="large">Large (24" × 36")</option>
            <option value="tall">Panoramic / Tall (20" × 40")</option>
          </select>

          <label htmlFor="painting-image">Artwork Image File (PNG, JPG, WEBP — Max 5 MB) *</label>
          <input
            id="painting-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required={!image}
          />

          {imagePreview && (
            <div
              className="upload-preview"
              style={{
                marginTop: "14px",
                padding: "12px",
                background: "var(--canvas)",
                borderRadius: "14px",
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600" }}>Image Preview:</p>
              <img
                src={imagePreview}
                alt="Selected artwork preview"
                style={{
                  maxHeight: "260px",
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: "10px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                }}
              />
            </div>
          )}

          {message && (
            <div
              role="status"
              style={{
                marginTop: "16px",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "600",
                background: isError ? "#fff0f1" : "#e9f8ef",
                color: isError ? "#a72f3b" : "#227347",
                border: `1px solid ${isError ? "#f2d1d5" : "#b7ebc9"}`,
              }}
            >
              {message}
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Uploading Artwork..." : "✦ Publish Artwork to Gallery"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default UploadPainting;
