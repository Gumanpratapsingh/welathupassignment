const { PassThrough } = require('stream');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const bucket = process.env.S3_BUCKET;

async function getObjectStream(key) {
  if (!key) {
    throw new Error('Missing S3 key');
  }
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = response.Body;
  if (!body) {
    throw new Error('Empty S3 object');
  }
  if (typeof body.pipe === 'function') {
    return body;
  }
  const pass = new PassThrough();
  pass.end(Buffer.from(body));
  return pass;
}

module.exports = { getObjectStream };
 