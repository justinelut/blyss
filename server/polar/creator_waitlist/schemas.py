from pydantic import EmailStr

from polar.kit.schemas import Schema


class CreatorWaitlistCreate(Schema):
    """Body for joining the creator waitlist.

    Only the email is accepted from the client. The country is resolved
    server-side from the organization's stored creator_country — never
    from the request body — so it can't be spoofed.
    """

    email: EmailStr


class CreatorWaitlistEntryResponse(Schema):
    joined: bool
