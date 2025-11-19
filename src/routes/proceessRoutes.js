const express = require("express");
const FileMeta = require("../models/filemeta");
const Job = require("../models/job");
const { enqueue } = require("../services/jobqueue");
const router = express.Router();

router.post("/:fileId", async (req,res)=>{
  try{
    const file = await FileMeta.findById(req.params.fileId);
    if(!file) return res.status(404).json({message:"file not found"});
    const job = await enqueue(file._id);
    return res.status(202).json({ jobId: job._id, status: job.status });
  }catch(err){
    console.error(err);
    res.status(500).json({message:"could not enqueue"});
  }
});

router.get("/job/:jobId", async (req,res)=>{
  try{
    const job = await Job.findById(req.params.jobId);
    if(!job) return res.status(404).json({message:"job not found"});
    res.json(job);
  }catch(err){ res.status(500).json({message:"error"}); }
});

module.exports = router;
