// ./AppOwner.js
// 14-Dec-2025
// Purpose: Regsiter a new client for testing

const mongoose = require('mongoose');

const AppOwnerSchema = new mongoose.Schema({
  app_key: { type: String, required: true, unique: true },
  invoice_no: String,
  invoice_date: String,
  client_id: Number,
  client_name: String,
  client_app_name: String,
  client_regd_email: String, // encrypted
  client_regd_mobile_no: String // encrypted
}, { timestamps: true });

module.exports = mongoose.model('AppOwner', AppOwnerSchema);

