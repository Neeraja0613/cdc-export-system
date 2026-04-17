# CDC Data Export System

## 📌 Overview

This project is a **containerized backend system** that exports user data efficiently using **Change Data Capture (CDC)** principles.
Instead of exporting all data every time, it uses **watermarking (timestamps)** to export only new or updated records.

---

## 🚀 Features

* Full data export (non-deleted users)
* Incremental export using timestamps
* Delta export with operation types (INSERT, UPDATE, DELETE)
* Watermark tracking per consumer
* Asynchronous export jobs
* CSV file generation
* Dockerized setup using Docker Compose
* PostgreSQL database with large seeded dataset (100,000+ records)
* Structured logging
* Unit & integration tests

---

## 🏗️ Architecture

* **Backend**: Node.js (Express)
* **Database**: PostgreSQL
* **Containerization**: Docker + Docker Compose
* **Data Format**: CSV
* **CDC Strategy**: Timestamp-based (`updated_at`)
* **State Tracking**: Watermarks table

---

## 📁 Project Structure

```
cdc-export-system/
│
├── app/                 # Application code
├── seeds/               # DB schema & seed scripts
├── tests/               # Test cases
├── output/              # Generated CSV files (ignored in git)
├── docker-compose.yml
├── .env.example
├── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```
git clone <repo-url>
cd cdc-export-system
```

### 2️⃣ Start Application

```
docker-compose up --build
```

### 3️⃣ Verify Services

* App: [http://localhost:8080](http://localhost:8080)
* Database: PostgreSQL running inside container

---

## 🔍 API Endpoints

### ✅ Health Check

```
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-04-17T10:00:00Z"
}
```

---

### 📤 Full Export

```
POST /exports/full
Header: X-Consumer-ID: consumer-1
```

Response:

```json
{
  "jobId": "uuid",
  "status": "started",
  "exportType": "full",
  "outputFilename": "full_consumer-1_timestamp.csv"
}
```

---

### 📤 Incremental Export

```
POST /exports/incremental
Header: X-Consumer-ID: consumer-1
```

Exports only updated records after last watermark.

---

### 📤 Delta Export

```
POST /exports/delta
Header: X-Consumer-ID: consumer-1
```

Includes:

* INSERT → new records
* UPDATE → modified records
* DELETE → soft-deleted records

---

### 📊 Get Watermark

```
GET /exports/watermark
Header: X-Consumer-ID: consumer-1
```

Response:

```json
{
  "consumerId": "consumer-1",
  "lastExportedAt": "timestamp"
}
```

---

## 🗄️ Database Schema

### users Table

* id (Primary Key)
* name
* email (Unique)
* created_at
* updated_at
* is_deleted (Soft delete)

✔ Indexed on `updated_at`

---

### watermarks Table

* id (Primary Key)
* consumer_id (Unique)
* last_exported_at
* updated_at

---

## 🌱 Database Seeding

* Automatically runs on container startup
* Generates **100,000+ records**
* Data spread over last 7 days
* 1% records marked as deleted
* Idempotent (no duplicates on rerun)

---

## 📂 Output Files

* Stored in `/output` directory
* Format: CSV

Example:

```
full_consumer-1_1710000000.csv
```

---

## 🔄 How CDC Works

1. First run → Full export
2. Store latest `updated_at` as watermark
3. Next run → Export only new/updated data
4. Prevents duplication & improves performance

---

## ⚠️ Important Design Points

* Watermark updates **only after successful export**
* Export jobs run asynchronously
* Each consumer has independent tracking
* Uses timestamp-based CDC (simple & scalable)

---

## 🧪 Running Tests

Inside container:

```
docker exec -it <app_container_name> npm test
```

For coverage:

```
npm test -- --coverage
```

✔ Minimum required coverage: 70%

---

## 📜 Logs

Logs include:

* Job started
* Job completed
* Job failed

View logs:

```
docker logs <app_container_name>
```

---

## 🧠 Future Improvements

* Add message queue (RabbitMQ / Kafka)
* Parallel processing for large exports
* File storage in cloud (S3)
* Retry mechanism for failed jobs
* Pagination for extremely large datasets

---

## 🎯 Conclusion

This system demonstrates how to build a **scalable data export pipeline** using:

* CDC principles
* Watermarking
* Asynchronous processing
* Containerized microservices

---

## 👩‍💻 Author

Neeraja Palla
