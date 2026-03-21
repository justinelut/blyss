# Waitlist Users Sync

This document explains how to sync waitlist users from `scripts/users.json` to the database.

## Overview

The `sync_waitlist_users.py` script reads users from `scripts/users.json` and creates them in the database if they don't already exist (based on email address).

## Features

- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Skip existing users**: Checks email (case-insensitive) before creating
- ✅ **Transaction-based**: All changes committed together
- ✅ **Detailed logging**: Shows what was created, skipped, or errored
- ✅ **Non-blocking**: Won't fail deployment if sync fails

## Automatic Sync

The script runs automatically during deployment:

1. **GitHub Actions**: Runs when you push to `master` branch
2. **Update Script**: Runs when you execute `update.sh` on the server

## Manual Sync

### Local Development

```bash
cd server
uv run python -m scripts.sync_waitlist_users
```

### On Production Server

```bash
# SSH into server
ssh ubuntu@server.blyss.co.ke

# Switch to blyss user
sudo su - blyss

# Navigate to server directory
cd /opt/blyss/blyss/server

# Run sync script
/home/blyss/.local/bin/uv run python -m scripts.sync_waitlist_users
```

## User Data Mapping

The script maps JSON fields to database fields:

| JSON Field | Database Field | Notes |
|------------|----------------|-------|
| `email` | `email` | Required, unique (case-insensitive) |
| `email_verified` | `email_verified` | Boolean, defaults to `false` |
| `image` | `avatar_url` | Optional, Google profile picture URL |
| `role` | `is_admin` | Always `false` for waitlist users |
| `name` | - | Not stored (User model doesn't have name field) |
| `created_at` | - | Not used (DB uses its own timestamp) |

## Output Example

```
============================================================
WAITLIST USER SYNC SUMMARY
============================================================
Total users in JSON:  45
New users created:    44
Existing users:       1
Errors:               0
============================================================
```

## User Properties

All synced users have:
- `is_admin = False` (normal users, not admins)
- `accepted_terms_of_service = False` (must accept on first login)
- `email_verified` = from JSON (usually `true` for Google OAuth users)
- `avatar_url` = from JSON (Google profile picture if available)

## Skipped Users

Users are skipped if:
- Email already exists in database (case-insensitive match)
- Email is missing from JSON data

Example: `justinequartz@gmail.com` will be skipped if you already signed up with it.

## Error Handling

- Missing email: Logs warning and continues
- Database errors: Logs error and continues with next user
- File not found: Exits with error code 1
- Sync failures during deployment: Logs warning but doesn't fail deployment

## Verification

After running the script, verify users were created:

```bash
# On server
sudo -u postgres psql -d blyss -c "SELECT email, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
```

Or check the logs:

```bash
sudo journalctl -u blyss-api -n 100 | grep "Created new user"
```

## Troubleshooting

### Script fails with "users.json not found"

Make sure `scripts/users.json` exists:
```bash
ls -la server/scripts/users.json
```

### Users not being created

Check the logs for errors:
```bash
uv run python -m scripts.sync_waitlist_users
```

Look for error messages in the output.

### Duplicate email errors

This shouldn't happen as the script checks for existing emails first. If it does, it means there's a race condition or the email check failed.

## Adding New Users

To add new waitlist users:

1. Update `server/scripts/users.json` with new user data
2. Commit and push to `master` branch
3. GitHub Actions will automatically sync the new users
4. Or run the script manually (see above)

## Security Notes

- `users.json` should NOT be committed to git if it contains sensitive data
- Currently it's in the repository for deployment purposes
- Consider moving to environment variables or secrets management for production
- Users created from waitlist need to accept terms of service on first login
