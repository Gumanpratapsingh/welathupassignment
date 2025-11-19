const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMeta', required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    error: { type: String, default: null },
    processedLines: { type: Number, default: 0 },
    totalLines: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    priority: { type: Number, default: 0 },
    workerId: { type: Number },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, priority: -1, createdAt: 1 });

module.exports = mongoose.model('Job', jobSchema);
 