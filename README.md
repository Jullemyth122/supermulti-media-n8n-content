# Multi-Platform Content Distribution Pipeline (n8n)

An automated social media engine that dispatches structured posts to Facebook, Threads, and Instagram via webhooks and scheduled triggers.

## Features
- **Centralized Ingestion:** Webhook / API polling supporting custom frontends.
- **Payload Sanitization:** Normalizes titles, body, and hashtag strings in JavaScript.
- **Dynamic Image Normalization:** Inspects aspect ratios and programmatically injects border padding to satisfy Instagram Graph API constraints (4:5 to 1.91:1) without failing executions.
- **Multi-Branch Distribution:** Automated routing to Facebook Pages, Threads, and Instagram Business.

## Prerequisites
- Self-hosted or Cloud **n8n** (v1.0+)
- Community node installed: `@mookielianhd/n8n-nodes-instagram`
- Meta Developer App with permissions:
  - `pages_manage_posts`
  - `pages_read_engagement`
  - `instagram_content_publish`
  - Threads Publishing API access

## Setup & Import
1. In n8n, click **Workflows** > **Import from File...** and select `workflows/multi-platform-publisher.json`.
2. Replace all instances of `https://your-domain.com` with your production backend or tunnel URL.
3. Configure your credentials:
   - Connect your **Facebook Graph API** account.
   - Connect your **Instagram** node credentials.
   - Update `YOUR_THREADS_ACCESS_TOKEN` inside the Threads HTTP nodes.
