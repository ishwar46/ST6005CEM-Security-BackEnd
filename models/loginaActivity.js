const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], required: true },
  success: { type: Boolean, required: true },
  message: { type: String },
  remainingAttempts: { type: Number },
  endpoint: { type: String }, // Endpoint accessed during the request
  requestDetails: { type: String }, // JSON stringified request details
  timestamp: { type: Date, default: Date.now },
});

const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);

module.exports = LoginActivity;
