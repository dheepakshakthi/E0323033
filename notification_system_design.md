# Stage 1

## Notification System — REST API Design

This document describes the REST API design for a campus notification platform. The platform delivers real-time updates to students about Placements, Events, and Results. All endpoints assume the caller has already been pre-authorised (no login/registration required as per the evaluation spec).

---

### Core Actions

The platform must support:

1. Retrieve all notifications for a student (paginated, filterable by type and read-status)
2. Retrieve a single notification by ID
3. Mark a single notification as read
4. Mark all notifications as read at once
5. Get the count of unread notifications (for the bell-icon badge)
6. Delete a notification
7. Create/push a new notification (server/admin side)
8. Subscribe to real-time notification updates via SSE

---

### Request / Response Conventions

Every response wraps the payload in a consistent envelope:

```json
{
  "success": true,
  "data": { },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

Errors replace `data` with:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

---

### Common Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

---

### Notification Object Schema

```json
{
  "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "type": "Placement",
  "message": "CSX Corporation is hiring",
  "isRead": false,
  "studentId": "e0323033",
  "createdAt": "2026-04-22T17:51:18Z",
  "updatedAt": "2026-04-22T17:51:18Z"
}
```

---

### Endpoints

#### `GET /api/v1/notifications`
Fetch all notifications for the authenticated student.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 10, max: 100) |
| `notification_type` | string | Filter: `Placement`, `Result`, `Event` |
| `isRead` | boolean | Filter by read status |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Placement",
      "message": "CSX Corporation is hiring",
      "isRead": false,
      "studentId": "e0323033",
      "createdAt": "2026-04-22T17:51:18Z",
      "updatedAt": "2026-04-22T17:51:18Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "requestId": "uuid",
    "timestamp": "2026-04-22T18:00:00Z"
  }
}
```

---

#### `GET /api/v1/notifications/:id`
Fetch a single notification by its UUID.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "type": "Placement",
    "message": "CSX Corporation is hiring",
    "isRead": false,
    "studentId": "e0323033",
    "createdAt": "2026-04-22T17:51:18Z",
    "updatedAt": "2026-04-22T17:51:18Z"
  },
  "meta": { "requestId": "uuid", "timestamp": "2026-04-22T18:00:00Z" }
}
```

**Response 404:**
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Notification not found" } }
```

---

#### `GET /api/v1/notifications/unread-count`
Returns the count of unread notifications for the bell icon.

**Response 200:**
```json
{ "success": true, "data": { "unreadCount": 12 } }
```

---

#### `POST /api/v1/notifications`
Create a new notification (admin / server-side push).

**Request Body:**
```json
{
  "type": "Placement",
  "message": "TCS hiring drive on 25th April",
  "studentIds": ["e0323033", "e0323034"]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": { "created": 2 },
  "meta": { "requestId": "uuid", "timestamp": "2026-04-22T18:00:00Z" }
}
```

---

#### `PATCH /api/v1/notifications/:id/read`
Mark a single notification as read.

**Response 200:**
```json
{ "success": true, "data": { "id": "uuid", "isRead": true } }
```

---

#### `PATCH /api/v1/notifications/read-all`
Mark all unread notifications for the student as read.

**Response 200:**
```json
{ "success": true, "data": { "updatedCount": 12 } }
```

---

#### `DELETE /api/v1/notifications/:id`
Delete a specific notification.

**Response 200:**
```json
{ "success": true, "data": { "deleted": true } }
```

---

### Real-Time Notifications — Server-Sent Events (SSE)

#### `POST /api/v1/notifications/stream-token`
Exchange the Bearer token for a short-lived SSE token (60 s TTL).
SSE connections are long-lived; embedding the main JWT in a URL query param is unsafe.

**Response 200:**
```json
{ "success": true, "data": { "streamToken": "short-lived-token", "expiresIn": 60 } }
```

#### `GET /api/v1/notifications/stream?token=<streamToken>`
Establish an SSE connection. The server pushes events as new notifications arrive.

**Response headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event payload:**
```
event: notification
data: {"id":"uuid","type":"Placement","message":"Infosys drive","createdAt":"2026-04-22T18:00:00Z"}
```

**Why SSE over WebSockets?**
SSE is unidirectional (server → client), works over plain HTTP/1.1, requires no upgrade handshake, and is natively supported by browsers with automatic reconnection. Since notifications are purely server-pushed (students never push data back), SSE is the simplest and most appropriate transport.

---

# Stage 2

## Persistent Storage — DB Design

### Recommended Database: PostgreSQL

**Reasoning:**
- Notifications have a well-defined, consistent schema — a relational model fits naturally.
- PostgreSQL supports `ENUM` types natively, which maps directly to the `notification_type` constraint.
- Rich indexing options (B-tree, partial indexes) are critical for the query patterns described in the spec.
- JSONB column support allows extending notification metadata without schema migrations.
- Widely used in production with strong ecosystem support.

---

### Schema

```sql
-- Enum for notification types
CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

-- Students table (minimal — auth is pre-handled)
CREATE TABLE students (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_no     VARCHAR(20) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    notification_type   notification_type NOT NULL,
    message             TEXT NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fetch unread notifications for a student ordered by time
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC)
    WHERE is_read = FALSE;

-- Index: filter by type for a student
CREATE INDEX idx_notifications_student_type
    ON notifications (student_id, notification_type, created_at DESC);
```

---

### Problems at Scale (50,000 students, 5,000,000 notifications)

| Problem | Description |
|---|---|
| **Table bloat** | 5M+ rows in a single table slow down sequential scans and vacuum operations |
| **Write contention** | Bulk inserts during "Notify All" cause lock contention |
| **Hot rows** | Frequently accessed students cause page-level hotspots |
| **Index bloat** | High-churn `is_read` updates fragment B-tree indexes |
| **Connection exhaustion** | 50,000 concurrent students can exhaust the connection pool |

**Solutions:**

- **Table partitioning** — Partition `notifications` by `created_at` (range, monthly). Old partitions can be archived or dropped cheaply.
- **Read replicas** — Route all SELECT queries to read replicas; writes go to the primary.
- **Connection pooling** — Use PgBouncer to multiplex thousands of app connections onto a smaller pool of DB connections.
- **Archival strategy** — Move notifications older than 90 days to a cold-storage table or object store (S3).
- **Denormalisation** — Cache `unread_count` per student in a separate `student_notification_meta` table, updated via triggers, to avoid COUNT queries on every page load.

---

### SQL Queries for Stage 1 APIs

```sql
-- GET /api/v1/notifications (paginated, optional type filter)
SELECT id, notification_type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
  AND ($2::notification_type IS NULL OR notification_type = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- GET /api/v1/notifications/:id
SELECT * FROM notifications
WHERE id = $1 AND student_id = $2;

-- GET /api/v1/notifications/unread-count
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE;

-- POST /api/v1/notifications (bulk insert for multiple students)
INSERT INTO notifications (student_id, notification_type, message)
SELECT unnest($1::uuid[]), $2::notification_type, $3;

-- PATCH /api/v1/notifications/:id/read
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE id = $1 AND student_id = $2;

-- PATCH /api/v1/notifications/read-all
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE student_id = $1 AND is_read = FALSE;

-- DELETE /api/v1/notifications/:id
DELETE FROM notifications
WHERE id = $1 AND student_id = $2;
```

---

# Stage 3

## Query Analysis & Optimisation

### Original Query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### Is the query accurate?

Mostly yes — it correctly filters unread notifications for a student and orders them by time. However:

- `ORDER BY createdAt ASC` returns oldest-first. For a notification inbox, **descending** order (newest first) is almost always the desired UX.
- `SELECT *` pulls every column including large `message` text, which is wasteful if the client only needs a subset.
- Using an integer `studentID = 1042` is fine if the column is indeed an integer, but the schema in Stage 2 uses UUIDs — the literal type must match to avoid a cast penalty.

---

### Why is it slow?

Without an index on `(studentID, isRead, createdAt)`, PostgreSQL performs a **full sequential scan** on the entire `notifications` table (5,000,000 rows), then filters and sorts in memory. At this scale that is catastrophically slow — O(N) in table size regardless of how few rows match.

---

### Fix

```sql
-- Partial index covering exactly this query pattern
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, created_at DESC)
    WHERE is_read = FALSE;

-- Optimised query
SELECT id, notification_type, message, created_at
FROM notifications
WHERE student_id = $1
  AND is_read = FALSE
ORDER BY created_at DESC;
```

**Why this works:** The partial index only indexes rows where `is_read = FALSE`. As notifications are marked read, they drop out of the index, keeping it small and fast. The composite `(student_id, created_at DESC)` lets PostgreSQL use an **index scan** directly — O(log N + K) where K is the number of unread rows for that student, instead of O(N).

**Likely computation cost after fix:**

| Metric | Before | After |
|---|---|---|
| Scan type | Sequential scan | Index scan |
| Rows examined | ~5,000,000 | ~K (unread per student, typically < 100) |
| Sort | In-memory filesort | Eliminated (index is pre-sorted) |
| Expected query time | Seconds | < 5 ms |

---

### Should we index every column?

**No.** This advice is harmful. Every index:

- Adds **write overhead** — every INSERT, UPDATE, and DELETE must update all indexes on the table.
- Consumes **disk space** — an index on a 5M-row table can easily exceed the table itself in size.
- Causes **index bloat** — high-churn columns like `is_read` fragment B-tree pages quickly.
- The query planner can only use **one index per table scan** (unless bitmap scans are combined) — having many indexes does not mean the planner uses them all.

The correct approach is to index only the columns that appear in WHERE clauses, ORDER BY, or JOIN conditions for the actual queries being executed.

---

### Query: Placement notifications in the last 7 days

```sql
SELECT s.roll_no, s.name, n.message, n.created_at
FROM notifications n
JOIN students s ON s.id = n.student_id
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC;
```

A supporting index for this query:

```sql
CREATE INDEX idx_notifications_type_created
    ON notifications (notification_type, created_at DESC);
```

---

# Stage 4

## Caching Strategy for Notification Fetches

The root cause is that every page load triggers a DB query, which is unnecessary because notification data changes infrequently relative to how often pages load.

---

### Recommended Strategies

#### 1. Server-Side Cache (Redis)

Cache the result of `GET /api/v1/notifications` per student in Redis with a short TTL (e.g., 30–60 seconds).

```
Key:   notifications:student:<student_id>:page:<page>:type:<type>
Value: JSON-serialised response
TTL:   30 seconds
```

On write operations (mark-read, new notification), **invalidate** the affected student's cache keys.

**Tradeoffs:**

| Pro | Con |
|---|---|
| Near-zero DB load for reads | Slightly stale data (up to TTL) |
| Sub-millisecond response times | Added infrastructure (Redis) |
| Works for all clients | Cache invalidation logic must be correct |

---

#### 2. Unread-Count Denormalisation

Instead of `SELECT COUNT(*) ... WHERE is_read = FALSE` on every page load, maintain an `unread_count` column in a `student_notification_meta` table and update it with a DB trigger or application-level increment/decrement.

**Tradeoffs:**

| Pro | Con |
|---|---|
| Eliminates expensive COUNT queries | Risk of count drift if updates fail |
| Single-row lookup (O(1)) | Adds complexity to write path |

---

#### 3. Client-Side Caching (HTTP Cache Headers)

Set `Cache-Control: private, max-age=30` and use `ETag` / `Last-Modified` headers. The browser will serve from cache without hitting the server until stale.

**Tradeoffs:**

| Pro | Con |
|---|---|
| Zero server load for repeated visits | Difficult to invalidate for real-time needs |
| Free — no extra infra | Only helps the same client/browser |

---

#### 4. Pagination + Lazy Loading

Instead of fetching all notifications, fetch only the first page (10 items) on load and load more on demand. Reduces both DB and network load significantly.

**Tradeoffs:**

| Pro | Con |
|---|---|
| Drastically reduces per-request data | Requires infinite scroll or pagination UI |
| Simple to implement | Users may miss notifications below the fold |

---

### Recommended Combined Approach

Use **Redis caching (30s TTL) + paginated fetching + SSE for real-time pushes**. This gives near-instant reads from cache, while SSE ensures new notifications appear immediately without polling. Cache is invalidated on any write for the affected student.

---

# Stage 5

## Reliable Bulk Notification Delivery

### Shortcomings of the Original Pseudocode

```
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # SSE / push
```

1. **Synchronous loop over 50,000 students** — this will time out long before completion. A single email API call may take 100–500 ms; 50,000 × 300 ms = 4+ hours.
2. **No error handling** — a single failure aborts or silently drops the rest.
3. **No retries** — transient failures (network blip, rate limit) are lost permanently.
4. **Tight coupling** — email, DB, and push happen in a single function with no isolation. A DB failure stops emails, and vice versa.
5. **No idempotency** — if the process crashes mid-loop, re-running it will double-send to students already notified.

---

### What to do about the 200 failed emails?

The failures must be captured in a **dead-letter queue (DLQ)** or a `failed_email_jobs` table. A retry worker processes the DLQ with exponential backoff. Failed students should never just be ignored — the system must guarantee at-least-once delivery.

---

### Should DB save and email happen together?

**No — they should be decoupled.** The DB insert is fast and local; the email is a slow, external, fallible operation. Coupling them means a failed email prevents the DB record from being created, leaving the student with no in-app notification either. The correct approach:

1. **Write to DB first** (fast, reliable, idempotent via `ON CONFLICT DO NOTHING`).
2. **Enqueue an email job** (decoupled via a message queue like Redis Streams, BullMQ, or RabbitMQ).
3. **Email workers** consume the queue asynchronously and handle retries independently.

This way the in-app notification is always created even if the email service is down.

---

### Redesigned Pseudocode

```
function notify_all(student_ids: array, message: string, notification_type: string):
    job_id = generate_uuid()

    # Step 1: Bulk insert all notifications into DB atomically
    # Uses INSERT ... ON CONFLICT DO NOTHING for idempotency
    # (job_id stored per row to allow safe re-runs)
    db_insert_bulk(student_ids, message, notification_type, job_id)
    log("backend", "info", "service", f"Bulk DB insert complete for job {job_id}, {len(student_ids)} rows")

    # Step 2: Enqueue email jobs in batches (not one-by-one)
    # Each job carries student_id, message, job_id for deduplication
    BATCH_SIZE = 500
    for batch in chunk(student_ids, BATCH_SIZE):
        email_queue.enqueue_batch(batch, message, job_id)
    log("backend", "info", "service", f"Email jobs enqueued for job {job_id}")

    # Step 3: Push real-time in-app notifications via SSE event bus
    # This is fire-and-forget; DB is the source of truth
    sse_event_bus.broadcast(student_ids, message, notification_type)
    log("backend", "info", "service", f"SSE broadcast dispatched for job {job_id}")


# Email worker (runs in separate process / worker pool)
function email_worker():
    while True:
        job = email_queue.dequeue()
        if job is None:
            sleep(1)
            continue

        try:
            send_email(job.student_id, job.message)
            email_queue.ack(job)
            log("backend", "info", "service", f"Email sent to {job.student_id}")
        except RateLimitError as e:
            log("backend", "warn", "service", f"Rate limited for {job.student_id}, requeuing")
            email_queue.requeue_with_backoff(job)
        except PermanentFailure as e:
            log("backend", "error", "service", f"Permanent email failure for {job.student_id}: {e}")
            dead_letter_queue.push(job)
        except TransientError as e:
            log("backend", "warn", "service", f"Transient error for {job.student_id}, retry {job.attempt}: {e}")
            if job.attempt < MAX_RETRIES:
                email_queue.requeue_with_backoff(job)
            else:
                dead_letter_queue.push(job)
```

**Key improvements:**

| Concern | Solution |
|---|---|
| Speed | Batched parallel workers instead of a serial loop |
| Reliability | Message queue with retries + DLQ |
| Idempotency | `job_id` per notification row; `ON CONFLICT DO NOTHING` |
| Decoupling | DB write is independent of email delivery |
| Observability | Structured logging at every step |

---

# Stage 6

## Priority Inbox — Approach

### Problem

Given a stream of incoming notifications, always surface the top N most important unread notifications. Priority is determined by:

1. **Type weight** — Placement (3) > Result (2) > Event (1)
2. **Recency** — newer notifications rank higher within the same type tier

### Algorithm

Each notification receives a **composite priority score**:

```
score = (type_weight × 10^13) + unix_timestamp_ms
```

Using `10^13` as the multiplier ensures type weight always dominates recency (since unix timestamps in milliseconds are currently ~`1.7 × 10^12`, well below `10^13`). This single numeric score allows a simple descending sort or a min-heap comparison.

### Data Structure: Min-Heap of size N

To maintain the top N notifications efficiently as new ones arrive:

- Use a **min-heap** (priority queue) of fixed capacity N.
- The heap is keyed by **score** (ascending) — the root is always the lowest-priority item in the current top-N.
- For each incoming notification:
  - Compute its score.
  - If the heap has fewer than N items → push it.
  - If the heap has N items and the new score > root score → pop the root, push the new item.
  - Otherwise discard the new item.
- This gives **O(log N)** per insertion and O(N log N) for initial load — far better than re-sorting the full list on every update.

### Implementation

The implementation is in `notification_app_be/controllers/controller.js` (backend) which fetches from the upstream API, scores every notification, and returns the sorted top-N. The frontend `PriorityNotificationsPage.jsx` renders the ranked list with type-based visual hierarchy, new/viewed state, and a configurable N selector.

For the in-memory heap approach (useful for a live stream), a min-heap keyed on the composite score is the optimal structure. JavaScript's `Array.sort` is used for the initial batch load since the upstream API returns a bounded set (~100 items); for a true live stream, the heap would replace the sort.
