# 🏠 Home Service Marketplace — NestJS Backend

Complete REST API + WebSocket backend. **Build passes cleanly (0 errors).**

## Stack
- **NestJS** + TypeScript
- **PostgreSQL** via Prisma ORM
- **Socket.io** WebSockets (chat + live tracking)
- **Razorpay** payments
- **Twilio** OTP
- **AWS S3** file uploads
- **Swagger** auto-docs at `/api/docs`

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env   # Fill in your credentials

# 3. Database
docker-compose up -d                        # Start Postgres + Redis
npx prisma migrate dev --name init          # Run migrations
npm run seed                                # Seed categories, settings, admin

# 4. Run
npm run start:dev                           # http://localhost:3000
# Swagger: http://localhost:3000/api/docs
```

## Modules (72 source files)

| Module | Description |
|--------|-------------|
| auth | OTP + JWT login for Customer / Worker / Admin |
| users | Profile, addresses, saved cards |
| workers | Profile, documents, skills, availability, location |
| categories | Service category CRUD |
| services | Home service CRUD + popular |
| bookings | Full lifecycle: create → accept → start → complete |
| payments | Razorpay, UPI, wallet, cash, refunds |
| chat | WebSocket real-time chat per booking |
| tracking | WebSocket live worker GPS tracking |
| notifications | In-app notifications (push-ready) |
| reviews | Rating + review post-completion |
| wallet | Customer wallet + Worker earnings/withdrawals |
| coupons | Discount codes with validation |
| support | Help tickets + FAQ |
| reports | Admin dashboard, revenue, booking, worker, customer reports |
| admin | Full admin management (customers, workers, bookings, settings, banners) |
| upload | Single + multi file upload to AWS S3 |

## WebSocket Namespaces

- `/chat` — real-time booking chat
- `/tracking` — live worker location updates

## Roles

| Role | Token | Access |
|------|-------|--------|
| CUSTOMER | Bearer JWT | Bookings, wallet, chat, reviews |
| WORKER | Bearer JWT | Jobs, earnings, schedule, docs |
| ADMIN | Bearer JWT | Everything + reports + management |

## Key API Endpoints

```
POST  /api/v1/auth/send-otp
POST  /api/v1/auth/verify-otp          → returns JWT token

POST  /api/v1/bookings                 Customer creates booking
PUT   /api/v1/bookings/:id/accept      Worker accepts
PUT   /api/v1/bookings/:id/start       Worker starts job
PUT   /api/v1/bookings/:id/complete    Job done → auto earnings credit

POST  /api/v1/payments/create-order/:bookingId   Razorpay order
POST  /api/v1/payments/verify                    Verify signature

GET   /api/v1/reports/dashboard        Admin stats overview
GET   /api/v1/admin/workers?status=PENDING  Workers awaiting approval
PUT   /api/v1/admin/workers/:id/status      Approve/Reject/Suspend
```

See full API list in Swagger docs at runtime.
