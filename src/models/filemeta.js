const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema(
  {
    s3Key: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number, default: null },
    extension: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FileMeta', fileMetaSchema);