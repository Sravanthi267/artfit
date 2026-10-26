require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("./models/User");
const Painting = require("./models/Painting");
const Order = require("./models/Order");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/artfit";
const JWT_SECRET = process.env.JWT_SECRET || "artfit_super_secret_jwt_key_2026_secured";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// ==================== MIDDLEWARE ====================
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman) or matching client
      if (!origin || origin === CLIENT_ORIGIN || origin.startsWith("http://localhost")) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local development while supporting credentials
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Connect to MongoDB before handling API requests
let dbConnectionPromise;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  if (!dbConnectionPromise) {
    dbConnectionPromise = mongoose.connect(MONGO_URI).catch((error) => {
      dbConnectionPromise = null;
      throw error;
    });
  }

  await dbConnectionPromise;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

// Request logging
app.use((req, res, next) => {
  console.log(`[ARTFIT API] ${req.method} ${req.originalUrl}`);
  next();
});

// ==================== AUTH HELPERS ====================
function generateToken(user) {
  return jwt.sign(
    {
      id: String(user._id || user.id),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyTokenOptional(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      // Optional token invalid, continue unauthenticated
    }
  }
  next();
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (!token) {
    return res.status(401).json({
      message: "Authentication token missing. Please log in.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      message: "Session expired or invalid. Please log in again.",
    });
  }
}

// ==================== IMAGE UPLOAD SETUP ====================
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Please upload an image file (PNG, JPG, JPEG, WEBP)."));
    }
    cb(null, true);
  },
});

// ==================== HEALTH & DIAGNOSTICS ====================
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "ARTFIT backend API is running",
    version: "2.0.0",
    time: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: "ok",
    database: dbStatusMap[dbState] || "unknown",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/test-cancel-route", (req, res) => {
  res.json({ message: "Cancel route test successful" });
});

// ==================== AUTH: VERIFY SESSION ====================
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return res.status(500).json({ message: "Unable to verify session." });
  }
});

// ==================== AUTH: SIGN UP ====================
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      password.length < 6
    ) {
      return res.status(400).json({
        message: "Enter your full name, valid email, and password of at least 6 characters.",
      });
    }

    if (!["customer", "artist"].includes(role)) {
      return res.status(400).json({ message: "Invalid account role. Must be customer or artist." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered. Please log in.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Unable to create account." });
  }
});

// ==================== AUTH: LOGIN ====================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email?.trim() || !password || !role) {
      return res.status(400).json({
        message: "Please enter email, password, and account role.",
      });
    }

    if (!["customer", "artist"].includes(role)) {
      return res.status(400).json({ message: "Invalid account role." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    let passwordMatches = false;
    // Support bcrypt hashes as well as legacy plaintext for test records
    if (user.password && user.password.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else {
      passwordMatches = password === user.password;
    }

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please select the ${user.role} login option.`,
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Unable to log in." });
  }
});

// ==================== GET ALL PAINTINGS ====================
app.get("/api/paintings", async (req, res) => {
  try {
    const paintings = await Painting.find()
      .populate("artist", "name email")
      .sort({ createdAt: -1 });

    return res.json(paintings);
  } catch (error) {
    console.error("Get paintings error:", error);
    return res.status(500).json({ message: "Unable to load paintings." });
  }
});

// ==================== GET SINGLE PAINTING ====================
app.get("/api/paintings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid painting ID." });
    }

    const painting = await Painting.findById(id).populate("artist", "name email");
    if (!painting) {
      return res.status(404).json({ message: "Painting not found." });
    }

    return res.json(painting);
  } catch (error) {
    console.error("Get painting error:", error);
    return res.status(500).json({ message: "Unable to load painting." });
  }
});

// ==================== ARTIST: UPLOAD PAINTING ====================
app.post("/api/paintings", verifyTokenOptional, upload.single("image"), async (req, res) => {
  try {
    const { title, description, price, theme, frameSize } = req.body;
    const artistId = req.user?.id || req.body.artistId;

    if (
      !title?.trim() ||
      !description?.trim() ||
      price === undefined ||
      price === "" ||
      !theme?.trim() ||
      !frameSize ||
      !artistId ||
      !req.file
    ) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: "Please complete all painting details and select an image file.",
      });
    }

    if (
      !mongoose.isValidObjectId(artistId) ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: "Invalid artist ID or painting price.",
      });
    }

    const artist = await User.findById(artistId);
    if (!artist || artist.role !== "artist") {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        message: "A valid artist account is required to upload artwork.",
      });
    }

    const painting = await Painting.create({
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      theme: theme.trim(),
      frameSize,
      imageUrl: `/uploads/${req.file.filename}`,
      artist: artist._id,
    });

    const populatedPainting = await Painting.findById(painting._id).populate("artist", "name email");

    return res.status(201).json({
      message: "Painting uploaded successfully!",
      painting: populatedPainting,
    });
  } catch (error) {
    console.error("Upload painting error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error("Failed to clean up uploaded file:", unlinkErr);
      }
    }

    return res.status(500).json({
      message: "Unable to upload painting.",
      error: error.message,
    });
  }
});

// ==================== ARTIST: DELETE PAINTING ====================
app.delete("/api/paintings/:id", verifyTokenOptional, async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id || req.body?.artistId || req.query?.artistId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid painting ID." });
    }

    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Painting not found." });
    }

    if (requesterId && String(painting.artist) !== String(requesterId)) {
      return res.status(403).json({
        message: "You can only delete paintings uploaded by your own account.",
      });
    }

    // Check if there are active (non-delivered, non-cancelled) orders for this painting
    const activeOrders = await Order.countDocuments({
      painting: id,
      status: { $in: ["Pending", "Accepted", "Shipped"] },
    });

    if (activeOrders > 0) {
      return res.status(409).json({
        message: `Cannot delete painting. There are ${activeOrders} active order(s) for this artwork.`,
      });
    }

    // Delete image file from disk
    if (painting.imageUrl && painting.imageUrl.startsWith("/uploads/")) {
      const filePath = path.join(__dirname, painting.imageUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error("Could not remove painting image file:", unlinkErr);
        }
      }
    }

    await Painting.findByIdAndDelete(id);

    return res.json({
      message: "Painting deleted successfully.",
      deletedId: id,
    });
  } catch (error) {
    console.error("Delete painting error:", error);
    return res.status(500).json({ message: "Unable to delete painting." });
  }
});

// ==================== CUSTOMER: PLACE ORDER ====================
app.post("/api/orders", verifyTokenOptional, async (req, res) => {
  try {
    const {
      paintingId,
      customerName,
      phone,
      address,
      city,
      pincode,
      paymentMethod,
    } = req.body;

    const customerId = req.user?.id || req.body.customerId;

    if (
      !customerId ||
      !paintingId ||
      !customerName?.trim() ||
      !phone?.trim() ||
      !address?.trim() ||
      !city?.trim() ||
      !pincode?.trim()
    ) {
      return res.status(400).json({
        message: "Please fill in all delivery details.",
      });
    }

    if (
      !mongoose.isValidObjectId(customerId) ||
      !mongoose.isValidObjectId(paintingId)
    ) {
      return res.status(400).json({
        message: "Invalid customer ID or painting ID.",
      });
    }

    const cleanPhone = String(phone).trim();
    const cleanPincode = String(pincode).trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        message: "Enter a valid 10-digit Indian mobile number (starts with 6-9).",
      });
    }

    if (!/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({
        message: "Enter a valid 6-digit PIN code.",
      });
    }

    if (paymentMethod && paymentMethod !== "Cash on Delivery") {
      return res.status(400).json({
        message: "Currently only Cash on Delivery is supported.",
      });
    }

    const customer = await User.findById(customerId);
    if (!customer || customer.role !== "customer") {
      return res.status(403).json({
        message: "A valid customer account is required to place orders.",
      });
    }

    const painting = await Painting.findById(paintingId);
    if (!painting) {
      return res.status(404).json({ message: "Painting not found." });
    }

    if (!painting.artist) {
      return res.status(400).json({
        message: "This painting has no associated artist.",
      });
    }

    if (String(painting.artist) === String(customerId)) {
      return res.status(400).json({
        message: "You cannot purchase your own painting.",
      });
    }

    const order = await Order.create({
      customer: customer._id,
      artist: painting.artist,
      painting: painting._id,
      totalPrice: painting.price,
      customerName: customerName.trim(),
      phone: cleanPhone,
      address: address.trim(),
      city: city.trim(),
      pincode: cleanPincode,
      paymentMethod: "Cash on Delivery",
      status: "Pending",
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("painting")
      .populate("artist", "name email");

    return res.status(201).json({
      message: "Order placed successfully!",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Place order error:", error);
    return res.status(500).json({
      message: "Failed to place order.",
      error: error.message,
    });
  }
});

// ==================== CUSTOMER: VIEW ORDERS ====================
app.get("/api/orders/customer/:customerId", verifyTokenOptional, async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID." });
    }

    // If caller has a verified token, verify ownership
    if (req.user && req.user.role === "customer" && req.user.id !== customerId) {
      return res.status(403).json({ message: "You can only view your own orders." });
    }

    const orders = await Order.find({ customer: customerId })
      .populate("painting")
      .populate("artist", "name email")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    console.error("Customer orders error:", error);
    return res.status(500).json({ message: "Unable to load customer orders." });
  }
});

// ==================== CUSTOMER: CANCEL PENDING ORDER ====================
async function handleCancelOrder(req, res) {
  try {
    const { orderId } = req.params;
    const customerId = req.user?.id || req.body?.customerId;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format." });
    }

    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({ message: "Valid customer ID is required." });
    }

    // Atomic update: only cancels if this order belongs to the customer AND status is Pending
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        customer: customerId,
        status: "Pending",
      },
      {
        $set: { status: "Cancelled" },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("painting")
      .populate("artist", "name email");

    if (order) {
      console.log(`[ARTFIT] Order ${orderId} cancelled by customer ${customerId}`);
      return res.json({
        message: "Order cancelled successfully.",
        order,
      });
    }

    // If atomic findOneAndUpdate didn't match, give a precise and helpful error response
    const existingOrder = await Order.findById(orderId);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (String(existingOrder.customer) !== String(customerId)) {
      return res.status(403).json({
        message: "Unauthorized. You can only cancel your own orders.",
      });
    }

    return res.status(409).json({
      message: `This order is already marked as "${existingOrder.status}". Only pending orders can be cancelled.`,
      currentStatus: existingOrder.status,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({ message: "Unable to cancel order right now." });
  }
}

app.patch("/api/orders/:orderId/cancel", verifyTokenOptional, handleCancelOrder);
app.post("/api/orders/:orderId/cancel", verifyTokenOptional, handleCancelOrder);

// ==================== ARTIST: VIEW RECEIVED ORDERS ====================
app.get("/api/orders/artist/:artistId", verifyTokenOptional, async (req, res) => {
  try {
    const { artistId } = req.params;

    if (!mongoose.isValidObjectId(artistId)) {
      return res.status(400).json({ message: "Invalid artist ID." });
    }

    if (req.user && req.user.role === "artist" && req.user.id !== artistId) {
      return res.status(403).json({ message: "You can only view your own incoming orders." });
    }

    const orders = await Order.find({ artist: artistId })
      .populate("painting")
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    console.error("Artist orders error:", error);
    return res.status(500).json({ message: "Unable to load artist orders." });
  }
});

// ==================== ARTIST: UPDATE ORDER STATUS ====================
app.patch("/api/orders/:orderId/status", verifyTokenOptional, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const artistId = req.user?.id || req.body?.artistId;

    const allowedStatuses = ["Pending", "Accepted", "Shipped", "Delivered"];

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid order status. Permitted statuses: ${allowedStatuses.join(", ")}.`,
      });
    }

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Ownership check if artistId is supplied or from token
    if (artistId && String(existingOrder.artist) !== String(artistId)) {
      return res.status(403).json({
        message: "Unauthorized. You can only update orders for your own artwork.",
      });
    }

    // Critical check: prevent artists from modifying cancelled orders!
    if (existingOrder.status === "Cancelled") {
      return res.status(409).json({
        message: "Cannot update status. This order was cancelled by the customer.",
      });
    }

    existingOrder.status = status;
    await existingOrder.save();

    const updatedOrder = await Order.findById(orderId)
      .populate("painting")
      .populate("customer", "name email");

    return res.json({
      message: `Order status successfully updated to "${status}".`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order error:", error);
    return res.status(500).json({ message: "Unable to update order status." });
  }
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Image file must be 5 MB or smaller."
          : error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      message: error.message || "Request failed.",
    });
  }

  next();
});

// ==================== START SERVER ====================
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully to:", MONGO_URI);

    app.listen(PORT, () => {
      console.log(`ARTFIT server running on http://localhost:${PORT}`);
      console.log("Endpoints active:");
      console.log(" - Auth: POST /api/signup, POST /api/login, GET /api/auth/me");
      console.log(" - Paintings: GET /api/paintings, POST /api/paintings, DELETE /api/paintings/:id");
      console.log(" - Orders: POST /api/orders, GET /api/orders/customer/:id, PATCH /api/orders/:id/cancel");
      console.log(" - Artist Orders: GET /api/orders/artist/:id, PATCH /api/orders/:id/status");
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    console.error("Ensure your local MongoDB service is running on port 27017 or update MONGO_URI in .env");
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;