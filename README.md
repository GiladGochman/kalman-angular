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

## Accessing from another device on the same network

To open the site on a phone or another computer connected to the same Wi-Fi:

### 1. Find your local IP

Run in PowerShell:

```powershell
ipconfig
```

Look for the **IPv4 Address** under your active network adapter (e.g. `10.0.0.9`).

### 2. Start both servers bound to all interfaces

Start the backend first (in `server/`):

```bash
npm run dev
```

Then start the frontend in a separate terminal, passing `--host 0.0.0.0`:

```bash
npm start -- --host 0.0.0.0
```

### 3. Open on your device

On your phone or other device, navigate to:

```
http://<your-ip>:4200
```

For example: `http://10.0.0.9:4200`

### 4. (If it doesn't connect) Temporarily open the port in Windows Firewall

Run the following two commands in PowerShell **as Administrator** to allow inbound traffic on ports 4200 and 3000:

```powershell
New-NetFirewallRule -DisplayName "Angular Dev 4200" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow
New-NetFirewallRule -DisplayName "Express Dev 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

To remove the rules when you're done:

```powershell
Remove-NetFirewallRule -DisplayName "Angular Dev 4200"
Remove-NetFirewallRule -DisplayName "Express Dev 3000"
```

## Environment variables

Create `server/.env` to override defaults:

| Variable   | Default                          | Description                     |
|------------|----------------------------------|---------------------------------|
| `PDF_PATH` | `src/assets/pgishat mahzor.pdf`  | Path to the PDF file            |
| `CACHE_DIR` | `tile-cache`                    | Directory for pre-rendered tiles |
| `PORT`     | `3000`                           | Backend server port              |
