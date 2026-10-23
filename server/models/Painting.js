
const mongoose = require('mongoose');

const paintingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 1
    },

    theme: {
      type: String,
      required: true,
      trim: true
    },

    frameSize: {
      type: String,
      enum: ['small', 'normal', 'large', 'tall'],
      default: 'normal'
    },

    imageUrl: {
      type: String,
      required: true
    },

    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Painting', paintingSchema);
