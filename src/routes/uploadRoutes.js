const express = require('express');
const Busboy = require('busboy');
const { PassThrough } = require('stream');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const FileMeta = require('../models/filemeta');
const { isTextLikeFile } = require('../utils/isfilesafe');

const router = express.Router();
const s3Client = new S3Client({ region: process.env.AWS_REGION });

function makeKey(name) {
  const base = (name || 'file').trim().replace(/\s+/g, '_');
  const random = Math.random().toString(16).slice(2, 10);
  return `${Date.now()}-${random}-${base}`;
}

router.post('/', (req, res) => {
  const pendingUploads = [];
  let responded = false;
  const fail = (status, payload) => {
    if (responded) return;
    responded = true;
    res.status(status).json(payload);
  };
  const busboy = new Busboy({
    headers: req.headers,
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024 * 1024) },
  });
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (responded) {
      file.resume();
      return;
    }

    if (!filename) {
      file.resume();
      return fail(400, { message: "Filename required" });
    }

    const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';

    const safe = isTextLikeFile({
      mimeType: mimetype,
      extension,
      filename
    });

    if (!safe) {
      file.resume();
      return fail(415, {
        message: "unsupported_file_type",
        detail: { mimeType: mimetype, extension, filename }
      });
    }

    const key = makeKey(filename);
    const pass = new PassThrough();

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: pass,
        ContentType: mimetype || 'application/octet-stream'
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    file.pipe(pass);

    const uploadPromise = upload.done().then(() => ({
      key,
      originalName: filename,
      mimeType: mimetype
    }));

    pendingUploads.push(uploadPromise);
  });

  busboy.on('error', err => {
    console.error(err);
    fail(500, { message: 'Upload failed' });
  });
  busboy.on('finish', async () => {
    if (responded) return;
    try {
      if (!pendingUploads.length) {
        fail(400, { message: 'No files uploaded' });
        return;
      }
      const uploaded = await Promise.all(pendingUploads);
      const docs = await FileMeta.create(
        uploaded.map(meta => {
          const extension = meta.originalName.includes('.')
            ? meta.originalName.split('.').pop()
            : '';
          return {
            s3Key: meta.key,
            originalName: meta.originalName,
            mimeType: meta.mimeType,
            size: null,
            extension,
          };
        })
      );
      responded = true;
      res.status(201).json({ files: Array.isArray(docs) ? docs : [docs] });
    } catch (err) {
      console.error(err);
      fail(500, { message: 'Upload failed' });
    }
  });
  req.pipe(busboy);
});

module.exports = router;
