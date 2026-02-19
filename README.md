# Raipur Interdepartmental Portal

Official interdepartmental coordination portal for District Administration, Raipur — Government of Chhattisgarh.

Departments can issue notices to each other, track action statuses, and upload replies. The admin has a central dashboard to monitor all activity across the district.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT + bcryptjs |
| File uploads | Multer |
| Security | Helmet, express-rate-limit, CORS whitelist |
| Reverse proxy | Nginx (TLS termination, rate limiting, gzip) |
| Containerisation | Docker + Docker Compose |
| Tests | Jest + Supertest |

---

## Project Structure

```
raipur-interdepartmental/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── style.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── main.js
│   │   ├── login.js
│   │   ├── admin.js
│   │   ├── dashboard.js
│   │   └── compose.js
│   └── pages/
│       ├── login.html
│       ├── admin.html
│       ├── dashboard.html
│       ├── notice-compose.html
│       ├── notices.html
│       ├── departments.html
│       ├── officials.html
│       └── contact.html
├── backend/
│   ├── server.js
│   ├── app.js
│   ├── .env.example
│   ├── database/
│   │   ├── db.js
│   │   └── seed.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── departments.js
│   │   ├── notices.js
│   │   ├── notices-auth.js
│   │   ├── users.js
│   │   └── contact.js
│   ├── data/
│   │   ├── departments.json
│   │   ├── notices.json
│   │   └── officials.json
│   ├── tests/
│   └── package.json
├── nginx/
│   ├── nginx.conf
│   └── ssl/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── .dockerignore
├── .gitignore
├── startup.sh              # One-command deploy
├── stop.sh                 # Graceful shutdown + backup
└── README.md
```

---

## Quick Start (Development)

### Prerequisites
- Node.js v18+
- npm

### Install & Run

```bash
cd backend
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET (32+ characters)
npm install
npm run seed    # Seeds dev data (blocks in production)
npm run dev     # Starts with nodemon auto-reload
```

Server runs at `http://localhost:3000`.

### Run Tests

```bash
cd backend
npm test
```

---

## Production Deployment

### Option A: Docker Compose (Recommended)

This is the fastest path to a production deployment with Nginx reverse proxy, TLS, rate limiting, and gzip — all pre-configured. Two shell scripts handle the entire lifecycle.

#### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2+
- A domain name pointed at your server (for production)
- TLS certificate and private key (or use `--self-signed` for testing)

#### Quick start (3 commands)

```bash
git clone <repo-url>
cd raipur-interdepartmental

# First deploy — generates .env, self-signed cert, builds, seeds demo data:
./startup.sh --self-signed --seed

# That's it. Portal is live at https://localhost
```

#### Production deploy (with real TLS)

```bash
git clone <repo-url>
cd raipur-interdepartmental

# 1. Get your TLS cert (Let's Encrypt example):
sudo certbot certonly --standalone -d your-domain.gov.in
cp /etc/letsencrypt/live/your-domain.gov.in/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.gov.in/privkey.pem nginx/ssl/

# 2. Update nginx server_name:
#    Edit nginx/nginx.conf → replace "server_name _;" with "server_name your-domain.gov.in;"

# 3. (Optional) Set ALLOWED_ORIGINS in backend/.env after first run:
#    ALLOWED_ORIGINS=https://your-domain.gov.in

# 4. Start with seed for first deploy:
./startup.sh --seed
```

#### startup.sh

The startup script handles everything automatically:

```
./startup.sh [OPTIONS]

Options:
  --seed          Seed database with demo data (first deploy only)
  --rebuild       Force full Docker image rebuild
  --self-signed   Generate a self-signed SSL cert (for testing)
  --help          Show help
```

What it does:
1. Checks Docker and Docker Compose are installed and running
2. Creates `backend/.env` from template if missing (auto-generates JWT_SECRET)
3. Validates JWT_SECRET is present and strong
4. Checks SSL certificates (or generates self-signed with `--self-signed`)
5. Builds Docker images and starts containers
6. Seeds the database if `--seed` is passed
7. Runs a health check and prints status

#### stop.sh

```
./stop.sh [OPTIONS]

Options:
  --backup   Backup database and uploads before stopping
  --clean    Stop AND delete all data (containers, volumes, images)
  --help     Show help
```

Examples:

```bash
# Graceful stop (data preserved in Docker volumes)
./stop.sh

# Backup then stop
./stop.sh --backup

# Full teardown — deletes everything (asks for confirmation)
./stop.sh --clean
```

#### Common operations

```bash
# View live logs
docker compose logs -f
docker compose logs -f app
docker compose logs -f nginx

# Check status
docker compose ps

# Restart after config changes
docker compose restart

# Rebuild after code changes
./stop.sh && ./startup.sh --rebuild

# Access app container shell
docker compose exec app sh

# Manual database backup
docker cp raipur-portal-app:/app/backend/database/portal.db backup_$(date +%Y%m%d).db

# Manual uploads backup
docker cp raipur-portal-app:/app/backend/uploads ./uploads-backup
```

---

### Option B: Docker Compose (Development — No SSL)

For local Docker testing without nginx/TLS:

```bash
cp backend/.env.example backend/.env
# Edit .env with a JWT_SECRET

docker compose -f docker-compose.dev.yml up --build
```

App is available at `http://localhost:3000`.

---

### Option C: Bare Metal / VPS (No Docker)

#### Prerequisites
- Node.js v18+ and npm
- Nginx installed on the host
- TLS certificate (Let's Encrypt recommended)

#### Step 1 — Install and configure

```bash
git clone <repo-url>
cd raipur-interdepartmental/backend
npm ci --omit=dev
cp .env.example .env
# Edit .env — set JWT_SECRET, NODE_ENV=production, ALLOWED_ORIGINS
```

#### Step 2 — Seed the database (first time only)

```bash
NODE_ENV=development node database/seed.js
```

#### Step 3 — Set up a process manager

```bash
npm install -g pm2
pm2 start server.js --name raipur-portal
pm2 save
pm2 startup   # Follow the output to enable on boot
```

#### Step 4 — Configure Nginx

Copy and adapt `nginx/nginx.conf` to `/etc/nginx/nginx.conf` (or a site-specific file in `/etc/nginx/sites-available/`). Key changes:

- Replace `proxy_pass http://app:3000` with `proxy_pass http://127.0.0.1:3000` (since the app runs on the host, not in Docker).
- Update `server_name` to your domain.
- Update certificate paths to your Let's Encrypt paths.

```bash
sudo nginx -t          # Validate config
sudo systemctl reload nginx
```

#### Step 5 — Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Internet                      │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────▼────────┐
              │   Nginx (:443)  │  TLS termination
              │   (:80 → 301)  │  Rate limiting
              │                 │  Gzip, security headers
              └────────┬────────┘
                       │ proxy_pass
              ┌────────▼────────┐
              │  Node/Express   │  JWT auth, business logic
              │   (:3000)      │  API + static frontend
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │    SQLite DB    │  portal.db (WAL mode)
              └─────────────────┘
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt with cost factor 12 |
| Authentication | JWT with 8-hour expiry, verified on every request |
| Active-user check | Auth middleware queries DB to confirm `is_active` on each request |
| Rate limiting | Express-level (login: 10/15min, contact: 5/15min) + Nginx-level |
| Security headers | Helmet (CSP, X-Frame-Options, HSTS, nosniff, etc.) |
| CORS | Restricted to `ALLOWED_ORIGINS` whitelist |
| XSS prevention | All dynamic values escaped via `esc()` helper |
| SQL injection prevention | Parameterised queries with `?` placeholders everywhere |
| File uploads | MIME whitelist (PDF, JPEG, PNG, WebP), 10 MB limit, force-download headers |
| Error handling | Centralized handler — no stack traces in production |
| TLS | Nginx-terminated, TLS 1.2+, HSTS |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors: 'none'` |
| Graceful shutdown | SIGTERM/SIGINT handlers close HTTP server and DB cleanly |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | Token signing secret (min 32 chars) |
| `PORT` | No | `3000` | Server listen port |
| `NODE_ENV` | No | `development` | `production` for prod behaviour |
| `ALLOWED_ORIGINS` | No | (all same-origin) | Comma-separated CORS origins |
| `SEED_ADMIN_PASSWORD` | No | — | Override admin password during seeding |
| `SEED_DEPT_PASSWORD` | No | — | Override dept passwords during seeding |

---

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | List all departments |
| GET | `/api/departments/:id` | Get a single department |
| GET | `/api/departments/officials/all` | Get Who's Who list |
| GET | `/api/notices` | Public notices list |
| POST | `/api/contact` | Submit contact form (rate limited) |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login — returns JWT (rate limited) |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/change-password` | Change own password |

### Portal (authenticated)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/portal/notices/summary` | Admin | Dashboard totals |
| GET | `/api/portal/notices/all` | Admin | All notices |
| GET | `/api/portal/notices/monthly-stats` | Admin | Completed actions by month |
| GET | `/api/portal/notices/inbox` | Dept | Notices addressed to your dept |
| GET | `/api/portal/notices/outbox` | Dept | Notices sent by your dept |
| POST | `/api/portal/notices` | Dept | Create a new notice |
| GET | `/api/portal/notices/:id` | Both | Notice detail |
| PATCH | `/api/portal/notices/:id/status` | Dept | Update status (Noted/Completed) |
| GET | `/api/portal/users` | Admin | List all users |
| POST | `/api/portal/users` | Admin | Create a new user |
| PATCH | `/api/portal/users/:id/status` | Admin | Activate/deactivate user |
| PATCH | `/api/portal/users/:id/password` | Admin | Reset a user's password |
| POST | `/api/departments` | Admin | Create a new department |

---

## Running Tests

Tests use an in-memory SQLite database — no production data is affected.

```bash
cd backend
npm test
```

| File | Routes Tested | Tests |
|------|--------------|-------|
| `auth.test.js` | `/api/auth/login`, `/me`, `/change-password` | 13 |
| `departments.test.js` | `/api/departments` | 8 |
| `notices.test.js` | `/api/portal/notices/*` | 25 |
| `users.test.js` | `/api/portal/users/*` | 18 |

---

## Backup & Restore

### Database backup

```bash
# Docker
docker compose exec app cat /app/backend/database/portal.db > backup_$(date +%Y%m%d).db

# Bare metal
cp backend/database/portal.db backup_$(date +%Y%m%d).db
```

### Uploads backup

```bash
# Docker
docker compose cp app:/app/backend/uploads ./uploads-backup-$(date +%Y%m%d)

# Bare metal
cp -r backend/uploads/ uploads-backup-$(date +%Y%m%d)/
```

### Restore

```bash
# Stop the app first, then replace the database file and restart
docker compose down
docker compose cp backup_20260219.db app:/app/backend/database/portal.db
docker compose up -d
```

---

## TLS Certificate Renewal (Let's Encrypt)

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/your-domain.gov.in/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.gov.in/privkey.pem nginx/ssl/
docker compose restart nginx
```

Automate with a cron job:

```bash
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.gov.in/*.pem /path/to/project/nginx/ssl/ && cd /path/to/project && docker compose restart nginx
```

---

## License

Government of Chhattisgarh — District Administration Raipur.
