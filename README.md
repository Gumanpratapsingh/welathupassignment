# Wealthup Ingestion Backend

Streaming-friendly Express service that accepts arbitrarily large text uploads, persists file metadata in MongoDB, and asynchronously hydrates line-level records through a minimal job queue.

## What’s Implemented
- `POST /upload` streams multipart files directly into S3 using managed multipart uploads, never buffering entire files in memory.
- `POST /process/:fileId` enqueues a durable Mongo-backed job with optional priority, guaranteeing only one active job per file.
- Background workers (configurable via `MAX_WORKERS`) pull jobs fairly (priority, then FIFO), stream file contents back from S3, and bulk insert parsed records into MongoDB with progress checkpoints.
- `GET /process/job/:jobId` and `GET /process/file/:fileId/jobs` expose job status for dashboards or polling.
- Crash-safe queue: jobs stuck in `processing` are automatically re-queued on boot.

## Architecture Overview
| Concern | Implementation |
| --- | --- |
| Large uploads | Busboy + `@aws-sdk/lib-storage` stream parts into S3 with configurable chunk sizes and queue depth |
| Metadata | `FileMeta` documents track original name, MIME type, size placeholder, and sanitized extension |
| Job queue | Mongo collection acts as a durable queue with optimistic `findOneAndUpdate` locking, worker affinity tracking, and exponential polling backoff |
| Workers | Long-lived loops update progress via `processedLines/totalLines`, flush batches (`BATCH_SIZE`, default 500) to avoid hammering MongoDB |
| Parsing | `fileProcessor` normalizes extensions (`json`, `csv`, default text) and keeps going when individual lines fail |
| Resiliency | Each batch save updates the job document, so restarts resume from the last persisted counters |

## API Quick Reference
```
POST   /upload                  # multipart/form-data (file fields only)
POST   /process/:fileId         # body: { "priority": 5 }
GET    /process/job/:jobId
GET    /process/file/:fileId/jobs
GET    /health
```

### Example cURL
```bash
curl -F "file=@./samples/huge.txt" https://api.example.com/upload
curl -X POST https://api.example.com/process/<fileId>
curl https://api.example.com/process/job/<jobId>
```

## Local Development
1. `npm install`
2. Copy `.env.example` → `.env` (see vars below)
3. `npm run dev`
4. Hit `http://localhost:3000/health`

### Required Environment Variables
```
PORT=3000
AWS_REGION=ap-south-1
S3_BUCKET=your-bucket-name
MONGO_URI=mongodb+srv://...
MAX_UPLOAD_BYTES=10737418240
MAX_WORKERS=2
BATCH_SIZE=500
```

## Deployment (EC2)
| Item | Detail |
| --- | --- |
| Provider | AWS |
| AMI | Ubuntu Server 22.04 LTS |
| Instance Type | t2.micro (free-tier) |
| Public IP | 51.20.66.95 |
| Security Group | SSH (22) locked to maintainer IP, HTTP/3000 open for demo |
| Key Pair | `wealthupkey.pem` |
| Services | Node.js app on port 3000, optional Nginx reverse proxy, MongoDB Atlas + S3 access via IAM role or keys |

### Suggested provisioning steps
1. `ssh -i wealthupkey.pem ubuntu@51.20.66.95`
2. Install Node 18 LTS + PM2 (or systemd service)
3. Pull this repo, add `.env`, run `npm install`
4. `pm2 start src/app.js --name wealthup-api`
5. (Optional) Configure Nginx to proxy `https://<domain>` → `localhost:3000`

## Operational Notes
- Upload & processing services are decoupled: the API remains responsive even while workers churn.
- Workers throttle themselves (750 ms poll) when the queue is empty to avoid needless Mongo reads.
- Jobs persist across deployments; `recoverJobsOnStartup` resets any `processing` jobs back to `queued`.
- Batching keeps MongoDB writes under control; tune `BATCH_SIZE` based on collection throughput budgeting.

## Future Enhancements
- Persist upload sizes via S3 `HeadObject` to populate `FileMeta.size`.
- Add signed URL download endpoint for processed files.
- Expose Prometheus metrics for queue depth and worker utilization.

