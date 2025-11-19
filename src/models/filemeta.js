const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  s3Key: {type:String, required:true},
  originalName: String,
  size: Number,
  mimeType: String,
  extension: String
},{timestamps:true});
module.exports = mongoose.model("FileMeta", schema);
