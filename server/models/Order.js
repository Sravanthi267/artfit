
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      default: () =>
        `ART-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    painting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Painting",
      required: true,
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery"],
      default: "Cash on Delivery",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
