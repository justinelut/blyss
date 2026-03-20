# Local Development Setup

## Quick Start

### 1. Start the Backend API

```bash
cd server
uv run task api
```

The API will be available at **http://127.0.0.1:8000**

### 2. Start the Background Worker (optional)

In a separate terminal:

```bash
cd server
uv run task worker
```

### 3. Start the Frontend

In a separate terminal:

```bash
cd clients
pnpm run dev
```

The frontend will be available at **http://127.0.0.1:3000**

## Configuration

### Storage (Cloudflare R2)

The local development environment is configured to use Cloudflare R2 for file storage:

- **Endpoint**: `https://c1eaaa292b9dddcb67f9592bb5bc1948.r2.cloudflarestorage.com`
- **Bucket**: `blyss-platform`
- **Region**: `auto`

**⚠️ IMPORTANT**: You need to configure CORS on the R2 bucket for uploads to work from localhost.

See **[CLOUDFLARE_R2_CORS_SETUP.md](./CLOUDFLARE_R2_CORS_SETUP.md)** for detailed instructions.

Quick fix: Go to Cloudflare Dashboard → R2 → blyss-platform → Settings → CORS Policy and add `http://127.0.0.1:3000` to allowed origins.

### Database (Neon PostgreSQL)

The local environment uses Neon PostgreSQL (cloud-hosted):

- **Host**: `ep-dark-sky-amzbq521-pooler.c-5.us-east-1.aws.neon.tech`
- **Database**: `neondb`
- **SSL**: Required

No local PostgreSQL installation needed.

### Redis (Upstash)

The local environment uses Upstash Redis (cloud-hosted):

- **Host**: `communal-stingray-78661.upstash.io`
- **Port**: 6379

No local Redis installation needed.

## Useful Commands

### Database

```bash
# Run migrations
uv run task db_migrate

# Create a new migration
uv run alembic revision --autogenerate -m "description"

# Create an empty migration (for data migrations)
uv run alembic revision -m "description"
```

### Code Quality

```bash
# Lint the code
uv run task lint

# Type check
uv run task lint_types

# Run both
uv run task lint && uv run task lint_types
```

### Testing

```bash
# Run all tests
uv run task test

# Run specific test file
uv run pytest tests/path/to/test_file.py

# Run specific test class or method
uv run pytest tests/path/to/test_file.py::TestClassName::test_method_name
```

### Email Templates

```bash
# Rebuild email templates (if you changed them)
uv run task emails
```

## Environment Variables

The configuration is in `server/.env` which is based on `.env.development`.

Key settings for local development:

- `POLAR_ENV=development` - Development mode
- `POLAR_LOG_LEVEL=DEBUG` - Verbose logging
- `POLAR_FRONTEND_BASE_URL="http://127.0.0.1:3000"` - Frontend URL
- `POLAR_S3_ENDPOINT_URL` - Cloudflare R2 endpoint
- `POLAR_POSTGRES_HOST` - Neon PostgreSQL host
- `POLAR_REDIS_HOST` - Upstash Redis host

## File Uploads

File uploads work as follows in local development:

1. **Frontend** requests upload URL from API (`POST /v1/files/`)
2. **API** generates presigned URL using Cloudflare R2
3. **Frontend** uploads file directly to Cloudflare R2
4. **File** is stored in `blyss-platform` bucket

No CORS configuration needed - Cloudflare R2 handles it automatically (once configured in dashboard).

## Troubleshooting

### API won't start

Check if `.env` file exists:
```bash
ls -la server/.env
```

If missing, copy from template:
```bash
cp server/.env.development server/.env
```

### Database connection errors

Make sure you're using the correct Neon credentials in `.env`:
```bash
grep POLAR_POSTGRES server/.env
```

### File upload errors

**CORS Error**: If you see "blocked by CORS policy" error:

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Navigate to R2 → Buckets → blyss-platform
3. Click Settings → CORS Policy
4. Add this configuration:
   ```json
   [
     {
       "AllowedOrigins": ["http://127.0.0.1:3000", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

See [CLOUDFLARE_R2_CORS_SETUP.md](./CLOUDFLARE_R2_CORS_SETUP.md) for detailed instructions.

**Other upload errors**: Check Cloudflare R2 configuration:
```bash
grep POLAR_S3 server/.env
```

Make sure the credentials are correct and the bucket exists.

### Redis connection errors

Check Upstash Redis configuration:
```bash
grep POLAR_REDIS server/.env
```

## API Documentation

Once the API is running, you can access:

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc
- **OpenAPI JSON**: http://127.0.0.1:8000/openapi.json

## Hot Reload

The API server runs with `--reload` flag, so it will automatically restart when you change Python files.

## Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| Storage | Cloudflare R2 | Self-hosted MinIO |
| Database | Neon PostgreSQL | Self-hosted PostgreSQL |
| Redis | Upstash Redis | Self-hosted Redis |
| SSL | Not required | Required |
| CORS | Permissive | Restricted |

## Next Steps

1. Start the API: `uv run task api`
2. Start the frontend: `cd clients && pnpm run dev`
3. Open http://127.0.0.1:3000 in your browser
4. Try uploading a file to test Cloudflare R2 integration

## Need Help?

- Check the logs in the terminal where you ran `uv run task api`
- Check the API documentation at http://127.0.0.1:8000/docs
- Review the `.env` file for configuration issues
