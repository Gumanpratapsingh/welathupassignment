const readline = require('readline');
const { parse: parseCsv } = require('csv-parse/sync');
const DataRecord = require('../models/DataRecord');
const { getObjectStream } = require('./s3service');

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

function normalizeExtension(ext) {
  return (ext || '').toLowerCase().replace(/^\./, '');
}

function parseLine(rawLine, extension) {
  if (!rawLine) return null;
  const ext = normalizeExtension(extension);
  if (ext === 'json') {
    return JSON.parse(rawLine);
  }
  if (ext === 'csv') {
    const [record] = parseCsv(rawLine, {
      relaxColumnCount: true,
      relaxQuotes: true,
      skipEmptyLines: true,
    });
    return { columns: record };
  }
  return { text: rawLine };
}

async function processFileJob(job) {
  if (!job?.file) {
    throw new Error('Job missing file metadata');
  }

  const { s3Key, _id: fileId, extension } = job.file;
  const stream = await getObjectStream(s3Key);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let batch = [];
  let processed = job.processedLines || 0;
  let total = job.totalLines || 0;

  const flush = async () => {
    if (!batch.length) return;
    await DataRecord.bulkWrite(batch, { ordered: false });
    batch = [];
    job.processedLines = processed;
    await job.save();
  };

  for await (const line of rl) {
    total += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = parseLine(trimmed, extension);
      batch.push({ insertOne: { document: { file: fileId, rawLine: trimmed, parsed } } });
      processed += 1;
      if (batch.length >= BATCH_SIZE) {
        await flush();
      }
    } catch (err) {
      console.error(`[fileProcessor] skipping line ${total}: ${err.message}`);
    }
  }

  if (batch.length) {
    await flush();
  }

  job.totalLines = total;
  await job.save();
}

module.exports = processFileJob;

