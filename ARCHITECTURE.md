# SmartQuiz Buddy — System Architecture & Workflow Specification

This document provides a comprehensive technical overview of the **SmartQuiz Buddy** platform architecture, data flows, database schemas, security mechanisms, and serverless Edge Function workflows.

---

## 🏛️ High-Level System Architecture

SmartQuiz Buddy is engineered as a modern, serverless single-page web application (SPA) backed by **Supabase** and powered by **Google Gemini 2.0 Flash AI**.

```mermaid
flowchart TB
    subgraph Client ["Client Layer (Browser / SPA)"]
        UI["React 18 + Tailwind CSS + shadcn/ui"]
        State["TanStack React Query + React Router"]
        LocalCache["LocalStorage (Guest Mode + Offline Cache)"]
    end

    subgraph AuthLayer ["Authentication Layer"]
        SupaAuth["Supabase Auth (JWT + Session Guard)"]
    end

    subgraph DataLayer ["Database Layer (PostgreSQL)"]
        DB[(Supabase PostgreSQL)]
        RLS["Row Level Security (RLS)"]
        DB --- RLS
    end

    subgraph ServerlessLayer ["Serverless & AI Engine"]
        EF1["Edge Function: generate-questions"]
        EF2["Edge Function: get-recommendations"]
        Gemini["Google Gemini 2.0 Flash API"]
    end

    UI -->|Route & Query Handling| State
    UI -->|Auth Credentials| SupaAuth
    State -->|Direct Database SDK| RLS
    State -->|Invoke Function| EF1
    State -->|Invoke Function| EF2
    EF1 -->|Generate Content| Gemini
    EF2 -->|Analyze & Recommend| Gemini
    EF1 -->|Store Generated Test| DB
    LocalCache <-->|Offline Fallback| UI
```

---

## 🔄 End-to-End User & Data Workflow

### 1. Authentication & Session Initialization
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as React App
    participant Auth as Supabase Auth
    participant LS as LocalStorage

    alt User Authentication
        User->>App: Login / Signup with Email
        App->>Auth: signInWithPassword / signUp
        Auth-->>App: Return JWT Token & Session
    else Guest / Demo Mode
        User->>App: Click "Continue as Guest"
        App->>LS: Store guest_user_id & local session
    end
    App->>User: Redirect to Dashboard
```

### 2. Mock Test Generation Workflow
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Dashboard as Dashboard UI
    participant EF as Edge Function (generate-questions)
    participant Gemini as Google Gemini API
    participant DB as PostgreSQL Database
    participant Fallback as Local Question Bank

    User->>Dashboard: Select Topic, MCQ Count & Coding Count
    Dashboard->>Dashboard: Check network & API availability

    alt Live AI Generation
        Dashboard->>EF: POST /generate-questions (topic, numMcqs, numCoding)
        EF->>Gemini: POST /v1beta/models/gemini-2.0-flash:generateContent
        Gemini-->>EF: Return JSON array of questions
        EF->>DB: Save test session & test_questions
        EF-->>Dashboard: Return structured questions
    else Edge Function / Network Unavailable
        Dashboard->>Fallback: Retrieve pre-packaged interview bank
        Fallback-->>Dashboard: Return curated fallback questions
    end

    Dashboard->>User: Launch Test Interface (/test/:testId)
```

### 3. Test Evaluation & AI Study Recommendations
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant TestUI as Test Page
    participant Utils as Quiz Utilities
    participant EF as Edge Function (get-recommendations)
    participant Gemini as Google Gemini API
    participant DB as PostgreSQL

    User->>TestUI: Submit Answers / Code Challenges
    TestUI->>Utils: Normalize answers & compute accuracy
    TestUI->>DB: Update test status = 'completed' & user_progress

    TestUI->>EF: POST /get-recommendations (testResults, topicName)
    EF->>Gemini: Analyze weak areas & return study plan
    Gemini-->>EF: Structured recommendations JSON
    EF-->>TestUI: Display performance breakdown & action steps
```

---

## 🗄️ Database Schema & RLS Security

### Data Schema Overview

```mermaid
erDiagram
    topics ||--o{ tests : "categorizes"
    tests ||--o{ test_questions : "contains"
    auth_users ||--o{ tests : "creates"
    auth_users ||--o{ user_progress : "tracks"

    topics {
        uuid id PK
        string name
        string category
        string description
        timestamptz created_at
    }

    tests {
        uuid id PK
        uuid user_id FK
        uuid topic_id FK
        integer num_mcqs
        integer num_coding
        string status
        timestamptz created_at
        timestamptz completed_at
    }

    test_questions {
        uuid id PK
        uuid test_id FK
        string question_type
        text question_text
        jsonb options
        string correct_answer
        string user_answer
        boolean is_correct
        text code_submission
        string language
        timestamptz created_at
    }

    user_progress {
        uuid id PK
        uuid user_id FK
        uuid topic_id FK
        integer tests_taken
        integer total_questions
        integer correct_answers
        decimal accuracy
        timestamptz last_test_date
        timestamptz updated_at
    }
```

### Security Architecture — Row Level Security (RLS)

Every database table is strictly protected by PostgreSQL RLS policies:
- **`topics`**: Publicly readable by all users (`USING (true)`).
- **`tests`**: Strictly scoped to `auth.uid() = user_id`.
- **`test_questions`**: Scoped via subquery to tests owned by `auth.uid()`.
- **`user_progress`**: Scoped to `auth.uid() = user_id`.

---

## 💻 Tech Stack Summary

| Component | Technology | Role |
|-----------|------------|------|
| **UI Framework** | React 18 (TypeScript) | Declarative component UI |
| **Bundler** | Vite 5 + SWC | Lightning fast dev server & optimized production build |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui | Utility-first responsive design system |
| **State & Fetching** | TanStack React Query v5 | Server state caching and synchronization |
| **Routing** | React Router v6 | Client-side page navigation |
| **Backend & Auth** | Supabase (PostgreSQL + Auth) | Cloud database and user session management |
| **Serverless AI** | Supabase Edge Functions + Deno | Edge execution of Gemini API requests |
| **AI Model** | Google Gemini 2.0 Flash | Dynamic CS question & recommendation generation |

---

## 🛡️ Reliability & Fault Tolerance

1. **Graceful Fallback**: If the Gemini API or network connection is unavailable, the application seamlessly switches to a comprehensive pre-built question bank for all 8 CS subjects.
2. **Session Preservation**: Test progress and guest accounts are stored in `localStorage` to prevent data loss on page refresh.
3. **Defensive Component Rendering**: Loading skeletons and error boundaries prevent white-screen crashes under missing or partial data states.
