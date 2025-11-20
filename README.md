# WealthUp Ingestion Backend

Production-ready Express.js service that ingests large text files, stores them in S3, and hydrates MongoDB through a resilient job queue. Built per the WealthUp assignment brief with a focus on streaming, durability, and operational clarity.

---

## System Overview
- **Language / Runtime:** Node.js 18, Express 4.
- **Storage:** Amazon S3 for raw uploads, MongoDB Atlas for metadata, jobs, and processed records.
- **Queue:** Custom Mongo-backed queue with worker processes running inside the same service.
- **Deployment Target:** AWS EC2 (Ubuntu 22.04) 

The API stays responsive during heavy ingestion because uploads stream straight to S3 and processing happens asynchronously via workers.

---

## Key Features
- **Streaming uploads:** `POST /upload` uses Busboy + AWS managed multipart uploads, so files never reside fully in memory or disk.
- **Strict file validation:** Only text-like files (`csv`, `json`, `txt`, MIME `text/*` or whitelisted `application/*`) are accepted; binaries are rejected early and never reach S3.
- **Durable job queue:** `POST /process/:fileId` enqueues one job per file with optional priority. Jobs persist across deploys/restarts.
- **Workers with progress tracking:** Each job tracks `processedLines`, `totalLines`, and timestamps. Workers resume gracefully and write to Mongo in configurable batches.
- **Status endpoints:** `GET /process/job/:jobId` and `GET /process/file/:fileId/jobs` power dashboards/polling flows.
- **Operational safeguards:** On boot, stuck jobs are re-queued; idle workers back off; Mongo writes are batched.

---


## API Reference

| Method & Path | Description |
| --- | --- |
| `POST /upload` | Accepts multipart/form-data (`file` field). Streams text files to S3 and stores metadata. |
| `POST /process/:fileId` | Enqueues a processing job for a given file. Body: `{ "priority": number }` (optional). |
| `GET /process/job/:jobId` | Returns the job document (status, progress, errors, associated file). |
| `GET /process/file/:fileId/jobs` | Lists the 20 most recent jobs for a file. |
| `GET /health` | Liveness probe (`{ "status": "ok" }`). |

---

## Postman Collection

| Resource | Description |
| --- | --- |
| Hosted workspace | [Postman Workspace (share link)](https://www.postman.com/gumanpratapsinghparmar/workspace/wealthup/collection/13310506-5725cfe7-bb5f-446b-9167-d327052279ae?action=share&source=copy-link&creator=13310506) – run the same requests online. |

Instructions:
1. Import the collection (file or workspace).
2. Set the `baseUrl` collection variable (`http://51.20.66.95:3000` by default).
3. Run the requests in order: health → upload → process → job status → file jobs.
---

## Future Enhancements
- Build small UI to visualize file/catalog/job states.

---
