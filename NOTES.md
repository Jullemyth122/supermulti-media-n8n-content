# Blueprint: Full-Stack Local Web App with Express Backend & Cloud n8n Bridge

This guide documents the complete process, architecture, and terminal commands to create, run, and connect a local web application (`index.html` + `server.js`) to a cloud-hosted automation platform (such as **Google Cloud n8n**) using **Localtunnel**.

---

## 1. System Architecture

```text
+-------------------------------------------------------------------------+
|                           LOCAL MACHINE                                 |
|                                                                         |
|  [ Frontend UI ]           [ Express Backend ]                          |
|  (index.html / app.js) ---> (server.js on Port 3000)                    |
|         |                          |                                    |
|         | (Optional direct post)   v                                    |
|         |                  [ Localtunnel Client ]                       |
|         |                  (npx localtunnel --port 3000)                |
+---------|--------------------------|------------------------------------+
          |                          | Public HTTPS Tunnel
          |                          | (e.g., https://your-subdomain.loca.lt)
          v                          v
+-------------------------------------------------------------------------+
|                   CLOUD PLATFORM (e.g. Google Cloud n8n)                |
|                                                                         |
|   [ Cloud n8n Workflow ]                                                |
|   - HTTP Request (GET)   ---> Pulls queued post data from laptop        |
|   - Bypass Header        ---> Bypass-Tunnel-Reminder: true              |
|   - Tag Sanitizer        ---> Maps tags safely without crashing         |
|   - Webhook Node (POST)  ---> Receives direct binary files ($binary)    |
|   - Status Callback      ---> Reports publish status back to backend    |
+-------------------------------------------------------------------------+
```

---

## 2. Terminal Commands Playbook

### Step A: Project Scaffolding
Run these commands in your project folder to set up a clean Node.js environment:

```bash
# 1. Create a new directory and navigate into it
mkdir my-automation-project
cd my-automation-project

# 2. Initialize package.json
npm init -y

# 3. Install core dependencies (Express for server, CORS for browser calls)
npm install express cors

# 4. (Optional) Install nodemon for live server reloading during development
npm install -D nodemon
```

### Step B: Starting the Backend Server
Open **Terminal 1** in the project directory:

```bash
# Recommended: Start with auto-reload (restarts automatically whenever server.js changes)
npm run dev
# (or directly: node --watch --watch-path=server.js server.js)

# Direct manual start with Node
node server.js

# Or start standard production server via npm
npm start
```

Your server will be running on:
- `http://localhost:3000` (Local machine)
- `http://127.0.0.1:3000`

### Step C: Exposing Port 3000 to the Public Internet
Open **Terminal 2** in the same project directory:

```bash
# Expose port 3000 using Localtunnel (downloads and runs automatically)
npx -y localtunnel --port 3000

# Optional: Request a specific custom subdomain
npx -y localtunnel --port 3000 --subdomain my-custom-app-bridge
```

Output will display:
```text
your url is: https://your-subdomain.loca.lt
```

> **Important**: Keep Terminal 2 open. If you close Terminal 2, the public URL will immediately stop working and cloud n8n will time out.

### Step D: Diagnostic and Process Management Commands (Windows PowerShell)

```bash
# Check if port 3000 is occupied and find its Process ID (PID)
netstat -ano | findstr :3000

# Kill a stuck process on port 3000 (replace <PID> with the actual number)
taskkill /F /PID <PID>

# View your machine's private local network IP
ipconfig

# Test your local server from terminal
curl http://localhost:3000/
```

---

## 3. Core Backend Pattern: `server.js`

When one server needs to serve **both** the human UI in Chrome/Brave and programmatic JSON data to cloud n8n on `GET /`, use **Content Negotiation**:

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for external calls
app.use(cors());

// Parse incoming JSON payloads and URL-encoded forms with generous limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files (CSS, JS, assets) without overriding the root route
app.use(express.static(path.join(__dirname), { index: false }));

// In-memory or file-backed storage queue
let latestPayload = {
  status: 'ready',
  timestamp: new Date().toISOString(),
  body: {
    title: 'Sample Automation Headline',
    description: 'Generated caption text',
    platforms: ['tiktok', 'instagram', 'youtube'],
    tags: ['automation', 'dev', 'content', 'workflow'],
    postType: 'video'
  }
};

// --------------------------------------------------------------------------
// 1. SMART ROOT GET: Browser UI vs Automation API
// --------------------------------------------------------------------------
app.get('/', (req, res) => {
  const acceptHeader = req.headers.accept || '';
  
  // Detect if the incoming request is an actual web browser navigating to the page
  const isBrowserNavigation =
    req.headers['sec-fetch-dest'] === 'document' ||
    req.headers['sec-fetch-mode'] === 'navigate' ||
    req.headers['upgrade-insecure-requests'] === '1' ||
    acceptHeader.includes('text/html');

  if (isBrowserNavigation) {
    // Deliver the HTML frontend to the user
    return res.sendFile(path.join(__dirname, 'index.html'));
  }

  // Deliver raw JSON to cloud n8n or API fetchers
  return res.json(latestPayload);
});

// Explicit frontend routes as reliable fallbacks
app.get(['/app', '/studio'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --------------------------------------------------------------------------
// 2. API ENDPOINTS: Submitting and Reading Post Data
// --------------------------------------------------------------------------
app.post('/api/posts', (req, res) => {
  latestPayload = {
    status: 'pending',
    timestamp: new Date().toISOString(),
    body: req.body
  };
  console.log('[New Post Queued]:', latestPayload.body.title);
  return res.json({ success: true, message: 'Payload queued successfully', data: latestPayload });
});

app.get('/api/posts', (req, res) => {
  return res.json(latestPayload);
});

// --------------------------------------------------------------------------
// 3. n8n CALLBACK ENDPOINT: Receive execution results back from the cloud
// --------------------------------------------------------------------------
app.post('/', (req, res) => {
  console.log('[Callback from n8n Received]:', req.body);
  return res.json({
    received: true,
    serverTimestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
```

---

## 4. Frontend Integration Pattern: `index.html` & `app.js`

### Form Submission: Direct n8n Webhook vs Local Queue
You have two architectural choices for passing data from your UI:

#### Option 1: Direct Webhook Stream (Recommended for Binary Videos/Photos)
- Send a `multipart/form-data` POST request directly to the n8n Webhook URL.
- n8n receives the text in `$json.body` and media in `$binary.data`.
- Sample JavaScript snippet:
```javascript
const formData = new FormData();
formData.append('title', document.getElementById('titleInput').value);
formData.append('description', document.getElementById('descInput').value);

// Append tags as separate fields or JSON string
tagsArray.forEach(tag => formData.append('tags[]', tag.replace(/^#/, '')));

// Attach media files
if (selectedFile) {
  formData.append('data', selectedFile); // n8n assigns this to $binary.data
}

// Send to n8n Webhook
const response = await fetch(n8nWebhookUrl, {
  method: 'POST',
  body: formData
});
```

#### Option 2: Local Queue + Cloud n8n Polling (GET)
- UI posts JSON to `http://localhost:3000/api/posts`.
- Cloud n8n triggers on a schedule or manual trigger, then makes an **HTTP Request (GET)** to `https://your-subdomain.loca.lt/`.

---

## 5. Cloud n8n Setup & Mandatory Rules

### Rule 1: The Localtunnel Bypass Header
Localtunnel displays a human anti-abuse landing page on first visit. Automated requests from n8n will receive this HTML page instead of JSON unless you supply this header:

In n8n's **`HTTP Request`** Node:
1. **Method**: `GET`
2. **URL**: `https://your-subdomain.loca.lt/`
3. Under **Options / Headers**:
   - **Header Name**: `Bypass-Tunnel-Reminder`
   - **Header Value**: `true`

### Rule 2: Why Private IPs Fail in Cloud n8n
- Do **not** use `http://localhost:3000` or `http://127.0.0.1:3000` in cloud n8n. In the cloud, `localhost` means the cloud VM itself.
- Do **not** use private LAN IPs like `http://192.168.1.X:3000`. Private IPs are not accessible over the public internet.
- **Always** use the Localtunnel URL (`https://your-subdomain.loca.lt`).

### Rule 3: Crash-Proof Hashtag Expression in n8n
In n8n expressions, if `tags` is a single string instead of an array, `.map()` will throw `map is not a function`. Use this safe formula:

```javascript
{{ [].concat($json.body?.tags || $json.tags || []).map(t => '#' + String(t).replace(/^#/, '')).join(' ') }}
```

### Rule 4: Handling Binary Media in n8n
- **HTTP Request (GET)** returns text JSON. `$binary` will be empty.
- If your workflow has an `If` condition checking `Boolean($binary && $binary.data)`, use the **Webhook (POST)** node or add an extra HTTP Request step in n8n with **Response Format: File** to download the media asset.

### Rule 5: How Cloud n8n Errors & Callbacks Pass to the Frontend
When an automation runs in cloud n8n, your workflow can report errors (e.g. `Validation failed in n8n`) or success back to your laptop:
1. **n8n Postback (`HTTP Request1`)**:
   - The `false` or failure branch in n8n makes a `POST` request to `https://your-subdomain.loca.lt/` containing the error payload (e.g. `{ "status": "failed", "error": "Validation failed in n8n", "reason": "..." }`).
2. **Backend Storage (`server.js`)**:
   - `server.js` listens on `POST /`, saves the payload to `latestCallback`, and exposes it via `GET /api/callbacks`.
3. **Frontend Real-Time Telemetry (`app.js`)**:
   - `app.js` polls `GET /api/callbacks` every 3 seconds.
   - When a new callback with `status: "failed"` is detected, the frontend pops an immediate error notification toast, adds the failure event to the **History** tab with a red **`Failed in n8n`** badge, and displays the full JSON error in the **Payload Inspector**.


---

## 6. End-to-End Testing Checklist

1. [ ] **Start Backend**: Run `node server.js`. Verify `http://localhost:3000` opens the UI in your browser.
2. [ ] **Start Tunnel**: Run `npx -y localtunnel --port 3000`. Copy the generated `https://xxx.loca.lt` URL.
3. [ ] **Check Public Route**: Open `https://xxx.loca.lt/` in your browser. Complete the tunnel verification page if prompted. Confirm the UI renders.
4. [ ] **Configure n8n**:
   - In your n8n `HTTP Request` node, paste `https://xxx.loca.lt/`.
   - Add header: `Bypass-Tunnel-Reminder: true`.
5. [ ] **Execute Node**: Click **Execute step** or **Test step** in n8n.
   - Verify n8n receives JSON output containing `status`, `body.title`, `body.tags`, etc.
   - Verify n8n does **not** get stuck in an infinite loading state.

---

## 7. Common Pitfalls & Rapid Solutions

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| `Error: listen EADDRINUSE: address already in use :::3000` | Another node process is already using port 3000. | Run `netstat -ano \| findstr :3000` to find the PID, then kill it with `taskkill /F /PID <PID>`. |
| n8n HTTP Request is stuck loading forever | Using `localhost` or `192.168.x.x` from cloud, or the Localtunnel terminal closed. | Use the active `https://xxx.loca.lt` URL and verify Terminal 2 is still running. |
| n8n receives HTML webpage instead of JSON | Localtunnel's reminder splash screen intercepted the request. | Add the header `Bypass-Tunnel-Reminder: true` in n8n's HTTP Request node. |
| Browser shows raw JSON instead of `index.html` | Missing browser detection in `GET /` route. | Use the smart browser check (`sec-fetch-dest: document` or `accept: text/html`) shown in Section 3. |
| Tags fail with `tags.map is not a function` | A single tag was passed as a string rather than an array. | Use `[].concat(tags \|\| [])` before calling `.map()`. |
| Double-click toggling checkboxes or buttons in UI | An `<input type="checkbox">` wrapped inside a `<label>` generates two click events. | Use native `<button type="button">` chips with JavaScript state management. |
