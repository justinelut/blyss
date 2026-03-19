# Paystack Production Setup Guide

## Overview

This guide provides step-by-step instructions for setting up Paystack integration in production environment, including API key configuration, webhook setup, monitoring, and rollback procedures.

## 1. Paystack Account Setup

### 1.1 Live Mode Activation

1. **Complete Paystack KYC Process**
   - Submit business registration documents
   - Provide bank account details
   - Complete identity verification
   - Wait for Paystack approval (typically 1-3 business days)

2. **Activate Live Mode**
   - Log into Paystack Dashboard
   - Navigate to Settings → API Keys & Webhooks
   - Switch to "Live Mode"
   - Generate live API keys

### 1.2 API Key Generation

Generate the following live API keys:

```bash
# Live API Keys (example format)
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 1.3 Webhook Secret Generation

1. Navigate to Settings → API Keys & Webhooks
2. Click "Generate Webhook Secret"
3. Copy the webhook secret for environment configuration

```bash
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 2. Production Environment Configuration

### 2.1 Environment Variables Setup

Add the following environment variables to your production environment:

```bash
# Paystack Live Configuration
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Platform Configuration
PLATFORM_FEE_BASIS_POINTS=2000  # 20% platform fee

# Feature Flags (optional)
PAYSTACK_ENABLED=true
PAYSTACK_SUBACCOUNT_AUTO_CREATE=true
PAYSTACK_MPESA_ENABLED=true
```

### 2.2 Environment Variable Validation

Create a validation script to ensure all required variables are set:

```bash
#!/bin/bash
# validate-paystack-env.sh

required_vars=(
    "PAYSTACK_SECRET_KEY"
    "PAYSTACK_PUBLIC_KEY"
    "PAYSTACK_WEBHOOK_SECRET"
    "PLATFORM_FEE_BASIS_POINTS"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set"
        exit 1
    fi
done

echo "All Paystack environment variables are configured"
```

### 2.3 Security Configuration

1. **API Key Rotation Schedule**
   - Set up quarterly API key rotation
   - Document key rotation procedures
   - Create alerts for key expiration

2. **Access Control**
   - Limit access to production API keys
   - Use secure secret management system
   - Implement audit logging for key access

## 3. Webhook Configuration

### 3.1 Production Webhook URL

Configure webhook endpoint in Paystack Dashboard:

**URL**: `https://your-production-domain.com/api/v1/integrations/paystack/webhook`

### 3.2 Webhook Events Configuration

Enable the following webhook events:

1. **charge.success**
   - Description: Payment completed successfully
   - Action: Creates order and updates checkout status

2. **charge.failed**
   - Description: Payment failed
   - Action: Updates checkout status to failed

### 3.3 Webhook Security Settings

1. **IP Whitelisting** (if supported by infrastructure)
   - Whitelist Paystack webhook IPs
   - Block requests from other sources

2. **Rate Limiting**
   - Configure rate limiting: 1000 requests/minute
   - Implement exponential backoff for retries

3. **Signature Verification**
   - Always verify webhook signatures
   - Reject requests with invalid signatures
   - Log signature verification failures

### 3.4 Webhook Testing

Test webhook configuration before going live:

```bash
# Test webhook endpoint accessibility
curl -X POST https://your-production-domain.com/api/v1/integrations/paystack/webhook \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: invalid" \
  -d '{"event": "test"}'

# Expected response: 401 Unauthorized (due to invalid signature)
```

## 4. Monitoring and Alerting Setup

### 4.1 Metrics Collection

Set up monitoring for the following metrics:

```yaml
# Prometheus metrics configuration
paystack_metrics:
  - name: paystack_transactions_total
    type: counter
    labels: [status, currency]

  - name: paystack_api_requests_total
    type: counter
    labels: [endpoint, status_code]

  - name: paystack_webhook_events_total
    type: counter
    labels: [event_type, status]

  - name: paystack_subaccount_operations_total
    type: counter
    labels: [operation, status]

  - name: paystack_payment_amounts_kes
    type: histogram
    buckets: [100, 1000, 5000, 10000, 50000, 100000]
```

### 4.2 Alert Configuration

Configure alerts for critical issues:

```yaml
# Alert rules (Prometheus/AlertManager format)
groups:
  - name: paystack_alerts
    rules:
      - alert: PaystackPaymentFailureRate
        expr: rate(paystack_transactions_total{status="failed"}[1h]) / rate(paystack_transactions_total[1h]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High Paystack payment failure rate"
          description: "Payment failure rate is {{ $value | humanizePercentage }} over the last hour"

      - alert: PaystackAPIErrors
        expr: rate(paystack_api_requests_total{status_code!~"2.."}[15m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High Paystack API error rate"
          description: "API error rate is {{ $value | humanizePercentage }} over the last 15 minutes"

      - alert: PaystackWebhookProcessingDelay
        expr: histogram_quantile(0.95, rate(paystack_webhook_processing_duration_seconds_bucket[5m])) > 10
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Slow Paystack webhook processing"
          description: "95th percentile webhook processing time is {{ $value }}s"

      - alert: PaystackSubaccountCreationFailures
        expr: rate(paystack_subaccount_operations_total{operation="create",status="failed"}[1h]) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High subaccount creation failure rate"
          description: "Subaccount creation failure rate is {{ $value | humanizePercentage }}"
```

### 4.3 Dashboard Configuration

Create monitoring dashboard with the following panels:

1. **Payment Overview**
   - Total payments processed
   - Payment success rate
   - Average payment amount
   - Payment volume by hour/day

2. **API Health**
   - API request rate
   - API error rate
   - API response times
   - Rate limit usage

3. **Webhook Processing**
   - Webhook events received
   - Processing success rate
   - Processing latency
   - Queue depth

4. **Subaccount Management**
   - Active subaccounts
   - Subaccount creation rate
   - M-Pesa verification rate
   - Payout configuration status

### 4.4 Log Aggregation

Configure structured logging for Paystack operations:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "paystack-integration",
  "operation": "transaction_initialize",
  "transaction_reference": "txn_123456789",
  "organization_id": "org_abc123",
  "amount": 5000,
  "currency": "KES",
  "subaccount_code": "ACCT_abc123",
  "duration_ms": 250,
  "status": "success"
}
```

## 5. Rollback Plan

### 5.1 Immediate Rollback Triggers

Implement automatic rollback for:

- Payment success rate < 50% for 10 minutes
- API error rate > 50% for 5 minutes
- Critical security vulnerability discovered
- Data corruption detected

### 5.2 Rollback Procedures

#### 5.2.1 Application Rollback

```bash
#!/bin/bash
# paystack-rollback.sh

echo "Starting Paystack integration rollback..."

# 1. Disable Paystack integration
export PAYSTACK_ENABLED=false

# 2. Restart services
systemctl restart polar-api
systemctl restart polar-worker

# 3. Verify services are healthy
sleep 30
curl -f https://your-domain.com/api/v1/health

# 4. Verify Stripe payments still work
curl -f https://your-domain.com/api/v1/checkout/test-stripe

echo "Rollback completed successfully"
```

#### 5.2.2 Database Rollback

```bash
#!/bin/bash
# paystack-db-rollback.sh

echo "Starting database rollback..."

# 1. Stop application services
systemctl stop polar-api
systemctl stop polar-worker

# 2. Create current state backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > rollback_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Restore from pre-migration backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < paystack_pre_migration_backup.sql

# 4. Rollback application code
git checkout <previous-stable-commit>

# 5. Restart services
systemctl start polar-api
systemctl start polar-worker

echo "Database rollback completed"
```

### 5.3 Rollback Testing

Test rollback procedures in staging environment:

1. **Simulate Critical Failure**
   - Deploy broken Paystack integration
   - Trigger automatic rollback
   - Verify system returns to stable state

2. **Manual Rollback Test**
   - Execute manual rollback procedures
   - Verify all services function correctly
   - Test existing payment flows

3. **Database Rollback Test**
   - Apply migration in staging
   - Execute database rollback
   - Verify data integrity

## 6. Go-Live Checklist

### 6.1 Pre-Deployment Verification

- [ ] Paystack account activated and verified
- [ ] Live API keys generated and configured
- [ ] Webhook endpoint configured and tested
- [ ] Environment variables validated
- [ ] Database migration tested in staging
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures tested
- [ ] Security review completed
- [ ] Performance testing completed

### 6.2 Deployment Steps

1. **Deploy to Staging**
   ```bash
   # Deploy to staging environment
   git checkout release/paystack-integration
   ./deploy-staging.sh

   # Run full test suite
   ./run-integration-tests.sh
   ```

2. **Production Deployment**
   ```bash
   # Create deployment backup
   ./create-deployment-backup.sh

   # Deploy to production
   ./deploy-production.sh

   # Verify deployment
   ./verify-deployment.sh
   ```

3. **Post-Deployment Verification**
   ```bash
   # Check application health
   curl -f https://your-domain.com/api/v1/health

   # Verify Paystack integration
   curl -f https://your-domain.com/api/v1/integrations/paystack/health

   # Test webhook endpoint
   ./test-webhook-endpoint.sh
   ```

### 6.3 Gradual Rollout Plan

Implement gradual rollout to minimize risk:

1. **Phase 1: Internal Testing (Week 1)**
   - Enable Paystack for internal test accounts only
   - Monitor all metrics closely
   - Fix any issues discovered

2. **Phase 2: Limited Beta (Week 2)**
   - Enable for 10% of new organizations
   - Monitor payment success rates
   - Collect user feedback

3. **Phase 3: Expanded Beta (Week 3)**
   - Enable for 50% of new organizations
   - Monitor system performance
   - Optimize based on usage patterns

4. **Phase 4: Full Rollout (Week 4)**
   - Enable for all new organizations
   - Migrate existing organizations gradually
   - Monitor for any issues

### 6.4 Success Criteria

Define success criteria for each phase:

- **Payment Success Rate**: > 95%
- **API Error Rate**: < 2%
- **Webhook Processing**: < 5 seconds average
- **Subaccount Creation**: > 98% success rate
- **User Satisfaction**: > 4.5/5 rating

## 7. Maintenance and Support

### 7.1 Regular Maintenance Tasks

**Daily**:
- Monitor payment success rates
- Check error logs for issues
- Verify webhook processing

**Weekly**:
- Review performance metrics
- Update monitoring dashboards
- Check API rate limit usage

**Monthly**:
- Rotate API keys (if required)
- Review security logs
- Update documentation

**Quarterly**:
- Security audit
- Performance optimization
- API integration review

### 7.2 Support Procedures

**Incident Response**:
1. Identify issue severity
2. Execute appropriate rollback if needed
3. Investigate root cause
4. Implement fix
5. Post-incident review

**User Support**:
- Document common issues and solutions
- Create troubleshooting guides
- Establish escalation procedures

### 7.3 Continuous Improvement

- Regular review of payment flows
- User feedback collection
- Performance optimization
- Security enhancements
- Integration with new Paystack features

## 8. Contact Information

### 8.1 Emergency Contacts

- **On-Call Engineer**: [Phone/Email]
- **Technical Lead**: [Phone/Email]
- **DevOps Team**: [Phone/Email]

### 8.2 External Support

- **Paystack Support**: support@paystack.com
- **Paystack Technical**: developers@paystack.com
- **Paystack Emergency**: [Emergency contact if available]

### 8.3 Internal Teams

- **Backend Team**: [Contact info]
- **Frontend Team**: [Contact info]
- **QA Team**: [Contact info]
- **Product Team**: [Contact info]
