# Stage 1

## Notification System — REST API Design


This document describes the REST API design for a campus notification platform. The platform sends real-time updates to students about Placements, Events, and Results. All endpoints require the user to be authenticated using a Bearer token in the Authorization header.


The notification platform needs to support the following actions:

1. Getting all notifications for a student (with pagination and filtering by type or read status)
2. Getting a single notification by its ID
3. Marking a single notification as read
4. Marking all notifications as read at once
5. Getting the count of unread notifications (for the bell icon on the UI)
6. Deleting a notification
7. Creating a new notification (used by the server or admin to push notifications to students)
8. Subscribing to real-time notification updates


Every response follows a consistent envelope with a "success" boolean, a "data" object containing the actual payload, and a "meta" object with the request ID and timestamp. Errors include an "error" field instead of "data", with a "code" and "message" explaining what went wrong.


Each notification has the following fields: 

- "id" — unique UUID for the notification
- "type" — one of "Placement", "Event", or "Result"
- "message" — the text content of the notification
- "isRead" — boolean, false by default
- "studentId" — the roll number of the student it belongs to
- "createdAt" and "updatedAt" — ISO 8601 timestamps

---

### API Endpoints

GET /api/v1/notifications </br> 
GET /api/v1/notifications/unread-count </br>
GET /api/v1/notifications/:id </br>
POST /api/v1/notifications </br>
PATCH /api/v1/notifications/:id/read </br>
PATCH /api/v1/notifications/read-all </br>
DELETE /api/v1/notifications/:id  </br>
POST /api/v1/notifications/stream-token </br>
GET /api/v1/notifications/stream </br>

