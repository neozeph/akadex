# ACADEX Database Design

## Database Engine

PostgreSQL

## ORM

Prisma ORM

---

## Entity Relationship Diagram

User
│
├── Subject
│ └── Task
│
└── PomodoroSession

---

## User Table

Fields:

* id
* name
* email
* password
* image
* createdAt
* updatedAt

Relationships:

* One User → Many Subjects
* One User → Many Pomodoro Sessions

---

## Subject Table

Fields:

* id
* userId
* name
* description
* color
* createdAt
* updatedAt

Relationships:

* One Subject → Many Tasks

---

## Task Table

Fields:

* id
* subjectId
* title
* description
* priority
* status
* dueDate
* createdAt
* updatedAt

Priority Enum:

* LOW
* MEDIUM
* HIGH
* URGENT

Status Enum:

* TODO
* IN_PROGRESS
* DONE

---

## PomodoroSession Table

Fields:

* id
* userId
* duration
* completed
* startedAt
* endedAt

---

## Future Tables

### Note

* id
* userId
* title
* content

### Event

* id
* userId
* title
* date

### Group

* id
* name
* ownerId

### ChatHistory

* id
* userId
* message
* response

---

## Database Design Principles

* Normalized Structure
* Referential Integrity
* Indexed Foreign Keys
* Scalable Entity Relationships
* Soft Deletion Support (Future)
