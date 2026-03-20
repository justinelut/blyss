# Cloudflare R2 CORS Configuration

## Problem

File uploads from localhost fail with CORS error:
```
Access to XMLHttpRequest at 'https://c1eaaa292b9dddcb67f9592bb5bc1948.r2.cloudflarestorage.com/...'
from origin 'http://127.0.0.1:3000' has been blocked by CORS policy
```

## Solution

Configure CORS on the Cloudflare R2 bucket to allow uploads from your local development environment.

## Steps to Configure CORS

### Option 1: Using Cloudflare Dashboard (Recommended)

1. **Login to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com/
   - Navigate to R2 → Buckets

2. **Select Your Bucket**
   - Click on `blyss-platform` bucket

3. **Configure CORS**
   - Click on "Settings" tab
   - Scroll to "CORS Policy"
   - Click "Add CORS Policy" or "Edit"

4. **Add CORS Rules**

   Paste this JSON configuration:

   ```json
   [
     {
       "AllowedOrigins": [
         "http://127.0.0.1:3000",
         "http://localhost:3000",
         "https://www.blyss.co.ke",
         "https://blyss.co.ke"
       ],
       "AllowedMethods": [
         "GET",
         "PUT",
         "POST",
         "DELETE",
         "HEAD"
       ],
       "AllowedHeaders": [
         "*"
       ],
       "ExposeHeaders": [
         "ETag",
         "x-amz-request-id",
         "x-amz-id-2"
       ],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

5. **Save Changes**
   - Click "Save" or "Update"

### Option 2: Using Wrangler CLI

If you have Wrangler installed:

```bash
# Install wrangler if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a CORS configuration file
cat > r2-cors.json << 'EOF'
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://www.blyss.co.ke",
      "https://blyss.co.ke"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Apply CORS configuration to bucket
wrangler r2 bucket cors put blyss-platform --file r2-cors.json
```

### Option 3: Using AWS CLI with R2

Cloudflare R2 is S3-compatible, so you can use AWS CLI:

```bash
# Install AWS CLI if not already installed
# Windows: https://aws.amazon.com/cli/
# Mac: brew install awscli
# Linux: sudo apt install awscli

# Configure AWS CLI for R2
aws configure --profile r2
# AWS Access Key ID: 16f5c03beef33ec3dd9be9cbef6b85ad
# AWS Secret Access Key: 444862c047614b43c7971baaed16e0c0cb6e5a5ecd6bad015e3c2327d3fd22f6
# Default region name: auto
# Default output format: json

# Create CORS configuration file
cat > r2-cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "https://www.blyss.co.ke",
        "https://blyss.co.ke"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "POST",
        "DELETE",
        "HEAD"
      ],
      "AllowedHeaders": [
        "*"
      ],
      "ExposeHeaders": [
        "ETag",
        "x-amz-request-id",
        "x-amz-id-2"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket blyss-platform \
  --cors-configuration file://r2-cors.json \
  --endpoint-url https://c1eaaa292b9dddcb67f9592bb5bc1948.r2.cloudflarestorage.com \
  --profile r2

# Verify CORS configuration
aws s3api get-bucket-cors \
  --bucket blyss-platform \
  --endpoint-url https://c1eaaa292b9dddcb67f9592bb5bc1948.r2.cloudflarestorage.com \
  --profile r2
```

## CORS Configuration Explained

- **AllowedOrigins**: URLs that can upload files
  - `http://127.0.0.1:3000` - Local development
  - `http://localhost:3000` - Alternative localhost
  - `https://www.blyss.co.ke` - Production frontend
  - `https://blyss.co.ke` - Production frontend (no www)

- **AllowedMethods**: HTTP methods allowed
  - `PUT` - Upload file parts
  - `POST` - Complete multipart upload
  - `GET` - Download files
  - `HEAD` - Check file existence
  - `DELETE` - Delete files

- **AllowedHeaders**: Request headers allowed
  - `*` - Allow all headers (needed for presigned URLs)

- **ExposeHeaders**: Response headers exposed to browser
  - `ETag` - File hash for verification
  - `x-amz-request-id` - Request tracking
  - `x-amz-id-2` - Additional tracking

- **MaxAgeSeconds**: How long browser caches CORS preflight
  - `3600` - 1 hour

## Testing CORS Configuration

After configuring CORS, test it:

```bash
# Test CORS preflight request
curl -X OPTIONS \
  -H "Origin: http://127.0.0.1:3000" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type" \
  -v \
  https://c1eaaa292b9dddcb67f9592bb5bc1948.r2.cloudflarestorage.com/blyss-platform/
```

You should see response headers like:
```
Access-Control-Allow-Origin: http://127.0.0.1:3000
Access-Control-Allow-Methods: GET, PUT, POST, DELETE, HEAD
Access-Control-Allow-Headers: *
```

## Troubleshooting

### CORS still not working after configuration

1. **Wait a few minutes** - CORS changes can take time to propagate
2. **Clear browser cache** - Old CORS responses might be cached
3. **Check bucket name** - Make sure you configured the correct bucket
4. **Verify credentials** - Ensure AWS credentials are correct

### "Access Denied" errors

- Check that the IAM credentials have permission to set CORS
- Verify you're using the correct account ID

### CORS works but uploads fail

- Check that presigned URLs are being generated correctly
- Verify the bucket name in `.env` matches the actual bucket
- Check that the endpoint URL is correct

## Alternative: Use MinIO Locally

If CORS configuration is too complex, you can run MinIO locally:

```bash
# Install MinIO
# Windows: https://min.io/download
# Mac: brew install minio/stable/minio
# Linux: wget https://dl.min.io/server/minio/release/linux-amd64/minio

# Start MinIO
minio server ~/minio-data --console-address ":9001"

# Update server/.env
POLAR_S3_ENDPOINT_URL="http://localhost:9000"
POLAR_S3_PUBLIC_ENDPOINT_URL="http://localhost:9000"
POLAR_AWS_ACCESS_KEY_ID="minioadmin"
POLAR_AWS_SECRET_ACCESS_KEY="minioadmin"
```

Then configure CORS via MinIO Console at http://localhost:9001

## Recommended Approach

**For local development**: Use Option 1 (Cloudflare Dashboard) - it's the easiest and most reliable.

**For production**: CORS is already configured on the production MinIO instance via Nginx.

## After CORS is Configured

1. Restart your local API server:
   ```bash
   cd server
   uv run task api
   ```

2. Try uploading a file from the frontend

3. Check browser console - CORS errors should be gone

4. Files should upload successfully to R2

## Need Help?

If CORS configuration doesn't work:
1. Share the exact error message from browser console
2. Check Cloudflare R2 dashboard to verify CORS is saved
3. Try the curl test command above to verify CORS headers
