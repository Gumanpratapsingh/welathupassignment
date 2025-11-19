const Job = require('../models/Job');
const processFileJob = require('./fileProcessor');

const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || '2', 10);
const POLL_INTERVAL_MS = 750;
let started = false;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function recoverJobsOnStartup() {
  const result = await Job.updateMany(
    { status: 'processing' },
    { status: 'queued', workerId: null, startedAt: null }
  );
  console.log(`[jobQueue] requeued ${result.modifiedCount || 0} stuck jobs`);
}

async function enqueue(fileId, options = {}) {
  const existing = await Job.findOne({
    file: fileId,
    status: { $in: ['queued', 'processing'] },
  });
  if (existing) {
    return { job: existing, wasExisting: true };
  }
  const job = await Job.create({
    file: fileId,
    priority: Number(options.priority) || 0,
  });
  return { job, wasExisting: false };
}

async function workerLoop(id) {
  console.log(`[worker ${id}] online`);
  while (true) {
    try {
      const job = await Job.findOneAndUpdate(
        { status: 'queued' },
        {
          $set: {
            status: 'processing',
            workerId: id,
            startedAt: new Date(),
            error: null,
          },
          $inc: { attempts: 1 },
        },
        { sort: { priority: -1, createdAt: 1 }, new: true }
      ).populate('file');

      if (!job) {
        await wait(POLL_INTERVAL_MS);
        continue;
      }

      try {
        await processFileJob(job);
        job.status = 'completed';
        job.finishedAt = new Date();
        await job.save();
      } catch (err) {
        console.error(`[worker ${id}] job ${job._id} failed`, err);
        job.status = 'failed';
        job.error = err.message;
        job.finishedAt = new Date();
        await job.save();
      }
    } catch (loopErr) {
      console.error(`[worker ${id}] loop error`, loopErr);
      await wait(POLL_INTERVAL_MS * 2);
    }
  }
}

function initWorkers() {
  if (started) return;
  started = true;
  for (let i = 1; i <= MAX_WORKERS; i += 1) {
    workerLoop(i);
  }
}

module.exports = { initWorkers, recoverJobsOnStartup, enqueue };
