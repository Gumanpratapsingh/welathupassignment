const AWS = require("aws-sdk");
const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;

function uploadStreamToS3(key){
  const { PassThrough } = require("stream");
  const pass = new PassThrough();
  const promise = s3.upload({ Bucket: BUCKET, Key: key, Body: pass }).promise();
  return { writeStream: pass, uploadPromise: promise };
}
function getObjectStream(key){
  return s3.getObject({ Bucket: BUCKET, Key: key }).createReadStream();
}
module.exports = { uploadStreamToS3, getObjectStream };
