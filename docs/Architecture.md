# ACADEX Architecture Document

## System Architecture

ACADEX follows a modern full-stack web architecture using Next.js, Prisma, PostgreSQL, and Auth.js.

### Architecture Overview

Frontend (Next.js)
↓
Route Handlers (API Layer)
↓
Service Layer
↓
Prisma ORM
↓
PostgreSQL Database

---

## Technology Stack

### Frontend

* Next.js 15
* React
* TypeScript
* Tailwind CSS
* ShadCN UI
* Lucide Icons

### Backend

* Next.js Route Handlers
* TypeScript

### Authentication

* Auth.js
* Google OAuth
* Credentials Provider

### Database

* PostgreSQL
* Supabase Hosting

### ORM

* Prisma ORM

### State Management

* Zustand
* TanStack Query

### Deployment

* Vercel
* Supabase

---

## Core Modules

### Authentication Module

Responsibilities:

* Register Users
* Login Users
* Session Management
* Authorization

### Dashboard Module

Responsibilities:

* Overview Statistics
* Deadlines
* Productivity Insights

### Subject Module

Responsibilities:

* Subject CRUD Operations
* Subject Organization

### Task Module

Responsibilities:

* Task CRUD Operations
* Task Prioritization
* Deadline Tracking

### Pomodoro Module

Responsibilities:

* Timer Management
* Session Tracking
* Study Statistics

### Analytics Module

Responsibilities:

* Productivity Reports
* Study Trends
* Focus Statistics

---

## Project Structure

src/
│
├── app/
│ ├── dashboard/
│ ├── tasks/
│ ├── subjects/
│ ├── pomodoro/
│ ├── analytics/
│ ├── profile/
│ └── api/
│
├── components/
│ ├── ui/
│ ├── dashboard/
│ ├── tasks/
│ ├── subjects/
│ └── pomodoro/
│
├── services/
├── hooks/
├── store/
├── types/
├── lib/
└── prisma/

---

## Security Considerations

* Secure Password Hashing
* Route Protection
* Session Validation
* Input Validation
* CSRF Protection
* Environment Variable Security

---

## Scalability Plan

Future architecture additions:

* Notes Service
* Calendar Service
* AI Assistant Service
* Notification Service
* Collaboration Service
