# Blessed Palm Oil — Business Manager

A full-stack business management system built for a palm oil retailer. Handles inventory, sales, receivables, receipts, and customer management — with dual-control security on every sensitive operation, offline capability, and a mobile-first PWA experience.

Live at **https://d3erw0uu4uv0oh.cloudfront.net**

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
│               AWS Lambda — blessedpalmoil-api                   │
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
Every sensitive operation requires a **second user** to approve before it takes effect — a pattern common in banking and finance to prevent fraud and accidental changes.

| Operation | Flow |
|---|---|
| Inventory stock adjustment | First user submits → second user approves/rejects |
| Inventory product edit | First user submits → second user approves/rejects |
| Product deletion | First user requests → second user approves/rejects |
| Sale verification | Recorded by one user → verified by a different user |
| Sale deletion | First user requests → second user approves/rejects |
| Record payment (receivable) | First user submits → second user approves/rejects |

Enforcement is server-side: `requested_by != current_user.username` is checked on every approve endpoint. A user can never approve their own request.

### Customer Management
- Any logged-in staff member can add or edit customer details
- **Duplicate phone prevention** — the API rejects a phone number already registered to another customer
- **Sell button** on every customer card/row — navigates directly to New Sale with the customer pre-populated
- **Contact Picker API** in the Add Customer modal — tap "Pick from Contacts" to pull name, phone, and email from the device's native contacts app (Android Chrome and iOS Safari 14.5+)

### Inventory Management
- **Three-tier stock status**: Depleted (0 units, red) · Low Stock (≤ reorder level, orange) · In Stock (green)
- **Out of Stock panel** — depleted products are surfaced at the top of the Inventory page with a direct **Restock** button
- **Edit with dual-control** — editing product details (name, type, unit, price, reorder level, stock qty) queues a pending approval; a second user must confirm before changes apply. The Edit button is disabled and shows "edit pending" while approval is outstanding
- **Direct stock correction** — the edit form includes a stock qty field for fixing wrong opening balances (approved by second user)

### Receivables & Payments
- Recording a payment against a credit sale creates a **pending payment** requiring a second user to approve before the balance is updated
- On mobile the payment button is hidden behind a left swipe to prevent accidental taps
- Pending payments appear in an amber approval panel at the top of the Receivables page

### Offline-First Sales Recording
Sales recorded without internet connectivity are stored in **IndexedDB** on the device. When the connection is restored the app automatically replays them against the API in chronological order.

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
- 3 named staff accounts seeded automatically on first Lambda cold start (Admin, Blessed, Emmanuel)
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
blessed-palm-oil/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, startup seeding, schema migrations
│   │   ├── db.py              # SQLAlchemy engine + session factory
│   │   ├── config.py          # Pydantic settings (env vars)
│   │   ├── models/            # ORM models: User, Sale, SaleItem, Product,
│   │   │                      #   Customer, Receivable, Receipt, Payment,
│   │   │                      #   InventoryChange, PendingDeletion, PendingPayment
│   │   ├── routers/           # Route handlers: auth, inventory, sales,
│   │   │                      #   customers, receivables, receipts, dashboard,
│   │   │                      #   analytics, reminders, deletions
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── utils/             # auth helpers (JWT/bcrypt), PDF, email
│   ├── requirements.txt
│   └── template.yaml          # AWS SAM template (alternative deploy path)
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, Inventory, NewSale, SalesHistory,
│   │   │                      #   Receivables, Receipts, Customers, Login, Reminders
│   │   ├── components/        # Layout (sidebar + bottom nav + sync banner),
│   │   │                      #   SwipeableCard
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
DATABASE_URL=sqlite:///./dev.db
ENVIRONMENT=development
EOF

uvicorn app.main:app --reload
# API:          http://localhost:8000
# Swagger docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
# App: http://localhost:5173
```

---

## Deploying to AWS

### Prerequisites
- AWS CLI configured (`aws configure`)
- Existing VPC + subnets in `eu-west-1`

### 1 — Deploy infrastructure (first time only)
```bash
aws cloudformation deploy \
  --template-file infrastructure.yaml \
  --stack-name blessedpalmoil \
  --parameter-overrides DBPassword=<secret> VpcId=<vpc-id> \
  --capabilities CAPABILITY_NAMED_IAM \
  --region eu-west-1
```

### 2 — Package and deploy Lambda
```bash
cd backend
pip install -r requirements.txt --target lambda_package

python3 -c "
import zipfile, os
def add_dir(zf, src, base):
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for f in files:
            if not f.endswith('.pyc'):
                zf.write(os.path.join(root, f), base + os.path.join(root, f)[len(src):])
with zipfile.ZipFile('lambda.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    add_dir(zf, 'lambda_package', '')
    add_dir(zf, 'app', 'app')
"

aws s3 cp lambda.zip s3://blessedpalmoil-lambda-106083617032/lambda.zip --region eu-west-1
aws lambda update-function-code \
  --function-name blessedpalmoil-api \
  --s3-bucket blessedpalmoil-lambda-106083617032 \
  --s3-key lambda.zip \
  --region eu-west-1
```

### 3 — Deploy frontend
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://blessedpalmoil-frontend-106083617032/ --delete --region eu-west-1
aws cloudfront create-invalidation \
  --distribution-id EYDEV35Z3QEDF --paths "/*"
```

---

## Security Highlights

| Control | Implementation |
|---|---|
| Password storage | bcrypt hashing (never plaintext) |
| Session tokens | JWT HS256, 12-hour expiry |
| Forced password change | Server-side `must_change_password` flag |
| Dual-control | `requested_by ≠ reviewer` enforced on every approve endpoint |
| Database isolation | RDS in private VPC subnet, no public access |
| Transport security | HTTPS enforced at CloudFront + API Gateway |
| Duplicate data prevention | Phone uniqueness enforced at API layer |

---

## Author

**Emmanuel Patrick** · [emmypat4rl@gmail.com](mailto:emmypat4rl@gmail.com)
