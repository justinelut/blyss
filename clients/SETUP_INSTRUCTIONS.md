# Setup Instructions - Get Polar Running

## Current Status

✅ Python dependencies installed (uv sync completed)
✅ Node dependencies installed (pnpm install completed)
✅ Environment files created with dummy values
❌ Need database URL to start server

## What You Need to Do Now

### Step 1: Get Neon PostgreSQL Database (5 minutes)

1. Go to https://neon.tech
2. Click "Sign Up" (free, no credit card needed)
3. Sign in with GitHub or email
4. Click "Create Project"
5. Name it "blyss" or "polar"
6. Copy the connection string (it looks like this):
   ```
   postgresql://username:password@ep-something.us-east-2.aws.neon.tech/neondb
   ```

### Step 2: Update Server Environment File

Open `server/.env` and find these lines:

```
POLAR_POSTGRES_USER=polar
POLAR_POSTGRES_PWD=polar
POLAR_POSTGRES_HOST=127.0.0.1
POLAR_POSTGRES_PORT=5432
POLAR_POSTGRES_DATABASE=polar
```

Replace them with your Neon connection string parts:

```
POLAR_POSTGRES_USER=your_neon_username
POLAR_POSTGRES_PWD=your_neon_password
POLAR_POSTGRES_HOST=ep-something.us-east-2.aws.neon.tech
POLAR_POSTGRES_PORT=5432
POLAR_POSTGRES_DATABASE=neondb
```

Also update the READ connection (same values):

```
POLAR_POSTGRES_READ_USER=your_neon_username
POLAR_POSTGRES_READ_PWD=your_neon_password
POLAR_POSTGRES_READ_HOST=ep-something.us-east-2.aws.neon.tech
POLAR_POSTGRES_READ_PORT=5432
POLAR_POSTGRES_READ_DATABASE=neondb
```

### Step 3: Get Upstash Redis (5 minutes)

1. Go to https://upstash.com
2. Sign up (free, no credit card)
3. Click "Create Database"
4. Choose "Global" for best performance
5. Copy the connection details

Update `server/.env`:

```
POLAR_REDIS_HOST=your-redis-host.upstash.io
POLAR_REDIS_PORT=6379
POLAR_REDIS_DB=0
```

You'll also need to add (Upstash gives you this):

```
POLAR_REDIS_PASSWORD=your_redis_password
```

### Step 4: Run Database Migrations

Once you have the database URL configured:

```bash
cd server
uv run task db_migrate
```

This creates all the tables Polar needs.

### Step 5: Start the Backend

```bash
cd server
uv run task api
```

The API will start at http://127.0.0.1:8000

### Step 6: Start the Frontend

In a new terminal:

```bash
cd clients
pnpm dev-web
```

The web app will start at http://127.0.0.1:3000

## Quick Commands Reference

### Server Commands (from `server/` directory):

```bash
uv run task api          # Start API server
uv run task worker       # Start background worker
uv run task db_migrate   # Run database migrations
uv run task test         # Run tests
```

### Frontend Commands (from `clients/` directory):

```bash
pnpm dev-web            # Start web app only
pnpm dev                # Start all apps
pnpm build              # Build for production
```

## Troubleshooting

### "Connection refused" error

- Make sure Neon database URL is correct
- Check if Upstash Redis URL is correct

### "Module not found" error

- Run `uv sync` in server directory
- Run `pnpm install` in clients directory

### Port already in use

- Kill the process using the port
- Or change the port in the command

## What's Next

Once both server and frontend are running:

1. Open http://127.0.0.1:3000 in your browser
2. You'll see the Polar UI
3. Create a test account
4. Explore the product creation flow
5. See how checkout works
6. Then we start modifying for Blyss!

## Current Environment Files

### server/.env

- ✅ Created with dummy Stripe keys
- ❌ Needs Neon PostgreSQL URL
- ❌ Needs Upstash Redis URL
- ⚠️ S3 storage set to local (we'll change to Cloudflare R2 later)

### clients/apps/web/.env.local

- ✅ Created with API URL
- ✅ Dummy Stripe key
- ✅ Ready to go once backend is running

## Notes

- Stripe keys are dummy (Kenya not supported)
- We'll replace with Paystack later
- GitHub integration disabled (not needed)
- S3 storage using local MinIO for now (will change to Cloudflare R2)
- Redis and PostgreSQL using managed services (Upstash + Neon)

---

**Ready to continue?** Get your Neon database URL and let me know, I'll help you update the config and start everything!
