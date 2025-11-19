const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  file: {type: mongoose.Schema.Types.ObjectId, ref:"FileMeta", required:true},
  status: {type:String, enum:["queued","processing","completed","failed"], default:"queued"},
  error: String,
  processedLines: {type:Number, default:0},
  totalLines: {type:Number, default:0}
},{timestamps:true});
module.exports = mongoose.model("Job", schema);
