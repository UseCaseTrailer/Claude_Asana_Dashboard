# altudo.co Executive Dashboard — Web App

Live Asana data · Vercel serverless · No build step required

---

## What this is

A hosted web application that serves the altudo.co PMO + Marketing Analytics
dashboard with **live Asana data** fetched on every load. Task actions
(complete, assign, set due date, comment) execute directly back into Asana
via the REST API — no copy-paste required.

**Architecture:**
```
Browser (public/index.html)
    ↕ fetch('/api/portfolios')
Vercel Serverless (api/portfolios.js)
    ↕ Asana REST API v1.0
Asana workspace (live data)
```

---

## Step 1 — Get your Asana Personal Access Token

1. Go to **https://app.asana.com/0/my-apps**
2. Click **Personal access tokens** → **Create new token**
3. Name it `altudo-dashboard` and click **Create token**
4. **Copy the token now** — you won't see it again
5. Keep it secret — it has full read/write access to your workspace

---

## Step 2 — Install prerequisites

You need Node.js 18+ and the Vercel CLI:

```bash
# Check Node version (need 18+)
node --version

# Install Vercel CLI globally
npm install -g vercel

# Verify
vercel --version
```

---

## Step 3 — Clone and set up the repo

```bash
# Clone the repo
git clone https://github.com/YOUR_ORG/altudo-dashboard.git
cd altudo-dashboard

# Install dependencies
npm install

# Create your local environment file
cp .env.example .env.local
```

Now open `.env.local` and paste your Asana PAT:
```
ASANA_PAT=your_token_here
ASANA_WORKSPACE_GID=1115662927527527
```

---

## Step 4 — Run locally

```bash
vercel dev
```

Open **http://localhost:3000** — the dashboard loads with live Asana data.
The green dot in the top bar confirms live mode. Amber dot = embedded static data.

To test the API directly:
```bash
# Health check
curl http://localhost:3000/api/health

# Portfolios (full dataset)
curl http://localhost:3000/api/portfolios | json_pp
```

---

## Step 5 — Deploy to Vercel

```bash
# Log in to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod
```

Vercel will:
1. Detect the serverless functions in `api/`
2. Deploy `public/index.html` as the frontend
3. Give you a URL like `https://altudo-dashboard.vercel.app`

**Set environment variables in Vercel:**
```bash
vercel env add ASANA_PAT
# Paste your token when prompted, select all environments

vercel env add ASANA_WORKSPACE_GID
# Enter: 1115662927527527
```

Or set them in the Vercel dashboard:
- Go to your project → Settings → Environment Variables
- Add `ASANA_PAT` and `ASANA_WORKSPACE_GID`
- Redeploy: `vercel --prod`

---

## Step 6 — Set a custom domain (optional)

In the Vercel dashboard:
1. Go to your project → Settings → Domains
2. Add `dashboard.altudo.co`
3. Add a CNAME record in your DNS: `dashboard → cname.vercel-dns.com`
4. Vercel provisions an SSL certificate automatically

---

## Step 7 — Add access control (recommended)

Right now your dashboard is public. To restrict to `@altudo.co` emails:

**Option A — Vercel Password Protection** (fastest, Vercel Pro plan):
- Project Settings → Security → Password Protection

**Option B — Cloudflare Access** (free for ≤50 users):
1. Add your domain to Cloudflare
2. Zero Trust → Access → Applications → Add
3. Set policy: Email domain is `altudo.co`
4. Anyone visiting `dashboard.altudo.co` must log in with Google

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check, confirms PAT is set |
| `/api/portfolios` | GET | All portfolios with projects and tasks |
| `/api/task-action` | POST | Execute a write action in Asana |

### Task action body

```json
{
  "action": "COMPLETE_TASK",
  "taskGid": "1234567890",
  "projectGid": "9876543210",
  "completed": true
}
```

Supported actions: `COMPLETE_TASK`, `ADD_COMMENT`, `ASSIGN_TASK`,
`UPDATE_DUE_DATE`, `RENAME_TASK`, `CREATE_TASK`

---

## Caching

API responses are cached for 60 seconds at the CDN edge (`s-maxage=60`),
with a 5-minute stale-while-revalidate window. This means:
- First request after 60s → fresh Asana data
- Subsequent requests → served from CDN (instant)
- Asana changes visible within ~60 seconds

To force a refresh, click **Refresh** in the dashboard header.

---

## Project structure

```
altudo-dashboard/
├── api/
│   ├── health.js          # Health check endpoint
│   ├── portfolios.js      # Main data endpoint (portfolios + tasks)
│   └── task-action.js     # Write endpoint (complete, assign, etc.)
├── lib/
│   └── asana.js           # Asana REST API helper
├── public/
│   └── index.html         # The dashboard (self-contained, 250KB)
├── .env.example           # Environment variable template
├── .gitignore
├── package.json
├── vercel.json            # Routing + cache headers config
└── README.md
```

---

## Troubleshooting

**Amber status dot / loading embedded data**
→ API is unreachable. Check `/api/health` — if 500, your PAT is missing or invalid.

**"ASANA_PAT environment variable not set"**
→ Run `vercel env add ASANA_PAT` and redeploy.

**Tasks load but actions don't execute**
→ Check browser console for network errors. POST to `/api/task-action` should return `{"ok":true}`.

**403 from Asana API**
→ PAT may have expired or been revoked. Generate a new one at https://app.asana.com/0/my-apps

**Rate limiting (429)**
→ Asana allows 1500 requests/minute. The dashboard fetches ~5-10 requests per load.
   If you have many portfolios, the parallel fetches may briefly spike. Increase the
   `s-maxage` in `vercel.json` to reduce fetch frequency.
