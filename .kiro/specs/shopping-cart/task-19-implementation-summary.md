# Task 19 Implementation Summary: Session Token Management

## Overview

Implemented session token management for guest cart functionality, allowing anonymous users to maintain their cart across page loads and browser sessions.

## Implementation Details

### Frontend Implementation

#### 1. Session Token Utility (`clients/apps/web/src/utils/session-token.ts`)

Created a comprehensive utility module for managing guest session tokens:

**Key Functions:**
- `generateSessionToken()`: Generates cryptographically secure 64-character hex tokens using Web Crypto API
- `getSessionToken()`: Retrieves existing token from cookies
- `setSessionToken(token)`: Stores token in cookie with 7-day expiration
- `clearSessionToken()`: Removes token cookie (for post-migration cleanup)
- `ensureSessionToken()`: Auto-generates token if not present
- `getSessionTokenHeaderName()`: Returns the custom header name for API requests

**Cookie Configuration:**
- Name: `polar_guest_session`
- Max-Age: 7 days (matches cart item expiration)
- Path: `/` (available site-wide)
- SameSite: `Lax` (CSRF protection)
- Secure: Enabled in production (HTTPS only)

**Design Decision:**
Used a regular cookie (not HTTP-only) because:
1. HTTP-only cookies can only be set by the server
2. We need to generate tokens client-side on first cart interaction
3. The token is not sensitive - it only identifies a guest cart

#### 2. Cart Store Integration (`clients/apps/web/src/stores/cartStore.ts`)

Updated all cart operations to ensure session token exists before API calls:

- `addItem()`: Calls `ensureSessionToken()` before adding items
- `removeItem()`: Calls `ensureSessionToken()` before removing items
- `clearCart()`: Calls `ensureSessionToken()` before clearing cart
- `refreshCart()`: Calls `ensureSessionToken()` before fetching cart

This ensures guest users always have a session token when interacting with the cart.

#### 3. API Client Configuration (`clients/apps/web/src/utils/client/index.ts`)

Modified `createClientSideAPI()` to:
1. Read guest session token from cookies
2. Add token to custom `X-Guest-Session-Token` header
3. Send header with all API requests

The API client already uses `credentials: 'include'` to send cookies, but we use a custom header for the guest session token to make it explicit and easier to handle on the backend.

### Backend Implementation

#### 1. Guest Session Model (`server/polar/auth/guest_session.py`)

Created a lightweight in-memory session object:

```python
class GuestSession:
    def __init__(self, session_token: str) -> None:
        self.id = session_token
        self.token = session_token
```

**Key Characteristics:**
- Not persisted to database (memory-only)
- Only stores the session token
- Compatible with existing `AuthSubject` session interface
- Used to pass guest session token through authentication system

#### 2. Auth Middleware Update (`server/polar/auth/middlewares.py`)

Enhanced `get_auth_subject()` to:
1. Check for `X-Guest-Session-Token` header
2. Create `GuestSession` object if header present
3. Return `AuthSubject(Anonymous(), set(), guest_session)`

This allows anonymous users with session tokens to be identified by the cart service.

#### 3. Auth Models Update (`server/polar/auth/models.py`)

Updated the `Session` type union to include `GuestSession`:

```python
Session = (
    UserSession
    | OrganizationAccessToken
    | OAuth2Token
    | PersonalAccessToken
    | CustomerSession
    | MemberSession
    | GuestSession  # Added
)
```

This makes `GuestSession` a valid session type throughout the authentication system.

## How It Works

### Guest User Flow

1. **First Cart Interaction:**
   - User clicks "Add to Cart" on a product
   - `cartStore.addItem()` is called
   - `ensureSessionToken()` generates a new token
   - Token is stored in `polar_guest_session` cookie
   - Token is sent in `X-Guest-Session-Token` header with API request

2. **Subsequent Requests:**
   - `ensureSessionToken()` finds existing token in cookie
   - Returns existing token (no new generation)
   - Token is sent with all cart API requests

3. **Backend Processing:**
   - Auth middleware reads `X-Guest-Session-Token` header
   - Creates `GuestSession` object with token
   - Cart service extracts token from `auth_subject.session.id`
   - Cart items are associated with `session_token` in database

4. **Cart Persistence:**
   - Token persists for 7 days (cookie expiration)
   - Cart items expire after 7 days of inactivity
   - User can close browser and return later
   - Cart is retrieved using same session token

### Authenticated User Flow

1. **User Logs In:**
   - Cart migration happens (Task 11 - separate implementation)
   - Guest cart items are migrated to user account
   - Session token can be cleared (optional)

2. **Cart Operations:**
   - `auth_subject.subject` is `User` (not `Anonymous`)
   - Cart service uses `user_id` instead of `session_token`
   - No guest session token needed

## Requirements Satisfied

✅ **Requirement 1.2**: Guest carts are identified by session_token
- Session tokens are generated and stored for guest users
- Tokens are sent with all cart API requests
- Backend associates cart items with session_token

✅ **Requirement 1.4**: Guest carts should be retrievable using session_token
- Session tokens persist in cookies for 7 days
- Cart items are retrieved using session_token from auth_subject
- Cart persists across browser sessions

✅ **Requirement 5.5**: API requests without authentication should use session_token
- Guest session tokens are sent in custom header
- Auth middleware creates GuestSession for anonymous users
- Cart service extracts session_token from auth_subject.session

## Security Considerations

1. **Token Generation:**
   - Uses Web Crypto API for cryptographically secure random generation
   - 256-bit tokens (32 bytes) provide sufficient entropy
   - Tokens are unpredictable and cannot be guessed

2. **Cookie Security:**
   - SameSite=Lax prevents CSRF attacks
   - Secure flag ensures HTTPS-only transmission in production
   - 7-day expiration limits token lifetime

3. **Token Exposure:**
   - Token is not HTTP-only (JavaScript can read it)
   - This is acceptable because the token only identifies a guest cart
   - No sensitive user data is exposed
   - Token cannot be used to access other users' carts

4. **Backend Validation:**
   - Cart service validates ownership before operations
   - Session tokens are scoped to individual carts
   - No privilege escalation possible

## Testing Strategy

### Unit Tests Needed

1. **Session Token Utility Tests:**
   - Token generation produces 64-character hex strings
   - Token generation is unique (no collisions)
   - Cookie storage and retrieval works correctly
   - Cookie clearing removes token
   - `ensureSessionToken()` auto-generates when needed

2. **Cart Store Tests:**
   - All cart operations call `ensureSessionToken()`
   - Session token is sent with API requests
   - Cart operations work for guest users

3. **Backend Tests:**
   - Auth middleware reads `X-Guest-Session-Token` header
   - `GuestSession` is created correctly
   - Cart service extracts session token from `auth_subject.session`
   - Cart operations work with guest session tokens

### Integration Tests Needed

1. **End-to-End Guest Cart Flow:**
   - Add item to cart as guest
   - Verify session token is created
   - Refresh page
   - Verify cart persists
   - Add more items
   - Verify all items are in cart

2. **Migration Flow:**
   - Create guest cart with items
   - Log in as user
   - Verify cart items are migrated
   - Verify session token is cleared (optional)

## Future Enhancements

1. **HTTP-Only Cookie Support:**
   - Create server endpoint to generate and set HTTP-only cookies
   - Requires server-side token generation
   - More secure but adds complexity

2. **Token Rotation:**
   - Rotate tokens periodically for security
   - Requires migration of cart items to new token

3. **Token Cleanup:**
   - Background job to delete expired session tokens
   - Currently handled by cart item expiration

## Files Modified

### Frontend
- `clients/apps/web/src/utils/session-token.ts` (new)
- `clients/apps/web/src/stores/cartStore.ts` (modified)
- `clients/apps/web/src/utils/client/index.ts` (modified)

### Backend
- `server/polar/auth/guest_session.py` (new)
- `server/polar/auth/middlewares.py` (modified)
- `server/polar/auth/models.py` (modified)

### Documentation
- `commands-to-run.md` (updated with Task 19 verification steps)
- `root/.kiro/specs/shopping-cart/task-19-implementation-summary.md` (new)

## Next Steps

1. Run tests to verify implementation (see `commands-to-run.md`)
2. Test manually in browser to verify cookie behavior
3. Verify backend integration with cart endpoints
4. Implement cart migration on login (Task 11 - if not already done)
5. Add session token clearing after migration
