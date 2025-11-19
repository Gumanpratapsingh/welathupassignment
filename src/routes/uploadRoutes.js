// src/routes/uploadRoutes.js
const express = require('express');
const Busboy = require('busboy');
const { PassThrough } = require('stream');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const FileMeta = require('../models/FileMeta'); // your mongoose model
const router = express.Router();

const s3Client = new S3Client({ region: process.env.AWS_REGION });

router.post('/', (req, res) => {
  const busboy = new Busboy({ headers: req.headers, limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10n * 1024n * 1024n * 1024n) } }); // default 10GB
  const uploads = [];

  let savedMeta = null;

  busboy.on('file', (fieldname, fileStream, filename, encoding, mimetype) => {
    // create an S3 key; can include timestamps/user id
    const key = `uploads/${Date.now()}-${filename.replace(/\s+/g, '_')}`;

    // PassThrough will be consumed by Upload (multipart)
    const pass = new PassThrough();

    // start Upload (managed multipart) from the PassThrough
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: pass,
        ContentType: mimetype
      },
      queueSize: 4,       // concurrency of parts
      partSize: 5 * 1024 * 1024 // 5MB part size
    });

    // pipe incoming file stream into PassThrough
    fileStream.pipe(pass);

    // push upload promise
    const p = upload.done()
      .then((result) => {
        return { key, location: result.Location || `s3://${process.env.S3_BUCKET}/${key}`, filename, mimetype };
      });
    uploads.push(p);

    // optionally, you can record metadata early (but prefer after upload result)
  });

  busboy.on('field', (name, val) => {
    // handle other form fields if needed
  });

  busboy.on('error', (err) => {
    console.error('busboy error', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  });

  busboy.on('finish', async () => {
    try {
      const results = await Promise.all(uploads);

      // create FileMeta entries in MongoDB for each file
      const docs = await Promise.all(results.map(r => FileMeta.create({
        s3Key: r.key,
        originalName: r.filename,
        mimeType: r.mimetype,
        size: null // S3 result doesn't always include size; you can set after headObject if needed
      })));

      return res.status(201).json({ files: docs });
    } catch (err) {
      console.error('upload finish error', err);
      return res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  });

  req.pipe(busboy);
});

module.exports = router;
