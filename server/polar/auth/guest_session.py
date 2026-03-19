"""
Guest session for anonymous cart functionality.

Guest sessions are lightweight session objects that only store a session token
for identifying guest carts. Unlike CustomerSession or UserSession, they are
not persisted to the database - they only exist in memory during the request.
"""


class GuestSession:
    """
    In-memory session object for guest users.

    This is used to pass the guest session token through the authentication
    system without requiring database persistence.
    """

    def __init__(self, session_token: str) -> None:
        self.id = session_token
        self.token = session_token

    def __repr__(self) -> str:
        return f"GuestSession(token={self.token[:8]}...)"
