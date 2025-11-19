const mongoose = require('mongoose');

const dataRecordSchema = new mongoose.Schema(
  {
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMeta', index: true },
    rawLine: { type: String, required: true },
    parsed: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

dataRecordSchema.index({ file: 1, createdAt: 1 });

module.exports = mongoose.model('DataRecord', dataRecordSchema);
 