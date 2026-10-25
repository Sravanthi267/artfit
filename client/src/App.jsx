import { useEffect, useState } from "react";
import "./App.css";
import UploadPainting from "./UploadPainting";
import VirtualWallPreview from "./VirtualWallPreview";
import {
  getImageUrl,
  apiRequest,
  getSavedSession,
  saveSession,
  clearSession,
  getSavedCart,
  saveCart,
  getSavedWishlist,
  saveWishlist,
} from "./api";

// ==================== NAVBAR (DECLARED OUTSIDE APP TO PREVENT UNNECESSARY RE-RENDERS) ====================
function Navbar({
  user,
  cartCount,
  wishlistCount,
  orderCount,
  activePage,
  onNavigate,
  onLogout,
}) {
  const isCustomer = user?.role === "customer";
  const isArtistUser = user?.role === "artist";

  return (
    <header className="navbar">
      <button
        type="button"
        className="brand-button"
        onClick={() => onNavigate("home")}
        aria-label="ARTFIT home"
      >
        <span className="brand-mark">A</span>
        <span className="brand-copy">
          <span className="logo">
            ART<span>FIT</span>
          </span>
          <span className="brand-tagline">
            Discover art. Transform your space.
          </span>
        </span>
      </button>

      {user ? (
        <nav className="nav-actions" aria-label="Main navigation">
          {isCustomer && (
            <>
              <button
                type="button"
                className={`nav-link ${activePage === "home" ? "active" : ""}`}
                onClick={() => onNavigate("home")}
              >
                Home
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "gallery" ? "active" : ""}`}
                onClick={() => onNavigate("gallery")}
              >
                Explore Art
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "preview" ? "active" : ""}`}
                onClick={() => onNavigate("preview")}
              >
                ✦ Virtual Wall
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "wishlist" ? "active" : ""}`}
                onClick={() => onNavigate("wishlist")}
              >
                Wishlist
                {wishlistCount > 0 && (
                  <span className="nav-count">{wishlistCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "cart" ? "active" : ""}`}
                onClick={() => onNavigate("cart")}
              >
                Cart
                {cartCount > 0 && (
                  <span className="nav-count">{cartCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "orders" ? "active" : ""}`}
                onClick={() => onNavigate("orders")}
              >
                My Orders
                {orderCount > 0 && (
                  <span className="nav-count">{orderCount}</span>
                )}
              </button>
            </>
          )}

          {isArtistUser && (
            <>
              <button
                type="button"
                className={`nav-link ${activePage === "home" ? "active" : ""}`}
                onClick={() => onNavigate("home")}
              >
                Studio Dashboard
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "upload" ? "active" : ""}`}
                onClick={() => onNavigate("upload")}
              >
                + Upload Art
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "paintings" ? "active" : ""}`}
                onClick={() => onNavigate("paintings")}
              >
                My Artwork
              </button>
              <button
                type="button"
                className={`nav-link ${activePage === "artist-orders" ? "active" : ""}`}
                onClick={() => onNavigate("artist-orders")}
              >
                Orders Received
              </button>
            </>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginLeft: "10px",
              paddingLeft: "10px",
              borderLeft: "1px solid var(--line)",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                fontWeight: "600",
              }}
            >
              {user.name} ({user.role})
            </span>
            <button
              type="button"
              className="nav-logout"
              onClick={onLogout}
              title="Sign out of ARTFIT"
            >
              Logout
            </button>
          </div>
        </nav>
      ) : (
        <p className="header-tagline">Original Art for Everyday Living</p>
      )}
    </header>
  );
}

// ==================== MAIN APP COMPONENT ====================
function App() {
  // Auth state initialized from localStorage session if available
  const initialSession = getSavedSession();
  const [isLogin, setIsLogin] = useState(true);
  const [isArtist, setIsArtist] = useState(
    initialSession?.user?.role === "artist"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(
    initialSession?.user || null
  );

  // Active navigation page
  // Values: 'home' | 'gallery' | 'preview' | 'wishlist' | 'cart' | 'checkout' | 'orders' | 'upload' | 'paintings' | 'artist-orders'
  const [currentPage, setCurrentPage] = useState("home");

  // Cart & Wishlist with localStorage persistence
  const [cart, setCart] = useState(() => getSavedCart());
  const [wishlist, setWishlist] = useState(() => getSavedWishlist());

  // Order state
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [checkoutPaintings, setCheckoutPaintings] = useState([]);

  // Delivery details form state
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPincode, setDeliveryPincode] = useState("");

  // Toast / notification banner
  const [bannerMessage, setBannerMessage] = useState(null);

  function showBanner(text, type = "success") {
    setBannerMessage({ text, type });
    setTimeout(() => {
      setBannerMessage((current) => (current?.text === text ? null : current));
    }, 4500);
  }

  // ==================== RESTORE USER SESSION ====================
  useEffect(() => {
    const saved = getSavedSession();
    if (saved && saved.token) {
      // Verify session with backend silently in background
      apiRequest("/api/auth/me")
        .then((res) => {
          if (res?.user) {
            setLoggedInUser(res.user);
            saveSession(saved.token, res.user);
          }
        })
        .catch(() => {
          // Token expired or invalid, clear invalid session
          clearSession();
          setLoggedInUser(null);
        });
    }
  }, []);

  // Save cart changes
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  // Save wishlist changes
  useEffect(() => {
    saveWishlist(wishlist);
  }, [wishlist]);

  // Load customer order count
  useEffect(() => {
    let cancelled = false;

    async function loadCustomerCount() {
      if (loggedInUser?.role === "customer") {
        try {
          const data = await apiRequest(`/api/orders/customer/${loggedInUser.id}`);
          if (!cancelled && Array.isArray(data)) {
            const activeOrders = data.filter((item) => item.status !== "Cancelled");
            setOrderCount(activeOrders.length);
          }
        } catch {
          // Silent fallback
        }
      }
    }

    loadCustomerCount();

    return () => {
      cancelled = true;
    };
  }, [loggedInUser]);

  async function refreshOrderCount(userId) {
    if (!userId) return;
    try {
      const data = await apiRequest(`/api/orders/customer/${userId}`);
      if (Array.isArray(data)) {
        // Count only active (non-cancelled) orders
        const activeOrders = data.filter((item) => item.status !== "Cancelled");
        setOrderCount(activeOrders.length);
      }
    } catch (error) {
      console.error("Order count error:", error);
    }
  }

  // ==================== AUTHENTICATION HANDLERS ====================
  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!isLogin && !name.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!email.trim() || !password) {
      alert("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      alert("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/login" : "/api/signup";
      const requestBody = {
        email: email.trim().toLowerCase(),
        password,
        role: isArtist ? "artist" : "customer",
        ...(!isLogin && { name: name.trim() }),
      };

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (isLogin) {
        if (!data.user || !data.user.role) {
          alert("Invalid user data received from server.");
          return;
        }

        saveSession(data.token, data.user);
        setLoggedInUser(data.user);
        setIsArtist(data.user.role === "artist");
        setCurrentPage("home");

        showBanner(`Welcome back, ${data.user.name}!`);

        if (data.user.role === "customer") {
          await refreshOrderCount(data.user.id);
        }
      } else {
        alert(data.message || "Account created successfully! Please sign in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (error) {
      console.error("Login/signup error:", error);
      alert(error.message || "Could not complete request. Check server connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setLoggedInUser(null);
    setIsLogin(true);
    setIsArtist(false);
    setCurrentPage("home");
    setCheckoutPaintings([]);
    setOrderCount(0);
    setName("");
    setEmail("");
    setPassword("");
    showBanner("You have been signed out.", "info");
  }

  // ==================== WISHLIST HANDLERS ====================
  function toggleWishlist(painting) {
    setWishlist((current) => {
      const exists = current.some((item) => item._id === painting._id);
      if (exists) {
        showBanner(`Removed "${painting.title}" from Wishlist.`, "info");
        return current.filter((item) => item._id !== painting._id);
      }
      showBanner(`Added "${painting.title}" to your Wishlist! ❤️`);
      return [...current, painting];
    });
  }

  // ==================== CART HANDLERS ====================
  function addToCart(painting) {
    setCart((prev) => {
      const alreadyInCart = prev.some((item) => item._id === painting._id);
      if (alreadyInCart) {
        alert(`"${painting.title}" is already in your cart.`);
        return prev;
      }
      showBanner(`Added "${painting.title}" to cart! 🛒`);
      return [...prev, painting];
    });
  }

  function removeFromCart(paintingId) {
    setCart((prev) => prev.filter((item) => item._id !== paintingId));
    showBanner("Item removed from cart.", "info");
  }

  // ==================== ORDER / CHECKOUT FLOW ====================
  function handleBuyNow(painting) {
    if (!loggedInUser?.id) {
      alert("Please sign in as a customer to purchase artwork.");
      return;
    }

    if (loggedInUser.role !== "customer") {
      alert("Only customers can purchase artwork.");
      return;
    }

    setCheckoutPaintings([painting]);
    setDeliveryName(loggedInUser.name || "");
    setDeliveryPhone("");
    setDeliveryAddress("");
    setDeliveryCity("");
    setDeliveryPincode("");
    setCurrentPage("checkout");
  }

  function handleCartCheckout() {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (loggedInUser?.role !== "customer") {
      alert("Only customer accounts can place orders.");
      return;
    }

    setCheckoutPaintings([...cart]);
    setDeliveryName(loggedInUser.name || "");
    setDeliveryPhone("");
    setDeliveryAddress("");
    setDeliveryCity("");
    setDeliveryPincode("");
    setCurrentPage("checkout");
  }

  async function handleConfirmOrder(event) {
    event.preventDefault();

    if (!loggedInUser?.id) {
      alert("Please log in to continue.");
      return;
    }

    if (checkoutPaintings.length === 0) {
      alert("No artwork selected for checkout.");
      return;
    }

    const cleanPhone = deliveryPhone.trim();
    const cleanPincode = deliveryPincode.trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      alert("Please enter a valid 10-digit Indian mobile number (begins with 6, 7, 8, or 9).");
      return;
    }

    if (!/^\d{6}$/.test(cleanPincode)) {
      alert("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    setOrderLoading(true);

    try {
      for (const painting of checkoutPaintings) {
        await apiRequest("/api/orders", {
          method: "POST",
          body: JSON.stringify({
            customerId: loggedInUser.id,
            paintingId: painting._id,
            customerName: deliveryName.trim(),
            phone: cleanPhone,
            address: deliveryAddress.trim(),
            city: deliveryCity.trim(),
            pincode: cleanPincode,
            paymentMethod: "Cash on Delivery",
          }),
        });
      }

      const orderedIds = checkoutPaintings.map((p) => p._id);
      setCart((prev) => prev.filter((p) => !orderedIds.includes(p._id)));
      setCheckoutPaintings([]);

      await refreshOrderCount(loggedInUser.id);
      setCurrentPage("orders");
      showBanner("Order confirmed successfully! You can track or cancel pending orders below.");
    } catch (error) {
      console.error("Place order error:", error);
      alert(error.message || "Failed to confirm order. Please try again.");
    } finally {
      setOrderLoading(false);
    }
  }

  // ==================== RENDER: NOT LOGGED IN (AUTH SCREEN) ====================
  if (!loggedInUser) {
    return (
      <div className="auth-page">
        <header className="auth-navbar">
          <button
            type="button"
            className="auth-brand"
            onClick={() => {
              setIsLogin(true);
              setIsArtist(false);
            }}
            aria-label="ARTFIT home"
          >
            <span className="auth-brand-name">
              ART<span>FIT</span>
              <small>Smart Painting Discovery and Selling Platform</small>
            </span>
          </button>
            

          <div className="auth-nav-right">
            <span>{isArtist ? "Artist Studio" : "Discover Original Art"}</span>
            <span className="auth-nav-dot" />
          </div>
        </header>

        <main className="auth-layout">
          <section className="auth-showcase">
            <div className="auth-showcase-content">
              <span className="auth-pill">
                <span className="auth-pill-dot" />
                A WORLD OF ORIGINAL ART
              </span>

              <h1>
                Make room
                <br />
                for <span>beautiful.</span>
              </h1>

              <p className="auth-showcase-description">
                Connect directly with independent artists. Discover authentic handmade paintings and visualize them in your room with our Virtual Wall experience.
              </p>

              <div className="auth-artwork-frame">
                <div className="auth-artwork-image">
                  <div className="auth-art-shape auth-art-shape-one" />
                  <div className="auth-art-shape auth-art-shape-two" />
                  <div className="auth-art-shape auth-art-shape-three" />
                  <div className="auth-art-shape auth-art-shape-four" />
                  <div className="auth-art-sun" />
                </div>
                <div className="auth-artwork-caption">
                  <span>ARTFIT CURATED COLLECTION</span>
                  <span>Art for everyday living ↗</span>
                </div>
              </div>

              <div className="auth-showcase-bottom">
                <span>01 — Discover</span>
                <span>02 — Visualise</span>
                <span>03 — Make it yours</span>
              </div>
            </div>
          </section>

          <section className="auth-form-side">
            <div className="auth-card">
              <div className="auth-form-heading">
                <span className="auth-form-icon">
                  {isArtist ? "🎨" : "✦"}
                </span>

                <p className="auth-form-eyebrow">
                  {isLogin ? "WELCOME TO ARTFIT" : "YOUR ART JOURNEY STARTS HERE"}
                </p>

                <h2>
                  {isLogin
                    ? isArtist
                      ? "Welcome, Artist."
                      : "Welcome Back."
                    : isArtist
                      ? "Join as an Artist."
                      : "Create Your Account."}
                </h2>

                <p>
                  {isLogin
                    ? isArtist
                      ? "Sign in to manage your portfolio and orders."
                      : "Sign in to explore paintings and track orders."
                    : isArtist
                      ? "Showcase your original artwork to collectors."
                      : "Join our art community and find original paintings."}
                </p>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {!isLogin && (
                  <div className="auth-field">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g. Maya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <div className="auth-label-row">
                    <label htmlFor="password">Password *</label>
                    <span>{isLogin ? "Secure account" : "Min 6 characters"}</span>
                  </div>

                  
<div className="password-input-wrap">
  <input
    id="password"
    type={showPassword ? "text" : "password"}
    placeholder="••••••••"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    autoComplete={isLogin ? "current-password" : "new-password"}
    minLength={6}
    required
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowPassword((prev) => !prev)}
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? "🙈" : "👁️"}
  </button>
</div>

                </div>

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : isLogin
                      ? isArtist
                        ? "Sign in to Artist Studio"
                        : "Sign in to ARTFIT"
                      : "Create my account"}
                  {!loading && <span>→</span>}
                </button>
              </form>

              <div className="auth-switch">
                <span>
                  {isLogin
                    ? "New to ARTFIT?"
                    : "Already have an account?"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin((prev) => !prev);
                    setName("");
                    setPassword("");
                  }}
                  disabled={loading}
                >
                  {isLogin ? "Create account" : "Sign in"}
                </button>
              </div>

              <div className="auth-divider">
                <span />
                <span>ROLE SWITCH</span>
                <span />
              </div>

              <div className="auth-role-card">
                <div className="auth-role-icon">
                  {isArtist ? "🛍️" : "🖌️"}
                </div>

                <div className="auth-role-copy">
                  <strong>
                    {isArtist ? "Looking to buy art?" : "Are you an artist?"}
                  </strong>
                  <p>
                    {isArtist
                      ? "Switch to customer view to discover paintings."
                      : "Join our creator network and sell your artwork."}
                  </p>
                </div>

                <button
                  type="button"
                  className="auth-role-button"
                  onClick={() => {
                    setIsArtist((prev) => !prev);
                    setIsLogin(true);
                  }}
                  disabled={loading}
                >
                  {isArtist ? "Customer" : "Artist"} <span>→</span>
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="auth-footer">
          <span>© 2026 ARTFIT</span>
          <span>Discover art. Transform your space.</span>
          <span>Final Year Project Demonstration</span>
        </footer>
      </div>
    );
  }

  // ==================== RENDER: AUTHENTICATED USER ====================
  return (
    <div className="artfit-page">
      <Navbar
        user={loggedInUser}
        cartCount={cart.length}
        wishlistCount={wishlist.length}
        orderCount={orderCount}
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      {/* GLOBAL TOAST NOTIFICATION */}
      {bannerMessage && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "14px 20px",
            borderRadius: "14px",
            fontSize: "14px",
            fontWeight: "700",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background:
              bannerMessage.type === "info"
                ? "#25212d"
                : bannerMessage.type === "danger"
                  ? "#c03945"
                  : "#227347",
            color: "#ffffff",
          }}
        >
          <span>{bannerMessage.text}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            style={{
              background: "transparent",
              border: 0,
              color: "white",
              cursor: "pointer",
              fontSize: "16px",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ==================== PAGE: UPLOAD ARTWORK (ARTIST) ==================== */}
      {loggedInUser.role === "artist" && currentPage === "upload" && (
        <UploadPainting
          user={loggedInUser}
          onBack={() => setCurrentPage("home")}
          onUploadSuccess={() => {
            showBanner("Painting successfully uploaded!");
            setCurrentPage("paintings");
          }}
        />
      )}

      {/* ==================== PAGE: MY PAINTINGS (ARTIST) ==================== */}
      {loggedInUser.role === "artist" && currentPage === "paintings" && (
        <MyPaintings
          user={loggedInUser}
          onBack={() => setCurrentPage("home")}
          onNavigateUpload={() => setCurrentPage("upload")}
          onShowToast={showBanner}
        />
      )}

      {/* ==================== PAGE: ORDERS RECEIVED (ARTIST) ==================== */}
      {loggedInUser.role === "artist" && currentPage === "artist-orders" && (
        <ArtistOrders
          user={loggedInUser}
          onBack={() => setCurrentPage("home")}
          onShowToast={showBanner}
        />
      )}

      {/* ==================== PAGE: VIRTUAL WALL (CUSTOMER) ==================== */}
      {loggedInUser.role === "customer" && currentPage === "preview" && (
        <VirtualWallPreview onBack={() => setCurrentPage("home")} />
      )}

      {/* ==================== PAGE: WISHLIST (CUSTOMER) ==================== */}
      {loggedInUser.role === "customer" && currentPage === "wishlist" && (
        <WishlistPage
          wishlist={wishlist}
          onToggleWishlist={toggleWishlist}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
          onNavigateGallery={() => setCurrentPage("gallery")}
        />
      )}

      {/* ==================== PAGE: CART (CUSTOMER) ==================== */}
      {loggedInUser.role === "customer" && currentPage === "cart" && (
        <CartPage
          cart={cart}
          onRemove={removeFromCart}
          onCheckout={handleCartCheckout}
          onNavigateGallery={() => setCurrentPage("gallery")}
        />
      )}

      {/* ==================== PAGE: DELIVERY DETAILS / CHECKOUT (CUSTOMER) ==================== */}
      {loggedInUser.role === "customer" && currentPage === "checkout" && (
        <CheckoutPage
          checkoutPaintings={checkoutPaintings}
          deliveryName={deliveryName}
          setDeliveryName={setDeliveryName}
          deliveryPhone={deliveryPhone}
          setDeliveryPhone={setDeliveryPhone}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
          deliveryCity={deliveryCity}
          setDeliveryCity={setDeliveryCity}
          deliveryPincode={deliveryPincode}
          setDeliveryPincode={setDeliveryPincode}
          onSubmit={handleConfirmOrder}
          onBack={() =>
            setCurrentPage(checkoutPaintings.length === 1 ? "gallery" : "cart")
          }
          orderLoading={orderLoading}
        />
      )}

      {/* ==================== PAGE: MY ORDERS (CUSTOMER) ==================== */}
      {loggedInUser.role === "customer" && currentPage === "orders" && (
        <CustomerOrders
          user={loggedInUser}
          onBack={() => setCurrentPage("home")}
          onNavigateGallery={() => setCurrentPage("gallery")}
          onShowToast={showBanner}
          onOrderCancelled={() => refreshOrderCount(loggedInUser.id)}
        />
      )}

      {/* ==================== PAGE: EXPLORE ART / GALLERY (CUSTOMER) ==================== */}
      {loggedInUser.role === "customer" && currentPage === "gallery" && (
        <main className="dashboard">
          <div className="page-heading">
            <p className="eyebrow">ORIGINAL ARTWORKS</p>
            <h2>Explore Art Gallery</h2>
            <p>
              Hand-painted by verified independent artists. Filter by theme, budget, or medium.
            </p>
          </div>

          <PaintingGallery
            onAddToCart={addToCart}
            onBuyNow={handleBuyNow}
            orderLoading={orderLoading}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
          />
        </main>
      )}

      {/* ==================== PAGE: ARTIST DASHBOARD HOME ==================== */}
      {loggedInUser.role === "artist" && currentPage === "home" && (
        <main className="dashboard">
          <section className="welcome-section">
            <p className="eyebrow">ARTIST STUDIO</p>
            <h2>Welcome back, {loggedInUser.name}!</h2>
            <p>Manage your creative portfolio, track orders, and reach new collectors.</p>
          </section>

          <section className="dashboard-grid">
            <article className="dashboard-card">
              <h3>🖼️ Upload Artwork</h3>
              <p>Add new original paintings with description, dimensions, and pricing.</p>
              <button
                className="submit-button"
                onClick={() => setCurrentPage("upload")}
              >
                + Upload New Painting
              </button>
            </article>

            <article className="dashboard-card">
              <h3>🎨 My Portfolio</h3>
              <p>View, manage, or remove your uploaded artwork catalog.</p>
              <button
                className="submit-button"
                onClick={() => setCurrentPage("paintings")}
              >
                View Uploaded Art
              </button>
            </article>

            <article className="dashboard-card">
              <h3>📦 Orders Received</h3>
              <p>Fulfill collector orders, update delivery status, and handle shipments.</p>
              <button
                className="submit-button"
                onClick={() => setCurrentPage("artist-orders")}
              >
                Manage Orders
              </button>
            </article>
          </section>
        </main>
      )}

      {/* ==================== PAGE: CUSTOMER SHOPPING HOME ==================== */}
      {loggedInUser.role === "customer" && currentPage === "home" && (
        <main className="shop-home">
          {/* HERO SECTION */}
          <section className="shop-hero">
            <div className="hero-copy">
              <p className="eyebrow">ARTFIT · ORIGINAL ART MARKETPLACE</p>
              <h2>
                Art that makes
                <br />
                <span>your space yours.</span>
              </h2>
              <p className="hero-description">
                Discover authentic paintings crafted by independent artists. Visualize how any artwork looks on your wall before ordering with Cash on Delivery.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="submit-button hero-button"
                  onClick={() => setCurrentPage("gallery")}
                >
                  Explore Art Gallery <span aria-hidden="true">→</span>
                </button>

                <button
                  type="button"
                  className="hero-secondary"
                  onClick={() => setCurrentPage("preview")}
                >
                  <span aria-hidden="true">▧</span> Try Virtual Wall Preview
                </button>
              </div>

              <div className="hero-trust-row">
                <span>✦ Original Paintings</span>
                <span>✦ Independent Artists</span>
                <span>✦ Cash on Delivery</span>
                <span>✦ Easy Order Cancellation</span>
              </div>
            </div>

            <div className="hero-art-panel">
              <div className="art-panel-top">
                <span>ARTFIT CURATED</span>
                <span>2026</span>
              </div>
              <div className="abstract-art abstract-art-one">
                <span />
              </div>
              <div className="abstract-art abstract-art-two">
                <span />
              </div>
              <div className="hero-art-caption">
                <span>Authentic art for your home.</span>
              </div>
            </div>
          </section>

          {/* CURATED COLLECTION PREVIEW */}
          <section className="marketplace-section" style={{ marginTop: "48px" }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE GALLERY COLLECTION</p>
                <h2>Featured Paintings</h2>
                <p className="section-subtitle">
                  Browse by theme, search by title, and preview artwork in real-time.
                </p>
              </div>

              <button
                type="button"
                className="text-link-button"
                onClick={() => setCurrentPage("gallery")}
              >
                View all art <span aria-hidden="true">→</span>
              </button>
            </div>

            <PaintingGallery
              onAddToCart={addToCart}
              onBuyNow={handleBuyNow}
              orderLoading={orderLoading}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          </section>
        </main>
      )}

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-mark">A</span>
          <span>
            <strong>ARTFIT</strong>
            <small>Discover art. Transform your space.</small>
          </span>
        </div>
        <span>© 2026 ARTFIT — Smart Art Marketplace</span>
      </footer>
    </div>
  );
}

// ==================== PAINTINGS GALLERY COMPONENT ====================
function PaintingGallery({
  artistId = null,
  onAddToCart,
  onBuyNow,
  orderLoading,
  wishlist = [],
  onToggleWishlist,
  onPaintingDeleted,
  onShowToast,
}) {
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPainting, setSelectedPainting] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPaintings() {
      try {
        const data = await apiRequest("/api/paintings");
        if (!Array.isArray(data)) {
          throw new Error("Unexpected paintings response format.");
        }

        const filtered = artistId
          ? data.filter((p) => {
              const id = typeof p.artist === "object" ? p.artist?._id : p.artist;
              return String(id) === String(artistId);
            })
          : data;

        if (!cancelled) {
          setPaintings(filtered);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load paintings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPaintings();
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  // Close full preview on Escape
  useEffect(() => {
    if (!selectedPainting) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setSelectedPainting(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPainting]);

  async function handleDeletePainting(painting) {
    if (!window.confirm(`Are you sure you want to delete "${painting.title}" from your catalog?`)) {
      return;
    }

    setDeletingId(painting._id);
    try {
      await apiRequest(`/api/paintings/${painting._id}`, {
        method: "DELETE",
        body: JSON.stringify({ artistId }),
      });

      setPaintings((prev) => prev.filter((p) => p._id !== painting._id));
      if (onShowToast) onShowToast(`"${painting.title}" was deleted.`, "info");
      if (onPaintingDeleted) onPaintingDeleted(painting._id);
    } catch (err) {
      alert(err.message || "Failed to delete painting.");
    } finally {
      setDeletingId("");
    }
  }

  const themes = [
    ...new Set(paintings.map((p) => p.theme).filter(Boolean)),
  ];

  const filteredPaintings = paintings.filter((p) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = [
      p.title,
      p.description,
      p.theme,
      p.artist?.name,
    ].some((v) => String(v || "").toLowerCase().includes(search));

    const matchesTheme = !selectedTheme || p.theme === selectedTheme;
    const price = Number(p.price || 0);
    const matchesMinPrice = minPrice === "" || price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || price <= Number(maxPrice);

    return matchesSearch && matchesTheme && matchesMinPrice && matchesMaxPrice;
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ fontSize: "16px", color: "var(--muted)" }}>Loading paintings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <p role="alert">{error}</p>
        <button
          type="button"
          className="artist-button"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (paintings.length === 0) {
    return (
      <section className="dashboard-card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <h3>No paintings found</h3>
        <p style={{ color: "var(--muted)" }}>
          {artistId
            ? "You have not uploaded any artwork yet. Click 'Upload Art' to showcase your paintings!"
            : "No artwork has been published yet. Please check back soon."}
        </p>
      </section>
    );
  }

  return (
    <section>
      {/* SEARCH AND FILTERS */}
      <div className="search-controls" style={{ marginBottom: "20px" }}>
        <input
          type="search"
          placeholder="🔍 Search by title, theme, artist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search artwork"
        />

        <select
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value)}
          aria-label="Filter by theme"
        >
          <option value="">All Themes ({themes.length})</option>
          {themes.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          placeholder="Min price ₹"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          aria-label="Minimum price"
        />

        <input
          type="number"
          min="0"
          placeholder="Max price ₹"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          aria-label="Maximum price"
        />

        {(searchTerm || selectedTheme || minPrice || maxPrice) && (
          <button
            type="button"
            className="artist-button"
            onClick={() => {
              setSearchTerm("");
              setSelectedTheme("");
              setMinPrice("");
              setMaxPrice("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <p style={{ margin: "12px 0 18px", color: "var(--muted)", fontSize: "14px" }}>
        Showing {filteredPaintings.length} of {paintings.length} painting(s)
      </p>

      {/* PAINTING CARDS GRID */}
      {filteredPaintings.length === 0 ? (
        <p style={{ padding: "20px", color: "var(--muted)" }}>
          No paintings match your current search or filters. Try adjusting them.
        </p>
      ) : (
        <div className="dashboard-grid">
          {filteredPaintings.map((painting) => {
            const imageSrc = getImageUrl(painting.imageUrl);
            const isSaved = wishlist.some((item) => item._id === painting._id);

            return (
              <article className="dashboard-card" key={painting._id}>
                <div style={{ position: "relative" }}>
                  <img
                    src={imageSrc}
                    alt={painting.title || "Artwork"}
                    loading="lazy"
                    onClick={() => setSelectedPainting(painting)}
                    title="Click to view full image in high resolution"
                    style={{
                      width: "100%",
                      height: "240px",
                      objectFit: "cover",
                      borderRadius: "14px",
                      cursor: "zoom-in",
                    }}
                  />

                  {/* FRAME SIZE BADGE */}
                  <span
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "10px",
                      background: "rgba(0,0,0,0.65)",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      textTransform: "capitalize",
                    }}
                  >
                    {painting.frameSize || "standard"} frame
                  </span>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <h3 style={{ margin: "0 0 6px", fontSize: "19px" }}>
                      {painting.title}
                    </h3>
                    <strong style={{ fontSize: "18px", color: "var(--purple)" }}>
                      ₹{painting.price}
                    </strong>
                  </div>

                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "13px",
                      color: "var(--muted)",
                    }}
                  >
                    Theme: <strong>{painting.theme}</strong>
                    {painting.artist?.name && (
                      <> · by <strong>{painting.artist.name}</strong></>
                    )}
                  </p>

                  <p
                    style={{
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "#525365",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {painting.description}
                  </p>
                </div>

                {/* CUSTOMER ACTIONS */}
                {!artistId && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="artist-button"
                      onClick={() => onToggleWishlist(painting)}
                      style={{ flex: 1 }}
                      title={isSaved ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      {isSaved ? "❤️ Saved" : "🤍 Wishlist"}
                    </button>

                    <button
                      type="button"
                      className="artist-button"
                      onClick={() => onAddToCart(painting)}
                      style={{ flex: 1 }}
                    >
                      🛒 Add
                    </button>

                    <button
                      type="button"
                      className="submit-button"
                      disabled={orderLoading}
                      onClick={() => onBuyNow(painting)}
                      style={{ flex: 1.2 }}
                    >
                      Buy Now
                    </button>
                  </div>
                )}

                {/* ARTIST ACTIONS: DELETE ARTWORK */}
                {artistId && (
                  <div style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      className="cancel-order-button"
                      disabled={deletingId === painting._id}
                      onClick={() => handleDeletePainting(painting)}
                      style={{ width: "100%" }}
                    >
                      {deletingId === painting._id
                        ? "Deleting Artwork..."
                        : "🗑 Delete Painting"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* FULL-IMAGE PREVIEW MODAL */}
      {selectedPainting && (
        <div
          className="image-preview-overlay"
          onClick={() => setSelectedPainting(null)}
          role="presentation"
        >
          <button
            type="button"
            className="image-preview-close"
            onClick={() => setSelectedPainting(null)}
            aria-label="Close image preview"
          >
            &times;
          </button>

          <div
            className="image-preview-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImageUrl(selectedPainting.imageUrl)}
              alt={selectedPainting.title || "Painting preview"}
            />

            <h3 style={{ marginTop: "16px", fontSize: "24px" }}>
              {selectedPainting.title}
            </h3>
            <p style={{ fontSize: "20px", color: "#ffad78", fontWeight: "800" }}>
              ₹{selectedPainting.price}
            </p>
            <p style={{ maxWidth: "600px", margin: "10px auto", color: "rgba(255,255,255,0.8)" }}>
              {selectedPainting.description}
            </p>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
              Theme: {selectedPainting.theme} · Frame: {selectedPainting.frameSize}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ==================== WISHLIST PAGE ====================
function WishlistPage({
  wishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onNavigateGallery,
}) {
  return (
    <main className="dashboard">
      <div className="page-heading">
        <p className="eyebrow">YOUR SAVED FAVORITES</p>
        <h2>❤️ My Wishlist ({wishlist.length})</h2>
        <p>Curated artworks you love. Move them to your cart or order directly.</p>
      </div>

      {wishlist.length === 0 ? (
        <section className="dashboard-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h3>Your wishlist is empty</h3>
          <p style={{ color: "var(--muted)", margin: "10px 0 20px" }}>
            Explore our curated gallery and save paintings you love.
          </p>
          <button
            type="button"
            className="submit-button"
            onClick={onNavigateGallery}
          >
            Explore Art Gallery
          </button>
        </section>
      ) : (
        <div className="dashboard-grid">
          {wishlist.map((painting) => {
            const imageSrc = getImageUrl(painting.imageUrl);

            return (
              <article className="dashboard-card" key={painting._id}>
                <img
                  src={imageSrc}
                  alt={painting.title}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "230px",
                    objectFit: "cover",
                    borderRadius: "12px",
                  }}
                />

                <h3 style={{ marginTop: "14px" }}>{painting.title}</h3>
                <p>
                  <strong>Price:</strong> ₹{painting.price}
                </p>
                <p>
                  <strong>Theme:</strong> {painting.theme}
                </p>

                <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="artist-button"
                    onClick={() => onToggleWishlist(painting)}
                    style={{ flex: 1 }}
                  >
                    💔 Remove
                  </button>

                  <button
                    type="button"
                    className="artist-button"
                    onClick={() => onAddToCart(painting)}
                    style={{ flex: 1 }}
                  >
                    🛒 Cart
                  </button>

                  <button
                    type="button"
                    className="submit-button"
                    onClick={() => onBuyNow(painting)}
                    style={{ flex: 1 }}
                  >
                    Buy Now
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

// ==================== CART PAGE ====================
function CartPage({ cart, onRemove, onCheckout, onNavigateGallery }) {
  const total = cart.reduce((sum, p) => sum + Number(p.price || 0), 0);

  return (
    <main className="dashboard">
      <div className="page-heading">
        <p className="eyebrow">YOUR SELECTIONS</p>
        <h2>🛒 Shopping Cart ({cart.length})</h2>
        <p>Review your selected paintings and proceed to Cash on Delivery checkout.</p>
      </div>

      {cart.length === 0 ? (
        <section className="dashboard-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h3>Your cart is empty</h3>
          <p style={{ color: "var(--muted)", margin: "10px 0 20px" }}>
            Find unique original paintings to adorn your walls.
          </p>
          <button
            type="button"
            className="submit-button"
            onClick={onNavigateGallery}
          >
            Browse Paintings
          </button>
        </section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "28px" }}>
          <div>
            {cart.map((painting) => {
              const imageSrc = getImageUrl(painting.imageUrl);

              return (
                <div className="cart-row" key={painting._id}>
                  <img src={imageSrc} alt={painting.title} />
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>
                      {painting.title}
                    </h3>
                    <p style={{ margin: "0 0 4px", color: "var(--muted)", fontSize: "13px" }}>
                      Theme: {painting.theme} · Frame: {painting.frameSize}
                    </p>
                    <strong style={{ color: "var(--purple)", fontSize: "16px" }}>
                      ₹{painting.price}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="artist-button"
                    onClick={() => onRemove(painting._id)}
                    style={{ minHeight: "36px", padding: "8px 14px" }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <aside className="cart-summary">
            <h3 style={{ margin: "0 0 16px" }}>Order Summary</h3>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0" }}>
              <span>Items ({cart.length}):</span>
              <strong>₹{total}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0" }}>
              <span>Delivery:</span>
              <span style={{ color: "#227347", fontWeight: "700" }}>FREE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0" }}>
              <span>Payment:</span>
              <span>Cash on Delivery</span>
            </div>

            <hr />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "19px",
                fontWeight: "800",
                margin: "16px 0",
              }}
            >
              <span>Total:</span>
              <span style={{ color: "var(--purple)" }}>₹{total}</span>
            </div>

            <button
              type="button"
              className="submit-button"
              onClick={onCheckout}
              style={{ width: "100%" }}
            >
              Proceed to Delivery Checkout →
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

// ==================== CHECKOUT PAGE ====================
function CheckoutPage({
  checkoutPaintings,
  deliveryName,
  setDeliveryName,
  deliveryPhone,
  setDeliveryPhone,
  deliveryAddress,
  setDeliveryAddress,
  deliveryCity,
  setDeliveryCity,
  deliveryPincode,
  setDeliveryPincode,
  onSubmit,
  onBack,
  orderLoading,
}) {
  const checkoutTotal = checkoutPaintings.reduce(
    (sum, p) => sum + Number(p.price || 0),
    0
  );

  return (
    <main className="dashboard">
      <div className="page-heading">
        <p className="eyebrow">FINAL STEP</p>
        <h2>Delivery & Order Confirmation</h2>
        <p>Enter your shipping address. Payment is collected upon delivery (Cash on Delivery).</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
        {/* SUMMARY */}
        <section className="dashboard-card">
          <h3>Order Items ({checkoutPaintings.length})</h3>

          {checkoutPaintings.map((painting) => (
            <div
              key={painting._id}
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <img
                src={getImageUrl(painting.imageUrl)}
                alt={painting.title}
                style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px" }}
              />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "16px" }}>{painting.title}</h4>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                  Theme: {painting.theme}
                </p>
              </div>
              <strong>₹{painting.price}</strong>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "2px solid var(--line)",
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: "700" }}>Total Amount:</span>
            <span style={{ fontSize: "22px", fontWeight: "800", color: "var(--purple)" }}>
              ₹{checkoutTotal}
            </span>
          </div>

          <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "12px" }}>
            ✓ Pay with cash or UPI on delivery.<br />
            ✓ Eligible for cancellation while order is in "Pending" status.
          </p>
        </section>

        {/* SHIPPING FORM */}
        <section className="dashboard-card">
          <h3>Shipping Address</h3>

          <form onSubmit={onSubmit}>
            <label htmlFor="deliveryName">Full Name *</label>
            <input
              id="deliveryName"
              type="text"
              value={deliveryName}
              onChange={(e) => setDeliveryName(e.target.value)}
              placeholder="Recipient full name"
              autoComplete="name"
              required
            />

            <label htmlFor="deliveryPhone">Mobile Number (10 digits) *</label>
            <input
              id="deliveryPhone"
              type="tel"
              value={deliveryPhone}
              onChange={(e) =>
                setDeliveryPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="e.g. 9876543210"
              autoComplete="tel"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number"
              required
            />

            <label htmlFor="deliveryAddress">Complete Street Address *</label>
            <textarea
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Flat/House no., building name, street, area"
              autoComplete="street-address"
              rows={3}
              required
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label htmlFor="deliveryCity">City *</label>
                <input
                  id="deliveryCity"
                  type="text"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder="e.g. Hyderabad"
                  autoComplete="address-level2"
                  required
                />
              </div>

              <div>
                <label htmlFor="deliveryPincode">PIN Code *</label>
                <input
                  id="deliveryPincode"
                  type="text"
                  value={deliveryPincode}
                  onChange={(e) =>
                    setDeliveryPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="e.g. 500001"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  title="Enter a valid 6-digit PIN code"
                  required
                />
              </div>
            </div>

            <label htmlFor="paymentMethod">Payment Method</label>
            <input
              id="paymentMethod"
              type="text"
              value="Cash on Delivery"
              readOnly
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                className="artist-button"
                onClick={onBack}
                disabled={orderLoading}
                style={{ flex: 1 }}
              >
                Go Back
              </button>

              <button
                type="submit"
                className="submit-button"
                disabled={orderLoading}
                style={{ flex: 1.5 }}
              >
                {orderLoading ? "Confirming Order..." : "Confirm & Place Order"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

// ==================== CUSTOMER ORDERS & CANCELLATION ====================
function CustomerOrders({
  user,
  onBack,
  onNavigateGallery,
  onShowToast,
  onOrderCancelled,
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const data = await apiRequest(`/api/orders/customer/${user.id}`);
        if (!cancelled) {
          // Display only non-cancelled orders
          const activeOrders = Array.isArray(data)
            ? data.filter((item) => item.status !== "Cancelled")
            : [];
          setOrders(activeOrders);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load orders.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  // CRITICAL FEATURE: COMPLETE VERIFIED ORDER CANCELLATION
  async function handleCancelOrder(order) {
    if (order.status !== "Pending") {
      alert(`This order is currently "${order.status}". Only orders in "Pending" status can be cancelled.`);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel your order for "${order.painting?.title || "this painting"}"?\n\nThis will update the order status in the database.`
    );
    if (!confirmed) return;

    setCancellingOrderId(order._id);

    try {
      await apiRequest(`/api/orders/${order._id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ customerId: user.id }),
      });

      // Immediately remove the cancelled order from the visible list without requiring a page refresh
      setOrders((prev) => prev.filter((item) => item._id !== order._id));

      if (onShowToast) {
        onShowToast(`Order for "${order.painting?.title || "artwork"}" was cancelled successfully.`, "info");
      }
      if (onOrderCancelled) {
        onOrderCancelled(order._id);
      }
    } catch (err) {
      console.error("Order cancellation failed:", err);
      alert(err.message || "Could not cancel order. Please verify connection and try again.");
    } finally {
      setCancellingOrderId("");
    }
  }

  return (
    <main className="dashboard">
      <div className="page-heading">
        <p className="eyebrow">PURCHASE HISTORY</p>
        <h2>My Orders ({orders.length})</h2>
        <p>Track your orders, view delivery information, or cancel pending purchases.</p>
      </div>

      <button
        type="button"
        className="artist-button"
        onClick={onBack}
        style={{ marginBottom: "20px" }}
      >
        ← Back to Dashboard
      </button>

      {loading && <p>Loading your orders...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <section className="dashboard-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h3>No active orders</h3>
          <p style={{ color: "var(--muted)", margin: "10px 0 20px" }}>
            You do not have any active or pending orders. Explore original artworks and transform your space today.
          </p>
          <button
            type="button"
            className="submit-button"
            onClick={onNavigateGallery}
          >
            Explore Art Gallery
          </button>
        </section>
      )}

      <div className="dashboard-grid">
        {orders.map((order) => {
          const isPending = order.status === "Pending";

          return (
            <article className="dashboard-card" key={order._id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", letterSpacing: "1px", color: "var(--muted)" }}>
                    ORDER #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                  </span>
                  <h3 style={{ margin: "4px 0 6px", fontSize: "19px" }}>
                    {order.painting?.title || "Artwork"}
                  </h3>
                </div>

                <span
                  className={`status-pill status-${String(order.status || "pending").toLowerCase()}`}
                >
                  {order.status}
                </span>
              </div>

              {order.painting?.imageUrl && (
                <img
                  src={getImageUrl(order.painting.imageUrl)}
                  alt={order.painting?.title}
                  style={{
                    width: "100%",
                    height: "170px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    margin: "10px 0",
                  }}
                />
              )}

              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Price:</strong> ₹{order.totalPrice} ({order.paymentMethod || "Cash on Delivery"})
              </p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Artist:</strong> {order.artist?.name || "Independent Artist"}
              </p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Deliver To:</strong> {order.customerName}, {order.address}, {order.city} - {order.pincode}
              </p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Ordered On:</strong>{" "}
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Recent"}
              </p>

              {/* CANCELLATION ACTION BAR */}
              <div className="order-card-actions">
                {isPending ? (
                  <button
                    type="button"
                    className="cancel-order-button"
                    onClick={() => handleCancelOrder(order)}
                    disabled={cancellingOrderId === order._id}
                    style={{ width: "100%" }}
                  >
                    {cancellingOrderId === order._id
                      ? "Cancelling Order..."
                      : "✕ Cancel Order"}
                  </button>
                ) : (
                  <span style={{ color: "#315bb3", fontSize: "13px", fontWeight: "600" }}>
                    ✓ Order {order.status} (In fulfillment)
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

// ==================== ARTIST ORDERS MANAGEMENT ====================
function ArtistOrders({ user, onBack, onShowToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const data = await apiRequest(`/api/orders/artist/${user.id}`);
        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load artist orders.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function updateOrderStatus(orderId, newStatus) {
    setUpdatingId(orderId);
    try {
      const response = await apiRequest(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, artistId: user.id }),
      });

      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );

      if (onShowToast) {
        onShowToast(response.message || `Order status updated to ${newStatus}.`);
      }
    } catch (err) {
      alert(err.message || "Could not update status.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="dashboard">
      <div className="page-heading">
        <p className="eyebrow">STUDIO MANAGEMENT</p>
        <h2>📦 Received Orders ({orders.length})</h2>
        <p>Manage artwork fulfillment. Customer cancellations are automatically reflected here.</p>
      </div>

      <button
        type="button"
        className="artist-button"
        onClick={onBack}
        style={{ marginBottom: "20px" }}
      >
        ← Back to Studio Dashboard
      </button>

      {loading && <p>Loading orders received...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <section className="dashboard-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h3>No orders received yet</h3>
          <p style={{ color: "var(--muted)" }}>
            When collectors purchase your paintings, their orders will appear here.
          </p>
        </section>
      )}

      <div className="dashboard-grid">
        {orders.map((order) => {
          const isCancelled = order.status === "Cancelled";

          return (
            <article className="dashboard-card" key={order._id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "11px", letterSpacing: "1px", color: "var(--muted)" }}>
                    ORDER #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                  </span>
                  <h3 style={{ margin: "4px 0 6px", fontSize: "19px" }}>
                    {order.painting?.title || "Artwork"}
                  </h3>
                </div>

                <span
                  className={`status-pill status-${String(order.status || "pending").toLowerCase()}`}
                >
                  {order.status}
                </span>
              </div>

              {order.painting?.imageUrl && (
                <img
                  src={getImageUrl(order.painting.imageUrl)}
                  alt={order.painting?.title}
                  style={{
                    width: "100%",
                    height: "160px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    margin: "10px 0",
                  }}
                />
              )}

              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Customer:</strong> {order.customerName} ({order.customer?.email || "N/A"})
              </p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Phone:</strong> {order.phone}
              </p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Address:</strong> {order.address}, {order.city} - {order.pincode}
              </p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Price:</strong> ₹{order.totalPrice} ({order.paymentMethod})
              </p>

              {/* STATUS UPDATE CONTROLS */}
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
                {isCancelled ? (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#fff0f1",
                      borderRadius: "8px",
                      color: "var(--danger)",
                      fontSize: "13px",
                      fontWeight: "700",
                    }}
                  >
                    ⚠️ Customer cancelled this order. Status cannot be changed.
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor={`status-select-${order._id}`}
                      style={{ fontSize: "12px", color: "var(--muted)" }}
                    >
                      Update Fulfillment Status:
                    </label>
                    <select
                      id={`status-select-${order._id}`}
                      value={order.status}
                      disabled={updatingId === order._id}
                      onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                      style={{ marginTop: "6px" }}
                    >
                      <option value="Pending">Pending (Awaiting Confirmation)</option>
                      <option value="Accepted">Accepted (Preparing Artwork)</option>
                      <option value="Shipped">Shipped (In Transit)</option>
                      <option value="Delivered">Delivered (Completed)</option>
                    </select>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

// ==================== ARTIST MY PAINTINGS ====================
function MyPaintings({ user, onBack, onNavigateUpload, onShowToast }) {
  return (
    <main className="dashboard">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div className="page-heading" style={{ margin: 0 }}>
          <p className="eyebrow">PORTFOLIO CATALOG</p>
          <h2>My Uploaded Paintings</h2>
          <p>Manage your marketplace listings or add new artwork.</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="artist-button" onClick={onBack}>
            ← Studio Dashboard
          </button>
          <button type="button" className="submit-button" onClick={onNavigateUpload}>
            + Upload New Art
          </button>
        </div>
      </div>

      <PaintingGallery
        artistId={user.id}
        onShowToast={onShowToast}
      />
    </main>
  );
}

export default App;
