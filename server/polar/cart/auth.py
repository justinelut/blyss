from typing import Annotated

from fastapi import Depends

from polar.auth.dependencies import Authenticator
from polar.auth.models import Anonymous, AuthSubject, User
from polar.auth.scope import Scope

_CartRead = Authenticator(
    required_scopes={Scope.web_read, Scope.web_write, Scope.cart_read},
    allowed_subjects={User, Anonymous},
)
CartRead = Annotated[AuthSubject[User | Anonymous], Depends(_CartRead)]

_CartWrite = Authenticator(
    required_scopes={Scope.web_write, Scope.cart_write},
    allowed_subjects={User, Anonymous},
)
CartWrite = Annotated[AuthSubject[User | Anonymous], Depends(_CartWrite)]
