# ARCHITECTURE.md

## What the app does
Inkforge is a high-fidelity narrative asset management suite and publishing pipeline. It goes beyond standard word processing by treating a manuscript as a complex relational database. It integrates an intelligent Story Strategy Optimization (SSO) engine with a distraction-free writing canvas, helping authors maintain structural integrity, consistency, and professional formatting.

## Key features
- **Midnight Chronicle Editor**: A professional three-panel interface (Binder, Writing Canvas, Inspector) optimized for focused, distraction-free writing.
- **Relational Story Graph**: Chapters, Scenes, Characters, Locations, Lore, and Timeline Events are deeply linked, managed locally via Zustand, and synced to PostgreSQL.
- **Real-Time SSO Intelligence**: AI-assisted developmental editing, prose analysis, and pacing critiques available directly alongside the text.
- **Debounced Batch Synchronization**: Robust background state syncing (`StoreSyncManager`) that bulk-upserts data to the Supabase backend efficiently without freezing the UI.
- **Dynamic Worldbuilding**: "Glossary", "Lore", and "Artifacts" are elegantly mapped onto the unified `locations` backend table using an internal `type` index, avoiding database schema bloat.
- **Client-Side Export Compilation**: Direct transformation of local state into fully compliant, industry-standard `.docx` formats via the Python-based `NovelFormatter` engine.

## Tech stack
- **Frontend**: React 18, Vite, Zustand (SSOT State Management).
- **Backend**: FastAPI (Python 3.10+), Pydantic.
- **Database / Auth**: Supabase (PostgreSQL), JWT.
- **AI Integration**: OpenRouter API for SSO Engine intelligence.
- **Styling**: Vanilla CSS, bespoke Midnight Chronicle theme variables.

## Known issues
- **Sync Overlaps**: Due to the background debouncing mechanism, simultaneous multi-tab/multi-device editing can result in "Last-Write-Wins" collisions.
- **Cold Starts**: If deployed to serverless/free-tier cloud platforms (e.g., Render), the Python backend may experience a ~30-second cold start delay after inactivity.
- **Large Manuscript Export**: Very large manuscripts (>150k words) compiled directly via the backend blob streamer might experience slight memory pressure delays during `.docx` generation.
- **Component Bloat**: `MidnightChronicleEditor.jsx` currently handles a massive amount of internal state and sub-components.

## What you want feedback on
- **Debounce Optimization**: Is the 3-5 second debounce delay in `StoreSyncManager.jsx` optimal for the user experience, or does it feel disjointed during rapid typing sessions?
- **AI Inspector Efficacy**: Are the Prose Analysis and Developmental Editor signals genuinely useful during active drafting, or do they distract from the creative flow?
- **Worldbuilding Abstraction**: Does utilizing the `locations` table to store Lore, Artifacts, and Glossary entries scale well long-term, or should we invest in explicit schema migrations for these specific entities?
- **Component Modularization**: Recommendations on cleanly splitting `MidnightChronicleEditor.jsx` into smaller, highly cohesive files without breaking the tightly coupled Zustand hooks.
