# Multi-Platform Content Distribution Pipeline & ScatterFlow Studio

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![n8n](https://img.shields.io/badge/n8n-Automation-orange.svg)](https://n8n.io/)
[![Express](https://img.shields.io/badge/Express-Backend-blue.svg)](https://expressjs.com/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare-Tunnel-f38020.svg)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An open-source, full-stack social media publishing engine and multi-platform automation pipeline. It connects a custom **ScatterFlow Studio** web frontend with an **Express Backend Bridge** and a production-grade **n8n workflow** to dispatch sanitized, aspect-ratio-normalized posts across **Facebook Pages, Instagram Business, Meta Threads, and YouTube**.

---

## 1. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  LOCAL MACHINE                                    |
|                                                                                   |
|  [ ScatterFlow Studio UI ]                    [ Express Backend Bridge ]          |
|  (HTML5 / Vanilla CSS / app.js)  <--------->  (server.js on Port 3000)            |
|  - Real-time Post Creator                     - Smart Content-Negotiation         |
|  - Live n8n Error Telemetry                   - Post Queue Management             |
|  - Dynamic Media Previews                     - Multer Image Upload & Serving     |
|                                                        |                          |
|                                                        v                          |
|                                          +----------------------------+           |
|                                          |   Public HTTPS Tunnel      |           |
|                                          |   - Cloudflare Tunnel      |           |
|                                          |     (cloudflared)          |           |
|                                          |   - OR Localtunnel         |           |
|                                          +--------------+-------------+           |
+---------------------------------------------------------|-------------------------+
                                                          | Public HTTPS Bridge
                                                          | (e.g. *.trycloudflare.com)
                                                          v
+-----------------------------------------------------------------------------------+
|                         CLOUD / SELF-HOSTED n8n ENGINE                            |
|                                                                                   |
|  [ Schedule Trigger / Webhook ]                                                   |
|             |                                                                     |
|             v                                                                     |
|  [ Fetch from ScatterFlow ] (GET /)                                               |
|             |                                                                     |
|      +------+------+                                                              |
|      | Valid?      |                                                              |
|      |--[No]-----> [ Send Error Post ] (POST /) ---> Alerts ScatterFlow Studio    |
|      |                                                                            |
|      +--[Yes]----> [ JavaScript Caption & Tag Normalizer ]                        |
|                    - Title & body concatenation                                   |
|                    - Bulletproof hashtag extraction                               |
|                    - Media URL rewrites                                           |
|                                |                                                  |
|            +-------------------+-------------------+                              |
|            |                                       |                              |
|            v                                       v                              |
|   [ Facebook Graph API ]            [ Aspect-Ratio Normalizer ]                   |
|   - Page feed publish               - Get Image Dimensions                        |
|                                     - Edit Image (inject border padding)          |
|                                     - Re-upload to /api/upload                    |
|                                     - Publish to Instagram Business               |
|                                                    |                              |
|                                                    v                              |
|                                     [ Meta Threads Pipeline ]                     |
|                                     - Step 1: Create Media Container              |
|                                     - Step 2: Publish Thread Post                 |
+-----------------------------------------------------------------------------------+
```

---

## 2. Terminal Execution Flow (Playbook)

Follow this exact terminal flow to start the local backend server, expose it securely to the public internet, and link it with n8n.

### Step 1: Clone and Install Dependencies

Open your terminal, clone the repository, and install the required Node.js packages:

```bash
git clone https://github.com/Jullemyth122/supermulti-media-n8n-content.git
cd supermulti-media-n8n-content

# Install dependencies (Express, CORS, Multer)
npm install
```

---

### Step 2: Terminal 1 — Start the Backend Server

Start the local bridge server on port `3000`:

```bash
# Option A (Recommended): Hot-reload development mode
npm run dev
# This runs: node --watch --watch-path=server.js server.js
# Automatically restarts the server whenever server.js is updated.

# Option B: Standard production start
npm start
# (or: node server.js)
```

**Terminal 1 will display:**
```text
Backend server running on http://localhost:3000
```
- Access the web interface locally at: `http://localhost:3000/`

---

### Step 3: Terminal 2 — Expose Port 3000 to the Public Internet

Cloud n8n runs on remote cloud servers and cannot reach `localhost:3000`. You must expose your local port `3000` via a public tunnel.

Choose **one** of the two tunnel options below:

#### Option A (Recommended): Cloudflare Tunnel (`cloudflared`)
Cloudflare Tunnel is the most stable method because it does **not** inject anti-bot reminder interstitial screens.

1. **Install `cloudflared`** (if not already installed):
   - **Windows (winget)**:
     ```powershell
     winget install --id Cloudflare.cloudflared
     ```
   - **macOS (Homebrew)**:
     ```bash
     brew install cloudflared
     ```
   - **Linux**:
     ```bash
     curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
     sudo dpkg -i cloudflared.deb
     ```

2. **Run the quick tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Copy the assigned public URL**:
   Terminal 2 will output a URL similar to:
   ```text
   https://random-assigned-name.trycloudflare.com
   ```
   > Keep **Terminal 2** running. Closing this terminal tears down the tunnel.

---

#### Option B: Localtunnel
If you do not have `cloudflared` installed, you can use `localtunnel` with zero installation via `npx`:

```bash
npx -y localtunnel --port 3000
```

Terminal 2 will output:
```text
your url is: https://your-subdomain.loca.lt
```

> **Mandatory Rule for Localtunnel**: Localtunnel displays an anti-abuse reminder splash page on first visit. To prevent n8n automated HTTP requests from receiving an HTML reminder page instead of JSON, n8n requests must include the header:
> - **Header Name**: `Bypass-Tunnel-Reminder`
> - **Header Value**: `true`

---

### Step 4: Terminal Diagnostics & Process Management (Windows PowerShell)

If you encounter port conflicts or stuck processes:

```powershell
# 1. Check if port 3000 is occupied and view its PID
netstat -ano | findstr :3000

# 2. Force kill a stuck process on port 3000 (replace <PID> with the number from above)
taskkill /F /PID <PID>

# 3. Test your local server from the terminal
curl http://localhost:3000/
```

---

## 3. n8n Automation Nodes Walkthrough

The included file `workflow.json` contains the complete automation pipeline ready to import into n8n.

### Key Nodes & Responsibilities

| Node Name | Node Type | Purpose |
| :--- | :--- | :--- |
| **Schedule Trigger** | `n8n-nodes-base.scheduleTrigger` | Periodically triggers post ingestion (e.g. hourly or on custom cron). |
| **Webhook** | `n8n-nodes-base.webhook` | Receives direct real-time publish dispatches from ScatterFlow Studio. |
| **Get Request in ScatterFlow Site** | `n8n-nodes-base.httpRequest` | Performs a `GET /` request against your tunnel URL to pull the active queued post. |
| **Check Platform, Description, Media, Tags** | `n8n-nodes-base.if` | Validates that required platforms, text content, and valid tags exist. |
| **Send Error Post in ScatterFlow Site** | `n8n-nodes-base.httpRequest` | Fires `POST /` with validation error payloads back to `server.js` if checks fail. |
| **Code in JavaScript** | `n8n-nodes-base.code` | Formats full captions, sanitizes hashtags, and rewrites media URLs. |
| **Switch** | `n8n-nodes-base.switch` | Routes the payload to the respective target social platforms (Facebook, Instagram, Threads, YouTube). |
| **HTTP Request (Download Media)** | `n8n-nodes-base.httpRequest` | Fetches the raw image file from the backend's `/uploads` directory using `responseFormat: file`. |
| **Get Image Dimensions & Edit Image** | `n8n-nodes-base.editImage` | Calculates and pads canvas borders to guarantee valid Instagram 4:5 to 1.91:1 aspect ratios. |
| **HTTP Request2 (Upload Processed Media)** | `n8n-nodes-base.httpRequest` | Sends the normalized image back to `POST /api/upload` on the backend. |
| **Facebook Graph API** | `n8n-nodes-base.facebookGraphApi` | Dispatches post photo and full caption to your Facebook Page feed. |
| **Publish (Instagram)** | `@mookielianhd/n8n-nodes-instagram` | Dispatches post to Instagram Professional / Business account. |
| **HTTP Request1 & Publish Thread Post** | `n8n-nodes-base.httpRequest` | Two-step container creation and publish flow for Meta Threads API. |
| **Upload a video** | `n8n-nodes-base.youTube` | Modular YouTube video dispatch node (disabled by default). |

---

## 4. How the App & n8n Work Together

### 1. Smart Content-Negotiated Root (`GET /`)
When a user opens `https://your-tunnel-url/` in a web browser (Chrome, Brave, Safari), `server.js` inspects `sec-fetch-dest: document` and `accept: text/html` headers to deliver the interactive **ScatterFlow Studio** frontend.

When cloud n8n executes its `HTTP Request` node against `https://your-tunnel-url/`, `server.js` detects the API consumer headers and automatically serves the active post queue in **JSON format**.

### 2. Live Telemetry & Error Callbacks
When n8n's validation node detects missing tags or malformed platforms, it triggers the `Send Error Post` node back to `POST /` on your server.
- `server.js` captures the payload in memory and stores it in `/api/callbacks`.
- The ScatterFlow frontend polls `/api/callbacks` every 3 seconds.
- If a failure is reported, the UI immediately displays:
  1. A real-time toast alert with the exact reason.
  2. A red **`Failed in n8n`** badge in the post history.
  3. The raw JSON diagnostics in the **Payload Inspector**.

### 3. Instagram Aspect-Ratio Normalization
Instagram's Graph API strictly rejects images whose aspect ratios fall outside the range of **4:5 (0.8) to 1.91:1**.
- The `Get Image Dimensions` node reads `size.width` and `size.height`.
- The `Edit Image` node computes symmetric horizontal or vertical border padding:
  ```javascript
  borderWidth:  Math.max(0, Math.round((1280 - $json.size.width) / 2))
  borderHeight: Math.max(0, Math.round((720 - $json.size.height) / 2))
  ```
- The padded image is re-uploaded via `POST /api/upload` and published without API rejection.

---

## 5. Importing & Configuring the n8n Workflow

1. Open your n8n workspace.
2. Go to **Workflows** > Click the **⋮ (three dots)** menu > **Import from File...**
3. Select `workflow.json` from this repository.
4. Update the endpoint URLs:
   - In the **Get Request in ScatterFlow Site** node, replace `https://your-domain.com/` with your active tunnel URL from Terminal 2.
   - In the **Send Error Post in ScatterFlow Site** node, replace `https://your-domain.com/` with your active tunnel URL.
   - In the **HTTP Request2** node, replace `https://your-domain.com/api/upload` with your active tunnel URL.
5. Configure credentials:
   - **Facebook Graph API**: Select your Facebook Page access token credential.
   - **Instagram Node**: Enter your Instagram Account ID.
   - **Threads Nodes**: Replace `YOUR_THREADS_ACCESS_TOKEN` in the query parameters.
6. Activate or test your workflow!

---

## 6. Project Structure

```text
supermulti-media-n8n-content/
├── .gitignore              # Ignores node_modules, temp files, and uploaded media
├── README.md               # Complete architecture, terminal flow, and workflow guide
├── workflow.json           # Production-ready n8n multi-platform pipeline export
├── package.json            # Node.js dependencies (express, cors, multer) & scripts
├── package-lock.json       # Locked dependency tree
├── server.js               # Express backend bridge, content-negotiator & upload server
├── index.html              # ScatterFlow Studio frontend interface
├── style.css               # Modern dark-mode UI styling and layout
├── app.js                  # Frontend state machine, queue manager, and live telemetry
├── posts_queue.json        # Persistent queue file for queued posts
├── NOTES.md                # Architectural notes and reference documentation
└── uploads/                # Local directory for uploaded media assets
    └── .gitkeep            # Ensures directory tracking in git
```

---

## 7. Troubleshooting & FAQ

| Problem | Cause | Resolution |
| :--- | :--- | :--- |
| `EADDRINUSE: address already in use :::3000` | Another process is occupying port 3000. | Run `netstat -ano \| findstr :3000` and kill it with `taskkill /F /PID <PID>`. |
| n8n HTTP Request times out | Terminal 2 closed or tunnel URL expired. | Ensure Terminal 2 is running and update the URL in n8n. |
| Localtunnel returns HTML instead of JSON | Localtunnel's reminder splash screen intercepted the call. | Add header `Bypass-Tunnel-Reminder: true` in n8n's HTTP Request node, or switch to Cloudflare Tunnel. |
| Browser shows raw JSON instead of the UI | Content negotiation failed to detect browser navigation. | Ensure you visit `http://localhost:3000/` or `http://localhost:3000/app` directly in your browser. |
| Instagram rejects image upload | Aspect ratio is not between 4:5 and 1.91:1. | Ensure the `Get Image Dimensions` and `Edit Image` nodes in the workflow are active. |

---

## 8. License

This project is licensed under the [MIT License](LICENSE). Contributions, bug reports, and feature requests are welcome!
