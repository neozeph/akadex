# AKADEX Architecture Document

## System Architecture

AKADEX uses a simple full-stack web architecture:

Frontend (Next.js)
-> Supabase Auth
-> Supabase PostgreSQL

---

## Technology Stack

### Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS
* ShadCN UI
* Lucide Icons

### Backend

* Next.js App Router
* Supabase client helpers
* Route handlers when needed

### Authentication

* Supabase Auth
* Email/password first
* Google OAuth later if needed

### Database

* PostgreSQL
* Supabase hosting
* Row Level Security

### Deployment

* Vercel
* Supabase

---

## Core Modules

### Authentication Module

Responsibilities:

* Register users
* Login users
* Session management
* Authorization

### Dashboard Module

Responsibilities:

* Overview statistics
* Deadlines
* Productivity insights

### Subject Module

Responsibilities:

* Subject CRUD operations
* Subject organization

### Task Module

Responsibilities:

* Task CRUD operations
* Task prioritization
* Deadline tracking

### Pomodoro Module

Responsibilities:

* Timer management
* Session tracking
* Study statistics

---

## Project Structure

src/
|-- app/
|   |-- (marketing)/
|   |-- (auth)/
|   |-- (dashboard)/
|   |-- api/
|-- components/
|-- lib/
|   |-- supabase/
|-- hooks/
|-- store/
|-- types/

---

## Security Considerations

* Secure authentication through Supabase
* Row Level Security on every user-owned table
* Environment variables stay in `.env`
* Server helpers never expose secrets to the browser

---

## Scalability Plan

Future additions can live on top of the same stack:

* Notes service
* Calendar service
* Notifications
* AI assistant
* Collaboration features
