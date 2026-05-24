# Kalman

A web-based PDF viewer for the Kalman mahzor, built with Angular. The book pages are served from the local tile cache, so the app runs on localhost without the Express backend.

## Prerequisites

The filename must be exactly `pgishat mahzor.pdf` (with a space). Alternatively, override the path by setting the `PDF_PATH` environment variable in `server/.env`.

You need to run two processes: the Angular frontend and the Express backend.

cd server
npm install

### 2. Start the app

The server runs on `http://localhost:3000`.

In a separate terminal:

```bash
npm start
```

## Accessing from another device on the same network

Navigate to `http://localhost:4200`.
To open the site on a phone or another computer connected to the same Wi-Fi:

## Accessing from another device on the same network

To open the site on a phone or another computer connected to the same Wi-Fi:

### 1. Find your local IP

Run in PowerShell:

```powershell
ipconfig
```

Look for the **IPv4 Address** under your active network adapter (e.g. `10.0.0.9`).

### 2. Start the frontend bound to all interfaces

```bash
npm start -- --host 0.0.0.0
```

### 3. Open on your device

On your phone or other device, navigate to:

```
http://<your-ip>:4200
```

For example: `http://10.0.0.9:4200`

### 3. (If it doesn't connect) Temporarily open the port in Windows Firewall

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

## Local cache

The cached page tiles live under `tile-cache/` and are exposed to the Angular app through `src/assets/tile-cache/`. If you refresh the cache from the server tools, keep that folder in sync so localhost continues to work without the backend.
