# Kalman

A web-based PDF viewer for the Kalman mahzor, built with Angular and an Express backend. The backend renders the PDF into obfuscated tiles to prevent direct downloading.

## Prerequisites

- Node.js (v18+)
- npm

## Book placement

Place the PDF file at:

```
src/assets/pgishat mahzor.pdf
```

The filename must be exactly `pgishat mahzor.pdf` (with a space). Alternatively, override the path by setting the `PDF_PATH` environment variable in `server/.env`.

## Running locally

You need to run two processes: the Angular frontend and the Express backend.

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### 2. (Optional) Pre-render tile cache

Running warmup pre-renders all PDF pages into the tile cache so the first page load is instant. Skip this step to let tiles render on demand instead.

```bash
cd server
npm run warmup
cd ..
```

### 3. Start the backend

```bash
cd server
npm run dev
```

The server runs on `http://localhost:3000`.

### 4. Start the frontend

In a separate terminal:

```bash
npm start
```

Navigate to `http://localhost:4200`.

## Environment variables

Create `server/.env` to override defaults:

| Variable   | Default                          | Description                     |
|------------|----------------------------------|---------------------------------|
| `PDF_PATH` | `src/assets/pgishat mahzor.pdf`  | Path to the PDF file            |
| `CACHE_DIR` | `tile-cache`                    | Directory for pre-rendered tiles |
| `PORT`     | `3000`                           | Backend server port              |
