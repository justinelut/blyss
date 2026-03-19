# Paystack Integration Rollback Plan

## Overview

This document outlines comprehensive rollback procedures for the Paystack integration. It covers different rollback scenarios, automated procedures, and manual intervention steps to ensure system stability and data integrity.

## Rollback Scenarios

### Scenario 1: Application Code Issues
- **Trigger**: Critical bugs in Paystack integration code
- **Impact**: Payment processing failures, API errors
- **Rollback Type**: Application code rollback
- **Estimated Time**: 5-10 minutes

### Scenario 2: Database Migration Issues
- **Trigger**: Migration causes data corruption or performance issues
- **Impact**: Database instability, data loss risk
- **Rollback Type**: Database restoration from backup
- **Estimated Time**: 15-30 minutes

### Scenario 3: API Integration Failures
- **Trigger**: Paystack API changes, authentication issues
- **Impact**: Payment initialization failures, webhook processing errors
- **Rollback Type**: Feature flag disable
- **Estimated Time**: 2-5 minutes

### Scenario 4: Performance Degradation
- **Trigger**: High latency, resource exhaustion
- **Impact**: Slow payment processing, system overload
- **Rollback Type**: Traffic routing or feature disable
- **Estimated Time**: 5-15 minutes

## Automated Rollback Triggers

### Critical Metrics Thresholds

```yaml
# Automated rollback triggers
rollback_triggers:
  payment_failure_rate:
    threshold: 50%
    window: 10m
    action: disable_paystack_integration

  api_error_rate:
    threshold: 50%
    window: 5m
    action: disable_paystack_integration

  webhook_processing_failure:
    threshold: 80%
    window: 15m
    action: disable_webhook_processing

  database_connection_errors:
    threshold: 20%
    window: 5m
    action: full_rollback

  response_time_p95:
    threshold: 30s
    window: 10m
    action: disable_paystack_integration
```

### Automated Rollback Script

```bash
#!/bin/bash
# automated-rollback.sh

ROLLBACK_TYPE=$1
REASON=$2

log_rollback() {
    echo "$(date): ROLLBACK - $1" >> /var/log/paystack-rollback.log
}

disable_paystack_integration() {
    log_rollback "Disabling Paystack integration - Reason: $REASON"

    # Set feature flag to disable Paystack
    export PAYSTACK_ENABLED=false

    # Restart API service
    systemctl restart polar-api

    # Verify service is healthy
    sleep 10
    if curl -f https://localhost:8000/api/v1/health; then
        log_rollback "Paystack integration disabled successfully"
        send_alert "Paystack integration disabled due to: $REASON"
    else
        log_rollback "ERROR: Service failed to restart after disabling Paystack"
        execute_full_rollback
    fi
}

execute_full_rollback() {
    log_rollback "Executing full application rollback - Reason: $REASON"

    # Stop services
    systemctl stop polar-api
    systemctl stop polar-worker

    # Rollback to previous stable version
    cd /opt/polar
    git checkout $(cat .last-stable-commit)

    # Restart services
    systemctl start polar-api
    systemctl start polar-worker

    # Verify rollback
    sleep 30
    if curl -f https://localhost:8000/api/v1/health; then
        log_rollback "Full rollback completed successfully"
        send_alert "Full rollback completed due to: $REASON"
    else
        log_rollback "CRITICAL: Full rollback failed"
        send_critical_alert "CRITICAL: Rollback failed - Manual intervention required"
    fi
}

case $ROLLBACK_TYPE in
    "disable_integration")
        disable_paystack_integration
        ;;
    "full_rollback")
        execute_full_rollback
        ;;
    *)
        echo "Usage: $0 {disable_integration|full_rollback} <reason>"
        exit 1
        ;;
esac
```

## Manual Rollback Procedures

### Procedure 1: Application Code Rollback

**When to Use**: Critical bugs in Paystack integration code

**Steps**:

1. **Identify Stable Version**
   ```bash
   # Check last stable commit
   cat /opt/polar/.last-stable-commit

   # Or check deployment history
   git log --oneline -10
   ```

2. **Stop Services**
   ```bash
   systemctl stop polar-api
   systemctl stop polar-worker
   ```

3. **Rollback Code**
   ```bash
   cd /opt/polar
   git checkout <stable-commit-hash>

   # Verify correct version
   git rev-parse HEAD
   ```

4. **Restart Services**
   ```bash
   systemctl start polar-api
   systemctl start polar-worker
   ```

5. **Verify Rollback**
   ```bash
   # Check service status
   systemctl status polar-api
   systemctl status polar-worker

   # Test API health
   curl -f https://localhost:8000/api/v1/health

   # Test Stripe payments still work
   curl -X POST https://localhost:8000/api/v1/checkout/test \
     -H "Content-Type: application/json" \
     -d '{"payment_processor": "stripe", "amount": 1000}'
   ```

### Procedure 2: Database Rollback

**When to Use**: Database migration causes issues

**Prerequisites**:
- Database backup created before migration
- Application services stopped

**Steps**:

1. **Create Current State Backup**
   ```bash
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
     > rollback_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Stop All Services**
   ```bash
   systemctl stop polar-api
   systemctl stop polar-worker
   systemctl stop polar-scheduler
   ```

3. **Restore Database**
   ```bash
   # Drop current database (CAUTION!)
   dropdb -h $DB_HOST -U $DB_USER $DB_NAME

   # Create new database
   createdb -h $DB_HOST -U $DB_USER $DB_NAME

   # Restore from backup
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME < paystack_pre_migration_backup.sql
   ```

4. **Rollback Application Code**
   ```bash
   cd /opt/polar
   git checkout <pre-migration-commit>
   ```

5. **Restart Services**
   ```bash
   systemctl start polar-api
   systemctl start polar-worker
   systemctl start polar-scheduler
   ```

6. **Verify Database Integrity**
   ```sql
   -- Connect to database
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME

   -- Check table counts
   SELECT COUNT(*) FROM organizations;
   SELECT COUNT(*) FROM orders;
   SELECT COUNT(*) FROM checkouts;

   -- Verify no Paystack fields exist
   \d organizations;
   ```

### Procedure 3: Feature Flag Rollback

**When to Use**: Quick disable of Paystack without code changes

**Steps**:

1. **Disable Paystack Integration**
   ```bash
   # Set environment variable
   export PAYSTACK_ENABLED=false

   # Or update configuration file
   echo "PAYSTACK_ENABLED=false" >> /opt/polar/.env
   ```

2. **Restart API Service**
   ```bash
   systemctl restart polar-api
   ```

3. **Verify Disable**
   ```bash
   # Check that Paystack endpoints return 404 or disabled message
   curl -X POST https://localhost:8000/api/v1/integrations/paystack/webhook

   # Should return service disabled message
   ```

### Procedure 4: Traffic Routing Rollback

**When to Use**: Performance issues, gradual rollback

**Steps**:

1. **Update Load Balancer Configuration**
   ```bash
   # Route all traffic to non-Paystack instances
   # This depends on your load balancer setup

   # Example for nginx
   sudo nano /etc/nginx/sites-available/polar

   # Comment out Paystack-enabled servers
   # upstream polar_backend {
   #     server 10.0.1.10:8000;  # Paystack enabled - DISABLED
   #     server 10.0.1.11:8000;  # Stripe only
   #     server 10.0.1.12:8000;  # Stripe only
   # }
   ```

2. **Reload Load Balancer**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Monitor Traffic**
   ```bash
   # Monitor that traffic is routing correctly
   tail -f /var/log/nginx/access.log
   ```

## Rollback Verification Procedures

### Health Check Script

```bash
#!/bin/bash
# verify-rollback.sh

echo "Starting rollback verification..."

# 1. Check service health
echo "Checking service health..."
if curl -f https://localhost:8000/api/v1/health; then
    echo "✓ API service is healthy"
else
    echo "✗ API service is unhealthy"
    exit 1
fi

# 2. Test Stripe payments
echo "Testing Stripe payment flow..."
STRIPE_TEST=$(curl -s -X POST https://localhost:8000/api/v1/checkout/test \
  -H "Content-Type: application/json" \
  -d '{"payment_processor": "stripe", "amount": 1000}')

if echo $STRIPE_TEST | grep -q "success"; then
    echo "✓ Stripe payments working"
else
    echo "✗ Stripe payments failed"
    exit 1
fi

# 3. Check database connectivity
echo "Testing database connectivity..."
if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
    exit 1
fi

# 4. Verify no Paystack data corruption
echo "Checking for data corruption..."
PAYSTACK_ORDERS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM orders WHERE stripe_invoice_id LIKE 'paystack_%';")

if [ "$PAYSTACK_ORDERS" -eq 0 ]; then
    echo "✓ No Paystack data corruption detected"
else
    echo "⚠ Warning: $PAYSTACK_ORDERS orders with Paystack references found"
fi

# 5. Test critical user flows
echo "Testing critical user flows..."
# Add specific tests for your critical flows

echo "Rollback verification completed successfully"
```

### Data Integrity Checks

```sql
-- data-integrity-check.sql

-- Check for orphaned Paystack data
SELECT 'Orphaned subaccount codes' as check_type, COUNT(*) as count
FROM organizations
WHERE subaccount_code IS NOT NULL;

-- Check for Paystack transaction references
SELECT 'Paystack transaction references' as check_type, COUNT(*) as count
FROM orders
WHERE stripe_invoice_id LIKE 'paystack_%';

-- Verify organization table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('subaccount_code', 'subaccount_status', 'mpesa_number');

-- Check for any remaining Paystack webhook events
SELECT 'Paystack webhook events' as check_type, COUNT(*) as count
FROM external_events
WHERE source = 'paystack';
```

## Communication Plan

### Internal Communication

**Immediate Notification** (within 5 minutes):
- Engineering team via Slack #alerts channel
- On-call engineer via PagerDuty
- Engineering manager via email/phone

**Status Updates** (every 15 minutes during rollback):
- Progress updates in #incident-response channel
- ETA updates to stakeholders
- Customer impact assessment

**Post-Rollback Communication** (within 1 hour):
- Incident summary to leadership
- Customer communication if needed
- Post-mortem scheduling

### External Communication

**Customer Notification Template**:
```
Subject: Temporary Payment Processing Update

Dear [Customer],

We are currently experiencing technical issues with our new payment
processing system. We have temporarily reverted to our previous system
to ensure uninterrupted service.

Your existing payment methods and subscriptions are not affected.

We apologize for any inconvenience and will provide updates as we
resolve this issue.

Best regards,
The [Company] Team
```

### Stakeholder Notification

**Executive Summary Template**:
```
INCIDENT SUMMARY

Time: [Timestamp]
Duration: [Duration]
Impact: [Customer impact description]
Root Cause: [Brief root cause]
Resolution: [Rollback action taken]
Next Steps: [Investigation and fix plan]

Current Status: RESOLVED via rollback
Customer Impact: MINIMAL (reverted to Stripe processing)
```

## Post-Rollback Procedures

### Immediate Actions (0-2 hours)

1. **Verify System Stability**
   - Monitor all critical metrics
   - Ensure no cascading failures
   - Validate customer payment flows

2. **Assess Data Impact**
   - Check for any data corruption
   - Verify payment processing continuity
   - Validate order/checkout integrity

3. **Customer Impact Assessment**
   - Identify affected customers
   - Check for failed payments during incident
   - Prepare customer communications if needed

### Short-term Actions (2-24 hours)

1. **Root Cause Analysis**
   - Investigate what triggered the rollback
   - Document timeline of events
   - Identify contributing factors

2. **Fix Development**
   - Develop fix for identified issues
   - Test fix in staging environment
   - Prepare deployment plan for fix

3. **Process Review**
   - Review rollback procedures effectiveness
   - Identify improvements needed
   - Update documentation based on learnings

### Long-term Actions (1-7 days)

1. **Post-Mortem Meeting**
   - Conduct blameless post-mortem
   - Document lessons learned
   - Create action items for prevention

2. **System Improvements**
   - Implement additional monitoring
   - Improve automated rollback procedures
   - Enhance testing procedures

3. **Re-deployment Planning**
   - Plan phased re-deployment of fixes
   - Implement additional safeguards
   - Schedule deployment with stakeholders

## Testing Rollback Procedures

### Staging Environment Testing

**Monthly Rollback Drills**:
1. Deploy Paystack integration to staging
2. Simulate various failure scenarios
3. Execute rollback procedures
4. Verify system recovery
5. Document any issues found

**Failure Scenarios to Test**:
- Database migration failure
- API authentication failure
- High error rate simulation
- Performance degradation
- Webhook processing failure

### Production Readiness Checklist

Before deploying Paystack integration:

- [ ] All rollback procedures tested in staging
- [ ] Automated rollback triggers configured
- [ ] Monitoring and alerting in place
- [ ] Communication plan documented
- [ ] Team trained on rollback procedures
- [ ] Database backups verified
- [ ] Rollback scripts tested and ready

## Emergency Contacts

### Internal Team
- **On-Call Engineer**: [Phone] / [Slack]
- **Engineering Manager**: [Phone] / [Email]
- **DevOps Lead**: [Phone] / [Slack]
- **Database Administrator**: [Phone] / [Email]

### External Vendors
- **Paystack Support**: support@paystack.com
- **Infrastructure Provider**: [Support contact]
- **Monitoring Service**: [Support contact]

### Escalation Path
1. On-Call Engineer (0-15 minutes)
2. Engineering Manager (15-30 minutes)
3. VP Engineering (30-60 minutes)
4. CTO (60+ minutes or customer impact)

Remember: The goal of any rollback is to restore system stability quickly while preserving data integrity. When in doubt, prioritize system stability over feature availability.
