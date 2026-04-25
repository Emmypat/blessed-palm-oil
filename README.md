# Rosemary Cement Depot — Business Manager

A full-stack business management system built for a cement retailer. Handles inventory, sales, receivables, receipts, and customer management — with dual-control security, offline capability, and a mobile-first PWA experience.

Live at **https://d2b423q28erzy0.cloudfront.net**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT  (Browser / PWA)                     │
│                                                                 │
│   React 19 + Vite · Tailwind CSS · TanStack Query               │
│   Service Worker (Workbox) · IndexedDB offline queue            │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS CloudFront  (CDN)                        │
│                    eu-west-1 · TLS 1.2+                         │
│                                                                 │
│   Static assets (JS/CSS/HTML) ◄── S3 bucket  (origin)          │
│   API requests  ─────────────────► API Gateway  (origin)       │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AWS API Gateway  (REST)                        │
│                  eu-west-1 · /prod stage                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ AWS_PROXY integration
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               AWS Lambda — rosemary-cement-api                  │
│               Python 3.12 · 512 MB · 60 s timeout              │
│                                                                 │
│   FastAPI (ASGI via Mangum adapter)                             │
│   SQLAlchemy 2.0 ORM · pg8000 PostgreSQL driver                 │
│   JWT authentication (python-jose) · bcrypt passwords           │
│   SNS publish for async receipt generation                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Private VPC
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            AWS RDS PostgreSQL 16  (db.t3.micro)                 │
│            eu-west-1 · Private subnet · 7-day backups           │
└─────────────────────────────────────────────────────────────────┘

Async receipt path:
Lambda ──SNS──► Lambda (receipt handler) ──► SES email + S3 PDF
```

---

## Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | React 19 | Component model, large ecosystem |
| Build tool | Vite 8 | Fast HMR, ESM-native, tree-shaking |
| Styling | Tailwind CSS 4 | Utility-first, no runtime CSS overhead |
| Data fetching | TanStack Query v5 | Declarative cache, background refresh, optimistic mutations |
| Forms | React Hook Form | Uncontrolled inputs, minimal re-renders |
| Charts | Recharts | Composable, SVG-based, responsive |
| PWA | vite-plugin-pwa + Workbox | Service worker, offline cache, installable manifest |
| Offline queue | IndexedDB via `idb` | Persists pending sales across page reloads |
| Icons | Lucide React | Tree-shakeable SVG icon set |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| Language | Python 3.12 | Rapid development, first-class AWS SDK support |
| Framework | FastAPI | Async, automatic OpenAPI docs, Pydantic validation |
| ASGI adapter | Mangum | Bridges FastAPI ↔ Lambda event/response format |
| ORM | SQLAlchemy 2.0 | Type-safe mapped columns, `create_all` for zero-migration deploys |
| DB driver | pg8000 | Pure-Python PostgreSQL driver — no C extensions needed in Lambda |
| Auth | JWT (python-jose) + passlib/bcrypt | Stateless tokens, industry-standard password hashing |

### Infrastructure (AWS · eu-west-1)
| Service | Role |
|---|---|
| **Lambda** | Serverless API — zero idle cost, auto-scales |
| **API Gateway** | REST endpoint, SSL termination, request throttling |
| **RDS PostgreSQL 16** | Relational data store, ACID transactions, automated backups |
| **CloudFront** | CDN for frontend assets, caches at edge, custom domain ready |
| **S3** (×2) | Frontend static hosting · Receipt PDF storage |
| **SES** | Transactional email — customer receipts |
| **SNS** | Decouples receipt generation from sale creation (async) |
| **CloudFormation** | Full infrastructure-as-code in `infrastructure.yaml` |

---

## Key Features & Design Decisions

### Dual-Control (Maker-Checker) Security
Every sensitive financial operation requires a **second user** to approve before it takes effect — a pattern common in banking and finance to prevent fraud and errors.

- **Inventory adjustments** — stock changes are queued as `pending`; a different user must approve or reject. A user cannot approve their own request.
- **Sales verification** — every recorded sale must be verified by a user other than the one who created it. Unverified sales are clearly flagged in the UI.

The enforcement is server-side: `requested_by != current_user` is checked on every approve/verify endpoint.

### Offline-First Sales Recording
Sales recorded without internet connectivity are stored in **IndexedDB** on the device. When the connection is restored the app automatically replays them against the API in chronological order. The UI adapts in real-time:

- Submit button changes to *"Save Offline"* when `navigator.onLine === false`
- Amber sync banner shows pending count with a *"Sync now"* button
- Green confirmation banner appears after a successful sync

Inventory adjustments and approvals are intentionally **online-only** — dual-control requires two connected users, and offline stock mutations could produce negative stock on sync.

### Progressive Web App (PWA)
Fully installable on Android and iOS without an app store:
- Web App Manifest with `display: standalone` (no browser chrome when installed)
- Workbox service worker pre-caches the app shell for instant loads
- `NetworkFirst` strategy for API requests (serves stale cache if offline)
- iOS safe-area insets on the bottom navigation bar (notch/home-bar support)
- Bottom tab bar on mobile mirrors native app navigation patterns

### User Management & Access Control
- 8 named staff accounts seeded automatically on first Lambda cold start
- Initial password `Password123` with **forced change** enforced on first login
- Default password cannot be reused (validated server-side)
- Passwords hashed with **bcrypt** (never stored or logged)
- JWT bearer tokens with 12-hour expiry, validated on every request
- Seed function is **idempotent** — safe to re-run on every deploy

### Schema Evolution Without Alembic
Rather than maintaining migration files, the app uses:
1. `Base.metadata.create_all(bind=engine)` on startup for additive schema changes
2. A targeted `inspect(engine).get_columns() → ALTER TABLE ADD COLUMN` pattern for columns that must be added to existing tables

This keeps the Lambda cold-start simple and eliminates migration state management for a small-team project.

---

## Project Structure

```
cement-business/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, startup seeding, schema migrations
│   │   ├── db.py              # SQLAlchemy engine + session factory
│   │   ├── config.py          # Pydantic settings (env vars)
│   │   ├── models/            # ORM models: User, Sale, SaleItem, Product,
│   │   │                      #   Customer, Receivable, Receipt, Payment,
│   │   │                      #   InventoryChange
│   │   ├── routers/           # Route handlers: auth, inventory, sales,
│   │   │                      #   customers, receivables, receipts, dashboard
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── utils/             # auth helpers (JWT/bcrypt), PDF, email
│   ├── requirements.txt
│   └── template.yaml          # AWS SAM template (alternative deploy path)
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, Inventory, NewSale, SalesHistory,
│   │   │                      #   Receivables, Receipts, Customers, Login
│   │   ├── components/        # Layout (sidebar + bottom nav + sync banner)
│   │   ├── context/           # AuthContext (JWT session)
│   │   │                      # SyncContext (offline queue state + auto-sync)
│   │   ├── services/          # Axios API client with JWT interceptor
│   │   └── utils/             # formatCurrency, groupByDay, offlineQueue (IDB)
│   ├── public/                # PWA icons (192 × 192, 512 × 512)
│   ├── index.html             # Meta tags incl. iOS PWA directives
│   ├── vite.config.js         # Vite + vite-plugin-pwa config
│   └── package.json
└── infrastructure.yaml        # CloudFormation stack: all AWS resources
```

---

## Running Locally

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create .env
cat > .env <<EOF
JWT_SECRET_KEY=dev-secret-change-me
DATABASE_URL=sqlite:///./cementtrack.db
ENVIRONMENT=development
EOF

uvicorn app.main:app --reload
# API: http://localhost:8000
# Swagger docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install

# Create .env.local
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev
# App: http://localhost:5173
```

---

## Deploying to AWS

### Prerequisites
- AWS CLI configured (`aws configure`)
- S3 bucket for Lambda packages: `cementtrack-lambda-<account-id>`
- Existing VPC + subnets

### 1 — Deploy infrastructure (first time)
```bash
aws cloudformation deploy \
  --template-file infrastructure.yaml \
  --stack-name cementtrack \
  --parameter-overrides DBPassword=<secret> VpcId=<vpc-id> \
  --capabilities CAPABILITY_NAMED_IAM \
  --region eu-west-1
```

### 2 — Package and deploy Lambda
```bash
cd backend
pip install -r requirements.txt --target lambda_package
cd lambda_package && zip -r ../lambda.zip . && cd ..
zip -r lambda.zip app/

aws s3 cp lambda.zip s3://cementtrack-lambda-<account-id>/lambda.zip
aws lambda update-function-code \
  --function-name cementtrack-api \
  --s3-bucket cementtrack-lambda-<account-id> \
  --s3-key lambda.zip \
  --region eu-west-1
```

### 3 — Deploy frontend
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://cementtrack-frontend-<account-id>/ --delete
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> --paths "/*"
```

---

## Security Highlights

| Control | Implementation |
|---|---|
| Password storage | bcrypt hashing (never plaintext) |
| Session tokens | JWT HS256, 12-hour expiry |
| Forced password change | Server-side `must_change_password` flag |
| Dual-control | `requested_by ≠ reviewer` enforced on API |
| Database isolation | RDS in private VPC subnet, no public access |
| Transport security | HTTPS enforced at CloudFront + API Gateway |

---

## Author

**Emmanuel Patrick** · [emmypat4rl@gmail.com](mailto:emmypat4rl@gmail.com)
