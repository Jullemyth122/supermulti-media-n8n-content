/**
 * Social Media Studio & n8n Bridge Server
 * Handles HTTP requests from n8n (GET/POST), serves frontend, and manages post queues.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
// Port 3000 matches n8n's HTTP Request nodes: http://localhost:3000/
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing & CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File storage for posts queue
const POSTS_FILE = path.join(__dirname, 'posts_queue.json');

function loadQueue() {
    try {
        if (fs.existsSync(POSTS_FILE)) {
            return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('[Queue] Error reading queue file:', err);
    }
    return [];
}

function saveQueue(queue) {
    try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(queue, null, 2), 'utf8');
    } catch (err) {
        console.error('[Queue] Error saving queue file:', err);
    }
}

// In-memory queue initialized from disk
let postQueue = loadQueue();

// In-memory telemetry for n8n callbacks and error reports
let latestCallback = null;
let callbackHistory = [];

// Static assets (style.css, app.js) served cleanly with no-cache headers for instant updates
app.use(express.static(path.join(__dirname), {
    index: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
}));

// Uploads directory for media assets served to n8n
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));


// Add at top with other requires
const multer = require('multer');

// Add after: app.use('/uploads', express.static(UPLOADS_DIR));
const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Keep same filename = same URL
    }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file received' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log(`[Upload] Saved: ${req.file.filename} → ${fileUrl}`);
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// --- 1. Root GET Handler (Serves UI to browsers, JSON to n8n) ---
app.get('/', (req, res) => {
    const acceptHeader = req.headers.accept || '';
    const userAgent = req.headers['user-agent'] || '';

    // If request has the bypass header, is from n8n/axios/curl, or asks for JSON -> ALWAYS return JSON
    const isN8nOrApi =
        Boolean(req.headers['bypass-tunnel-reminder']) ||
        acceptHeader.includes('application/json') ||
        userAgent.toLowerCase().includes('n8n') ||
        userAgent.toLowerCase().includes('axios') ||
        userAgent.toLowerCase().includes('node') ||
        userAgent.toLowerCase().includes('curl') ||
        userAgent.toLowerCase().includes('undici') ||
        req.query.format === 'json';

    // A real browser navigation has sec-fetch-dest: document and does NOT have the bypass header
    const isBrowser =
        !isN8nOrApi &&
        (req.headers['sec-fetch-dest'] === 'document' || req.headers['sec-fetch-mode'] === 'navigate') &&
        acceptHeader.includes('text/html');

    if (isBrowser) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res.sendFile(path.join(__dirname, 'index.html'));
    }

    // Programmatic call from n8n / API: Always return the post JSON
    console.log(`[n8n Polling] Returning JSON payload to ${req.ip} (UA: ${userAgent})`);

    // Reload latest queue from disk
    postQueue = loadQueue();

    // Return the active pending post, or the latest post in the queue
    const activePost = postQueue.find((p) => p.status === 'pending') || postQueue[0];

    if (activePost) {
        console.log(`[n8n Polling] Returning post: "${activePost.title}"`);
        const tagsString = (activePost.tags || []).map((t) => '#' + String(t).replace(/^#/, '')).join(' ');
        return res.json({
            // Matches $json.body.* in n8n expressions
            body: {
                ...activePost,
                tags_string: tagsString
            },
            // Matches top-level $json.* in n8n expressions
            ...activePost,
            tags_string: tagsString
        });
    }

    // Fallback if no posts exist in queue
    res.json({
        status: 'idle',
        message: 'No pending posts in queue. Submit a post from the web studio to activate.',
        timestamp: new Date().toISOString(),
        body: {
            platforms: [],
            description: '',
            title: '',
            tags: [],
            tags_string: '',
            postType: 'text',
            hasMedia: false,
            mediaUrl: null,
            mediaUrls: []
        },
        platforms: [],
        description: '',
        title: '',
        tags: [],
        tags_string: '',
        postType: 'text',
        hasMedia: false,
        mediaUrl: null,
        mediaUrls: []
    });
});

// Dedicated JSON API routes as reliable targets for n8n
app.get(['/api/posts/active', '/api/posts/latest', '/api/post'], (req, res) => {
    postQueue = loadQueue();
    const activePost = postQueue.find((p) => p.status === 'pending') || postQueue[0];
    if (activePost) {
        return res.json({
            body: activePost,
            ...activePost
        });
    }
    return res.json({ status: 'idle', body: { platforms: [], tags: [], postType: 'text' } });
});

// --- 2. Root POST Handler (Used by n8n HTTP Request1 node: POST http://localhost:3000/) ---
app.post('/', (req, res) => {
    console.log(`[n8n Callback] Received POST / from n8n:`, req.body);

    const body = req.body || {};
    const isError =
        body.status === 'failed' ||
        Boolean(body.error) ||
        Boolean(body.reason);

    latestCallback = {
        id: Date.now().toString(),
        receivedAt: new Date().toISOString(),
        isError: isError,
        status: body.status || (isError ? 'failed' : 'acknowledged'),
        error: body.error || null,
        reason: body.reason || null,
        payload: body
    };

    callbackHistory.unshift(latestCallback);
    if (callbackHistory.length > 50) callbackHistory.pop();

    // If n8n posted back an update, mark the active pending post
    if (postQueue.length > 0) {
        const active = postQueue.find((p) => p.status === 'pending');
        if (active) {
            active.status = isError ? 'failed' : (body.status || 'processed');
            active.errorReason = body.reason || body.error || null;
            active.processedAt = body.timestamp || new Date().toISOString();
            saveQueue(postQueue);
            console.log(`[Queue] Marked post "${active.title}" as ${active.status}.`);
        }
    }

    res.json({
        success: true,
        message: 'n8n HTTP Request1 callback acknowledged successfully.',
        received: req.body,
        serverTime: new Date().toISOString()
    });
});

// Telemetry endpoint for frontend to pull real-time n8n callbacks and errors
app.get('/api/callbacks', (req, res) => {
    res.json({
        latest: latestCallback,
        history: callbackHistory
    });
});

// Clear callback history
app.delete('/api/callbacks', (req, res) => {
    latestCallback = null;
    callbackHistory = [];
    res.json({ success: true, message: 'Callback telemetry cleared.' });
});

// --- 3. Post Queue Management Endpoints ---

// Enqueue a new post from Web Studio or external script
app.post('/api/posts', (req, res) => {
    try {
        const postData = req.body || {};

        // Process and save any base64 media files to disk
        const savedMedia = [];
        if (Array.isArray(postData.media) && postData.media.length > 0) {
            postData.media.forEach((item, idx) => {
                if (item && item.base64) {
                    try {
                        const parts = item.base64.split(';base64,');
                        const base64Data = parts.length > 1 ? parts[1] : parts[0];
                        const cleanName = (item.name || `asset_${idx}.png`).replace(/[^a-zA-Z0-9._-]/g, '_');
                        const filename = `${Date.now()}_${cleanName}`;
                        const filepath = path.join(UPLOADS_DIR, filename);
                        fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

                        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
                        savedMedia.push({
                            name: item.name || filename,
                            filename: filename,
                            type: item.type || 'image/png',
                            size: item.size || 0,
                            url: fileUrl
                        });
                    } catch (mediaErr) {
                        console.error('[Upload] Error saving media asset:', mediaErr);
                    }
                }
            });
        }

        // Smart format guard: if postData says 'video' but all uploaded files are images, align to 'carousel' or 'image'
        let finalPostType = postData.postType || (savedMedia.length > 0 ? 'image' : 'text');
        if (savedMedia.length > 0) {
            const allImages = savedMedia.every((m) => m.type.startsWith('image/'));
            const anyVideo = savedMedia.some((m) => m.type.startsWith('video/'));

            if (finalPostType === 'video' && allImages) {
                finalPostType = savedMedia.length > 1 ? 'carousel' : 'image';
                console.log(`[Queue Guard] Auto-corrected postType from "video" to "${finalPostType}" because attachments are images.`);
            } else if (finalPostType === 'image' && anyVideo) {
                finalPostType = 'video';
                console.log(`[Queue Guard] Auto-corrected postType from "image" to "video" because attachment is a video.`);
            } else if (finalPostType === 'image' && savedMedia.length > 1) {
                finalPostType = 'carousel';
                console.log(`[Queue Guard] Auto-corrected postType from "image" to "carousel" because multiple images were attached.`);
            }
        }

        const newPost = {
            id: Date.now().toString(),
            title: postData.title || 'Untitled Post',
            description: postData.description || '',
            tags: Array.isArray(postData.tags) ? postData.tags : (postData.tags ? [postData.tags] : []),
            platforms: Array.isArray(postData.platforms) ? postData.platforms : ['tiktok', 'instagram', 'youtube', 'x'],
            postType: finalPostType,
            ctaLink: postData.ctaLink || null,
            media: savedMedia,
            mediaUrl: savedMedia.length > 0 ? savedMedia[0].url : null,
            mediaUrls: savedMedia.map((m) => m.url),
            hasMedia: savedMedia.length > 0,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        postQueue.push(newPost);
        saveQueue(postQueue);

        console.log(`[Queue] Added new post to queue: "${newPost.title}" (Media: ${savedMedia.length}, Total Queue: ${postQueue.length})`);
        res.json({ success: true, message: 'Post enqueued successfully.', post: newPost });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// View all queued posts
app.get('/api/posts', (req, res) => {
    res.json({
        total: postQueue.length,
        pending: postQueue.filter((p) => p.status === 'pending').length,
        posts: postQueue
    });
});

// Clear processed posts
app.delete('/api/posts', (req, res) => {
    postQueue = [];
    saveQueue(postQueue);
    res.json({ success: true, message: 'Queue cleared.' });
});

// Explicit UI routes
app.get(['/app', '/studio'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 5. Start HTTP Listener ---
app.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`🚀 Social Media Studio Server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to receive n8n HTTP Requests:`);
    console.log(`   • GET  http://localhost:${PORT}/   (n8n Schedule Trigger -> HTTP Request)`);
    console.log(`   • POST http://localhost:${PORT}/   (n8n HTTP Request1 callback)`);
    console.log(`   • POST http://localhost:${PORT}/api/posts (Enqueue post)`);
    console.log(`========================================================\n`);
});