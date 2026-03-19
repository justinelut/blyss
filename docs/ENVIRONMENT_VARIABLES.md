# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the Blyss platform, with special focus on brand-related and platform configuration variables.

## Overview

The Blyss platform uses environment variables to configure:
- Brand identity (logos, names, colors)
- Platform behavior (fees, currency)
- Email settings
- Payment processing
- External integrations
- Development settings

## Brand Configuration Variables

### Email Branding

Configure how the platform identifies itself in email communications.

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `EMAIL_FROM_NAME` | `Polar` | Sender name displayed in emails | `Blyss` |
| `EMAIL_FROM_DOMAIN` | `notifications.polar.sh` | Domain for sending emails | `notifications.blyss.co.ke` |
| `EMAIL_FROM_LOCAL` | `mail` | Local part of email address | `mail` |
| `EMAIL_DEFAULT_REPLY_TO_NAME` | `Polar Support` | Reply-to name for emails | `Blyss Support` |
| `EMAIL_DEFAULT_REPLY_TO_EMAIL_ADDRESS` | `support@polar.sh` | Reply-to email address | `support@blyss.co.ke` |

**Complete Email Address**: `{EMAIL_FROM_LOCAL}@{EMAIL_FROM_DOMAIN}`
- Example: `mail@notifications.blyss.co.ke`

### Visual Brand Assets

Configure URLs for brand assets used throughout the platform.

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `FAVICON_URL` | `https://raw.githubusercontent.com/...` | Browser favicon URL | `/blyss-favicon.ico` |
| `THUMBNAIL_URL` | `https://raw.githubusercontent.com/...` | Social media thumbnail URL | `/blyss-og-image.png` |

**Frontend-Specific** (in `clients/apps/web/.env.local`):

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_LOGO_URL` | Main logo for light mode | `/blyss-logo.svg` |
| `NEXT_PUBLIC_LOGO_DARK_URL` | Logo for dark mode | `/blyss-logo-dark.svg` |

## Platform Configuration Variables

### Platform Fees

Configure the commission structure for the marketplace.

| Variable | Default | Description | Blyss Value |
|----------|---------|-------------|-------------|
| `PLATFORM_FEE_BASIS_POINTS` | `400` | Platform fee in basis points (1 bp = 0.01%) | `2000` (20%) |
| `PLATFORM_FEE_FIXED` | `40` | Fixed fee component in cents | `40` |

**Fee Calculation**:
```
Total Fee = (Amount × PLATFORM_FEE_BASIS_POINTS / 10000) + PLATFORM_FEE_FIXED
```

**Examples**:
- Transaction: $100.00 (10,000 cents)
- Variable Fee: 10,000 × 2000 / 10000 = 2,000 cents ($20.00)
- Fixed Fee: 40 cents ($0.40)
- Total Fee: $20.40

### Currency Configuration

Configure default currency and localization.

| Variable | Default | Description | Blyss Value |
|----------|---------|-------------|-------------|
| `DEFAULT_CURRENCY` | `usd` | Default currency code (ISO 4217) | `kes` |

**Supported Currencies**: The platform supports multiple currencies through Stripe and Paystack. The default currency is used for:
- New product creation
- Price display formatting
- Transaction defaults

## Email System Variables

### Email Rendering

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_RENDERER_BINARY_PATH` | `emails/bin/react-email-pkg` | Path to email rendering binary |
| `EMAIL_SENDER` | `logger` | Email sending method (`logger`, `resend`) |

### Email Service (Resend)

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key for sending emails | Yes (production) |
| `RESEND_API_BASE_URL` | Resend API endpoint | No |

## Payment Processing Variables

### Stripe Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Yes |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connect webhook secret | Yes |
| `STRIPE_STATEMENT_DESCRIPTOR` | Statement descriptor | No |

### Paystack Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Yes (if using Paystack) |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | Yes (if using Paystack) |
| `PAYSTACK_WEBHOOK_SECRET` | Webhook secret | Yes (if using Paystack) |

**Note**: Paystack is used for processing payments in Kenya and other African markets.

## Database Variables

### PostgreSQL Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `polar` | Database username |
| `POSTGRES_PWD` | `polar` | Database password |
| `POSTGRES_HOST` | `127.0.0.1` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_DATABASE` | `polar` | Database name |
| `POSTGRES_SSL_MODE` | `None` | SSL mode for connections |

### Redis Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis database number |
| `REDIS_PASSWORD` | `None` | Redis password (if required) |

## Application URLs

### Base URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://127.0.0.1:8000` | Backend API base URL |
| `FRONTEND_BASE_URL` | `http://127.0.0.1:3000` | Frontend application URL |
| `CHECKOUT_BASE_URL` | `http://127.0.0.1:8000/v1/checkout-links/{client_secret}/redirect` | Checkout redirect URL |

### Domain Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `USER_SESSION_COOKIE_DOMAIN` | `127.0.0.1` | Cookie domain for user sessions |
| `BACKOFFICE_HOST` | `None` | Backoffice host (if separate) |
| `CHECKOUT_LINK_HOST` | `None` | Checkout link host (if separate) |

## Session Configuration

### User Sessions

| Variable | Default | Description |
|----------|---------|-------------|
| `USER_SESSION_TTL` | `31 days` | User session lifetime |
| `USER_SESSION_COOKIE_KEY` | `polar_session` | Session cookie name |

### Customer Sessions

| Variable | Default | Description |
|----------|---------|-------------|
| `CUSTOMER_SESSION_TTL` | `1 hour` | Customer session lifetime |
| `CUSTOMER_SESSION_CODE_TTL` | `30 minutes` | Login code validity |
| `CUSTOMER_SESSION_CODE_LENGTH` | `6` | Login code length |

### Guest Sessions

| Variable | Default | Description |
|----------|---------|-------------|
| `GUEST_SESSION_COOKIE_KEY` | `polar_guest_session` | Guest session cookie name |

## Security Variables

### JWT Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET` | `super secret jwt secret` | JWT signing secret |
| `JWKS` | `./.jwks.json` | JSON Web Key Set file path |
| `CURRENT_JWK_KID` | `polar_dev` | Current key ID |

### CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `[]` | JSON list of allowed CORS origins |
| `ALLOWED_HOSTS` | `{127.0.0.1:3000, localhost:3000}` | Set of allowed hosts |

## External Integrations

### GitHub Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Yes (for GitHub login) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Yes (for GitHub login) |

### Discord Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | Yes (for Discord integration) |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | Yes (for Discord integration) |
| `DISCORD_BOT_TOKEN` | Discord bot token | Yes (for Discord benefits) |

### Google Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes (for Google login) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes (for Google login) |

### Apple Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `APPLE_CLIENT_ID` | Apple OAuth client ID | Yes (for Apple login) |
| `APPLE_TEAM_ID` | Apple team ID | Yes (for Apple login) |
| `APPLE_KEY_ID` | Apple key ID | Yes (for Apple login) |
| `APPLE_KEY_VALUE` | Apple private key | Yes (for Apple login) |

## Storage Configuration

### S3/MinIO Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | `polar-development` | AWS/MinIO access key |
| `AWS_SECRET_ACCESS_KEY` | `polar123456789` | AWS/MinIO secret key |
| `AWS_REGION` | `us-east-2` | AWS region |
| `S3_ENDPOINT_URL` | `None` | S3 endpoint (for MinIO) |

### Bucket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_FILES_BUCKET_NAME` | `polar-s3` | Private files bucket |
| `S3_FILES_PUBLIC_BUCKET_NAME` | `polar-s3-public` | Public files bucket |
| `S3_CUSTOMER_INVOICES_BUCKET_NAME` | `polar-customer-invoices` | Customer invoices bucket |
| `S3_PAYOUT_INVOICES_BUCKET_NAME` | `polar-payout-invoices` | Payout invoices bucket |

## Monitoring and Logging

### Sentry Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SENTRY_DSN` | Sentry DSN for error tracking | No |

### PostHog Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTHOG_PROJECT_API_KEY` | PostHog API key for analytics | No |
| `POSTHOG_DEBUG` | Enable PostHog debug mode | No |

### Logfire Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `LOGFIRE_TOKEN` | Logfire token for logging | No |

## Development Variables

### Environment Type

| Variable | Default | Description |
|----------|---------|-------------|
| `ENV` | `development` | Environment type (`development`, `testing`, `sandbox`, `production`, `test`) |

### Debug Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `DEBUG` | Logging level |
| `SQLALCHEMY_DEBUG` | `False` | Enable SQLAlchemy query logging |
| `POSTHOG_DEBUG` | `False` | Enable PostHog debug logging |

## Blyss-Specific Configuration Summary

For the Blyss marketplace platform, the following variables should be configured differently from the default Polar values:

### Required Changes

```bash
# Brand Identity
EMAIL_FROM_NAME=Blyss
EMAIL_FROM_DOMAIN=notifications.blyss.co.ke
EMAIL_DEFAULT_REPLY_TO_NAME=Blyss Support
EMAIL_DEFAULT_REPLY_TO_EMAIL_ADDRESS=support@blyss.co.ke

# Platform Configuration
PLATFORM_FEE_BASIS_POINTS=2000  # 20% fee
DEFAULT_CURRENCY=kes  # Kenyan Shillings

# Visual Assets
FAVICON_URL=/blyss-favicon.ico
THUMBNAIL_URL=/blyss-og-image.png
```

### Frontend Configuration

```bash
# Logo Assets
NEXT_PUBLIC_LOGO_URL=/blyss-logo.svg
NEXT_PUBLIC_LOGO_DARK_URL=/blyss-logo-dark.svg
```

## Environment File Locations

### Backend

- Development: `server/.env`
- Testing: `server/.env.testing`
- Test environment: `server/.env.test`

### Frontend

- Development: `clients/apps/web/.env.local`
- Production: Set via deployment platform

### Shared Secrets (Multi-Worktree)

- Location: `~/.config/polar/secrets.env`
- Template: `dev/secrets.env.template`

## Setting Environment Variables

### Local Development

1. **Backend**: Edit `server/.env`
   ```bash
   cd server
   vim .env
   ```

2. **Frontend**: Edit `clients/apps/web/.env.local`
   ```bash
   cd clients/apps/web
   vim .env.local
   ```

3. **Restart Services**: Changes require service restart
   ```bash
   # Backend
   uv run task api

   # Frontend
   pnpm dev
   ```

### Production Deployment

Environment variables should be set through your deployment platform:
- Render: Dashboard → Environment Variables
- Heroku: `heroku config:set VAR_NAME=value`
- Docker: `.env` file or `docker-compose.yml`
- Kubernetes: ConfigMaps and Secrets

## Validation

The platform validates critical environment variables on startup:

### Required Variables

The following variables must be set for production:
- `SECRET` (must not be default value)
- `STRIPE_SECRET_KEY` (if using Stripe)
- `PAYSTACK_SECRET_KEY` (if using Paystack)
- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PWD`
- `REDIS_HOST`

### Validation Errors

If required variables are missing or invalid, the application will:
1. Log an error message indicating which variables are missing
2. Fail to start (in production mode)
3. Use default values (in development mode, with warnings)

## Troubleshooting

### Variables Not Taking Effect

**Symptoms**: Changes to environment variables don't appear to work

**Solutions**:
1. Verify the correct `.env` file is being edited
2. Restart the application after changes
3. Check for typos in variable names (case-sensitive)
4. Verify no trailing spaces in values
5. Check if variable is being overridden by system environment

### Email Configuration Issues

**Symptoms**: Emails show wrong sender name or domain

**Solutions**:
1. Verify `EMAIL_FROM_NAME` is set to "Blyss"
2. Check `EMAIL_FROM_DOMAIN` is correct
3. Restart backend services
4. Clear email template cache: `uv run task emails`
5. Send test email to verify changes

### Fee Calculation Issues

**Symptoms**: Platform fee is incorrect (not 20%)

**Solutions**:
1. Verify `PLATFORM_FEE_BASIS_POINTS=2000`
2. Restart backend services
3. Check for hardcoded fee values in code
4. Verify calculation logic uses configuration value

## Related Documentation

- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development environment setup
- [BRAND_ASSETS.md](BRAND_ASSETS.md) - Brand asset documentation
- [Platform Rebrand Spec](../.kiro/specs/platform-rebrand/) - Complete rebrand specification

## Support

For questions about environment variables:
- Check this documentation first
- Review the troubleshooting section
- Consult `server/polar/config.py` for variable definitions
- Contact the development team

---

**Last Updated**: 2025
**Maintained By**: Blyss Development Team
