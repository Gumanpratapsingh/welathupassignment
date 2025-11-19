const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  file: {type: mongoose.Schema.Types.ObjectId, ref:"FileMeta"},
  rawLine: String,
  parsed: mongoose.Schema.Types.Mixed
},{timestamps:true});
module.exports = mongoose.model("DataRecord", schema);
