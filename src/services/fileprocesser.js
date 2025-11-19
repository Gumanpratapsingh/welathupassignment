const readline = require("readline");
const { getObjectStream } = require("./s3service");
const DataRecord = require("../models/datarecord");
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE||"500",10);

async function processFileJob(job){
  const { s3Key, extension, _id: fileId } = job.file;
  const stream = getObjectStream(s3Key);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let batch = [], lineNumber = 0;
  for await (const line of rl){
    lineNumber++;
    const trimmed = line.trim();
    if(!trimmed) continue;
    try {
      let parsed = null;
      if(extension === ".json"){
        parsed = JSON.parse(trimmed);
      } else if(extension === ".csv"){
        const cols = trimmed.split(",");
        parsed = { columns: cols };
      }
      batch.push({ insertOne: { document: { file: fileId, rawLine: trimmed, parsed } } });
      if(batch.length >= BATCH_SIZE){
        await DataRecord.bulkWrite(batch);
        batch = [];
        job.processedLines = lineNumber;
        await job.save();
      }
    } catch(err){
      console.error(`line ${lineNumber} error:`, err.message);
      continue;
    }
  }
  if(batch.length) { await DataRecord.bulkWrite(batch); job.processedLines = lineNumber; await job.save(); }
  job.totalLines = lineNumber;
}
module.exports = processFileJob;
