#!/usr/bin/env python3
"""
Sync waitlist users from users.json to the database.

This script reads users from scripts/users.json and creates them in the database
if they don't already exist (based on email).

Usage:
    uv run python -m scripts.sync_waitlist_users
"""
import asyncio
import json
from pathlib import Path

import structlog
import typer
from sqlalchemy import func, select

from polar.kit.db.postgres import create_async_sessionmaker
from polar.models.user import User
from polar.postgres import create_async_engine

cli = typer.Typer()
log = structlog.get_logger()


async def sync_users() -> None:
    """Sync users from users.json to the database."""
    
    # Read users.json
    users_json_path = Path(__file__).parent / "users.json"
    
    if not users_json_path.exists():
        log.error("users.json not found", path=str(users_json_path))
        raise typer.Exit(code=1)
    
    log.info("Reading users from JSON file", path=str(users_json_path))
    
    with open(users_json_path, "r", encoding="utf-8") as f:
        users_data = json.load(f)
    
    log.info("Loaded users from JSON", total_users=len(users_data))
    
    # Create database session
    engine = create_async_engine("sync_waitlist_users")
    sessionmaker = create_async_sessionmaker(engine)
    
    async with sessionmaker() as session:
        stats = {
            "total": len(users_data),
            "created": 0,
            "skipped": 0,
            "errors": 0,
        }
        
        for user_data in users_data:
            email = user_data.get("email")
            
            if not email:
                log.warning("User missing email, skipping", user_id=user_data.get("id"))
                stats["errors"] += 1
                continue
            
            try:
                # Check if user already exists (case-insensitive)
                stmt = select(User).where(func.lower(User.email) == func.lower(email))
                existing_user = await session.scalar(stmt)
                
                if existing_user:
                    log.debug("User already exists, skipping", email=email)
                    stats["skipped"] += 1
                    continue
                
                # Create new user
                new_user = User(
                    email=email,
                    email_verified=user_data.get("email_verified", False),
                    avatar_url=user_data.get("image"),
                    is_admin=False,  # All waitlist users are normal users
                    accepted_terms_of_service=False,  # They need to accept on first login
                )
                
                session.add(new_user)
                await session.flush()
                
                log.info("Created new user", email=email, user_id=str(new_user.id))
                stats["created"] += 1
                
            except Exception as e:
                log.error("Error processing user", email=email, error=str(e))
                stats["errors"] += 1
                continue
        
        # Commit all changes
        await session.commit()
        
        # Log summary
        log.info(
            "User sync completed",
            total=stats["total"],
            created=stats["created"],
            skipped=stats["skipped"],
            errors=stats["errors"],
        )
        
        print("\n" + "="*60)
        print("WAITLIST USER SYNC SUMMARY")
        print("="*60)
        print(f"Total users in JSON:  {stats['total']}")
        print(f"New users created:    {stats['created']}")
        print(f"Existing users:       {stats['skipped']}")
        print(f"Errors:               {stats['errors']}")
        print("="*60 + "\n")
    
    await engine.dispose()


@cli.command()
def main() -> None:
    """Sync waitlist users from users.json to the database."""
    asyncio.run(sync_users())


if __name__ == "__main__":
    cli()
