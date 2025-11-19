const express = require('express');
const mongoose = require('mongoose');
const FileMeta = require('../models/filemeta');
const Job = require('../models/job');
const { enqueue } = require('../services/jobqueue');

const router = express.Router();

router.post('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid file id' });
    }

    const file = await FileMeta.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const priority = Number.isFinite(req.body?.priority) ? req.body.priority : 0;
    const result = await enqueue(file._id, { priority });

    return res.status(result.wasExisting ? 200 : 202).json({
      jobId: result.job._id,
      status: result.job.status,
      queuedAt: result.job.createdAt,
    });
  } catch (err) {
    console.error('[processRoutes] enqueue error', err);
    return res.status(500).json({ message: 'Unable to enqueue job' });
  }
});

router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job id' });
    }
    const job = await Job.findById(jobId).populate('file');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.json(job);
  } catch (err) {
    console.error('[processRoutes] fetch job error', err);
    return res.status(500).json({ message: 'Unable to fetch job' });
  }
});

router.get('/file/:fileId/jobs', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid file id' });
    }
    const jobs = await Job.find({ file: fileId }).sort({ createdAt: -1 }).limit(20);
    return res.json({ jobs });
  } catch (err) {
    console.error('[processRoutes] list jobs error', err);
    return res.status(500).json({ message: 'Unable to list jobs' });
  }
});

module.exports = router;

