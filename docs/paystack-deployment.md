# Paystack Integration Deployment Guide

## Overview

This guide covers the deployment of the Paystack payment integration for the Blyss platform. The integration enables M-Pesa payments, automatic revenue splits (80% creator, 20% platform), and subaccount management for creators in Kenya.

## Prerequisites

- Paystack account with API access
- Production database access
- Environment variable management system
- Webhook endpoint configuration capability
- Monitoring and alerting infrastructure

## Environment Variables

### Required Environment Variables

Add the following environment variables to your production environment:

```bash
# Paystack API Configuration
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Platform Fee Configuration (20% = 2000 basis points)
PLATFORM_FEE_BASIS_POINTS=2000
```

### Test Environment Variables

For staging/test environments:

```bash
# Paystack Test API Configuration
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxxxxxxxxxx

# Platform Fee Configuration
PLATFORM_FEE_BASIS_POINTS=2000
```

### Environment Variable Validation

The application validates required environment variables on startup. If any required variables are missing, the application will fail to start with an error message indicating which variables are missing.

## Database Migration Steps

### 1. Backup Database

Before running migrations, create a backup of the production database:

```bash
# Create database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > paystack_pre_migration_backup.sql
```

### 2. Run Database Migration

Execute the Alembic migration to add Paystack fields to the Organization table:

```bash
# Navigate to server directory
cd server

# Run the migration
uv run task db_migrate

# Verify migration was applied successfully
uv run alembic current
```

### 3. Migration Details

The migration adds the following fields to the `organizations` table:

- `subaccount_code` (nullable string) - Paystack subaccount identifier
- `subaccount_status` (enum: pending/active/failed) - Subaccount creation status
- `mpesa_number` (nullable string) - Creator's M-Pesa phone number
- `mpesa_verified` (boolean, default false) - M-Pesa number verification status
- `payout_method` (enum: bank/mpesa) - Preferred payout method

### 4. Post-Migration Verification

Verify the migration was successful:

```sql
-- Check that new columns exist
\d organizations;

-- Verify default values for existing organizations
SELECT COUNT(*) FROM organizations WHERE subaccount_status = 'pending';
SELECT COUNT(*) FROM organizations WHERE mpesa_verified = false;
SELECT COUNT(*) FROM organizations WHERE payout_method = 'bank';
```

## Paystack Webhook Configuration

### 1. Webhook Endpoint Setup

Configure the webhook endpoint in your Paystack dashboard:

**Webhook URL**: `https://your-domain.com/api/v1/integrations/paystack/webhook`

### 2. Webhook Events

Enable the following webhook events in your Paystack dashboard:

- `charge.success` - Payment completed successfully
- `charge.failed` - Payment failed

### 3. Webhook Security

- The webhook endpoint verifies signatures using the `PAYSTACK_WEBHOOK_SECRET`
- Invalid signatures are rejected with HTTP 401
- Webhook events are stored for audit purposes
- Duplicate events are handled idempotently

### 4. Webhook Testing

Test webhook delivery using Paystack's webhook testing tools:

1. Send test `charge.success` event
2. Verify event is received and processed
3. Check that order is created correctly
4. Send test `charge.failed` event
5. Verify checkout status is updated to failed

## Deployment Steps

### 1. Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database backup created
- [ ] Paystack account configured with live API keys
- [ ] Webhook endpoint URL configured in Paystack dashboard
- [ ] Monitoring and alerting configured

### 2. Deployment Process

```bash
# 1. Deploy application code
git checkout main
git pull origin main

# 2. Install dependencies
cd server
uv sync

# 3. Run database migrations
uv run task db_migrate

# 4. Restart application services
systemctl restart polar-api
systemctl restart polar-worker

# 5. Verify services are running
systemctl status polar-api
systemctl status polar-worker
```

### 3. Post-Deployment Verification

#### API Health Check

```bash
# Check API is responding
curl -f https://your-domain.com/api/v1/health

# Check Paystack integration is loaded
curl -f https://your-domain.com/api/v1/integrations/paystack/health
```

#### Database Verification

```sql
-- Verify migration was applied
SELECT version_num FROM alembic_version;

-- Check organization table structure
\d organizations;

-- Verify no data corruption
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM orders;
```

#### Webhook Verification

```bash
# Test webhook endpoint is accessible
curl -X POST https://your-domain.com/api/v1/integrations/paystack/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'

# Should return 401 due to missing/invalid signature
```

## Testing Procedures

### 1. End-to-End Payment Flow Test

1. **Create Test Organization**
   - Create organization with Paystack integration
   - Verify subaccount is created automatically
   - Check subaccount status is 'active'

2. **Configure M-Pesa Payout**
   - Navigate to organization settings
   - Configure M-Pesa number (+254XXXXXXXXX)
   - Send verification transaction (KES 10)
   - Verify M-Pesa number is marked as verified

3. **Test Payment Flow**
   - Create product checkout
   - Initialize Paystack payment
   - Complete payment using test M-Pesa number
   - Verify webhook is received and processed
   - Check order is created with correct amounts
   - Verify platform fee (20%) and creator payout (80%) are recorded

### 2. Error Scenario Testing

1. **Inactive Subaccount**
   - Set organization subaccount_status to 'failed'
   - Attempt payment initialization
   - Verify error is returned and payment is blocked

2. **Webhook Signature Verification**
   - Send webhook with invalid signature
   - Verify request is rejected with HTTP 401

3. **Payment Verification Failure**
   - Simulate failed payment verification
   - Verify checkout status returns to 'open'
   - Check no order is created

### 3. Performance Testing

1. **Webhook Processing Time**
   - Send multiple webhook events
   - Verify all are processed within 10 seconds
   - Check background tasks complete successfully

2. **Subaccount Creation**
   - Create multiple organizations simultaneously
   - Verify all subaccounts are created successfully
   - Check for any race conditions or failures

## Monitoring and Alerting

### 1. Key Metrics to Monitor

- **Payment Success Rate**: Percentage of successful payments
- **Subaccount Creation Rate**: Percentage of successful subaccount creations
- **Webhook Processing Time**: Average time to process webhook events
- **M-Pesa Verification Rate**: Percentage of successful M-Pesa verifications
- **API Error Rate**: Rate of Paystack API errors

### 2. Alert Thresholds

Configure alerts for the following conditions:

- Payment success rate < 90% (1 hour window)
- Subaccount creation rate < 95% (1 hour window)
- Webhook processing rate < 98% (1 hour window)
- M-Pesa verification rate < 85% (24 hour window)
- API error rate > 5% (15 minute window)

### 3. Log Monitoring

Monitor logs for the following patterns:

- `paystack.api.error` - API errors requiring investigation
- `paystack.webhook.signature_invalid` - Potential security issues
- `paystack.subaccount.creation_failed` - Subaccount creation failures
- `paystack.payment.verification_failed` - Payment verification issues

### 4. Health Checks

Implement health checks for:

- Paystack API connectivity
- Database connectivity for Paystack tables
- Background task queue health
- Webhook endpoint accessibility

## Rollback Plan

### 1. Immediate Rollback (Code Issues)

If critical issues are discovered post-deployment:

```bash
# 1. Rollback to previous application version
git checkout <previous-stable-commit>

# 2. Restart services
systemctl restart polar-api
systemctl restart polar-worker

# 3. Verify rollback successful
curl -f https://your-domain.com/api/v1/health
```

### 2. Database Rollback (Migration Issues)

If database migration causes issues:

```bash
# 1. Stop application services
systemctl stop polar-api
systemctl stop polar-worker

# 2. Restore database from backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < paystack_pre_migration_backup.sql

# 3. Rollback application code
git checkout <previous-stable-commit>

# 4. Restart services
systemctl start polar-api
systemctl start polar-worker
```

### 3. Partial Rollback (Feature Disable)

To disable Paystack integration without full rollback:

```bash
# Set environment variable to disable Paystack
export PAYSTACK_ENABLED=false

# Restart services
systemctl restart polar-api
systemctl restart polar-worker
```

### 4. Rollback Verification

After rollback:

1. Verify application is functional
2. Check existing Stripe payments still work
3. Ensure no data corruption occurred
4. Validate all critical user flows

## Security Considerations

### 1. API Key Management

- Store API keys in secure environment variable system
- Rotate API keys regularly (quarterly recommended)
- Use separate keys for test and production environments
- Never commit API keys to version control

### 2. Webhook Security

- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement rate limiting on webhook endpoint
- Log all webhook events for audit purposes

### 3. Data Protection

- Encrypt M-Pesa numbers at rest
- Sanitize logs to remove sensitive data
- Implement proper access controls for Paystack data
- Regular security audits of payment flows

### 4. Compliance

- Ensure PCI DSS compliance for payment data
- Follow Paystack's security guidelines
- Implement proper data retention policies
- Regular security assessments

## Troubleshooting

### Common Issues

1. **Subaccount Creation Failures**
   - Check Paystack API key permissions
   - Verify organization data completeness
   - Check API rate limits

2. **Webhook Processing Delays**
   - Monitor background task queue
   - Check database connection pool
   - Verify webhook signature validation

3. **M-Pesa Verification Issues**
   - Validate phone number format
   - Check Paystack M-Pesa configuration
   - Verify test transaction amounts

4. **Payment Initialization Errors**
   - Check subaccount status
   - Verify currency configuration (KES)
   - Validate transaction amounts

### Support Contacts

- **Paystack Support**: support@paystack.com
- **Technical Team**: [Your team contact]
- **On-call Engineer**: [On-call contact]

## Maintenance

### Regular Tasks

- **Weekly**: Review payment success rates and error logs
- **Monthly**: Rotate API keys and update webhook secrets
- **Quarterly**: Security audit of payment flows
- **Annually**: Review and update integration with Paystack API changes

### Updates and Patches

- Monitor Paystack API changelog for updates
- Test integration with new Paystack features
- Update SDK versions regularly
- Maintain compatibility with Paystack webhook format changes
