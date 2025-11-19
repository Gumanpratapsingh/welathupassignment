require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const uploadRoutes = require("./routes/uploadRoutes");
const processRoutes = require("./routes/processRoutes");
const { initWorkers, recoverJobsOnStartup } = require("./services/jobqueue");

const app = express();
app.use(express.json());
app.get("/health", (_,res)=>res.json({status:"ok"}));
app.use("/upload", uploadRoutes);
app.use("/process", processRoutes);

const PORT = process.env.PORT || 3000;
async function start(){
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser:true, useUnifiedTopology:true });
  console.log("Mongo connected");
  await recoverJobsOnStartup();
  initWorkers();
  app.listen(PORT, ()=>console.log(`Listening ${PORT}`));
}
start().catch(e=>{ console.error(e); process.exit(1); });
