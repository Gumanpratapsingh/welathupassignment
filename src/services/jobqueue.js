const Job = require("../models/job");
const processFileJob = require("./fileProcessor");
const MAX_WORKERS = parseInt(process.env.MAX_WORKERS||"2",10);
let started = false;

async function recoverJobsOnStartup(){
  await Job.updateMany({ status: "processing" }, { status: "queued" });
  console.log("[jobQueue] requeued stuck jobs");
}

async function workerLoop(id){
  console.log(`[worker ${id}] started`);
  while(true){
    try{
      const job = await Job.findOneAndUpdate({ status:"queued" }, { status:"processing" }, { sort:{ createdAt:1 }, new:true }).populate("file");
      if(!job){ await new Promise(r=>setTimeout(r,1000)); continue; }
      try{
        await processFileJob(job);
        job.status = "completed";
        await job.save();
      }catch(e){
        console.error("job failed", e);
        job.status = "failed";
        job.error = e.message;
        await job.save();
      }
    }catch(e){
      console.error("worker loop error", e);
      await new Promise(r=>setTimeout(r,2000));
    }
  }
}

function initWorkers(){ if(started) return; started=true; for(let i=1;i<=MAX_WORKERS;i++) workerLoop(i); }
async function enqueue(fileId){ return await Job.create({ file: fileId, status: "queued" }); }

module.exports = { initWorkers, recoverJobsOnStartup, enqueue };
