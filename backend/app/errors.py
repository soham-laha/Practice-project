"""Small, fixed diagnostic vocabulary. Never retain provider text or input values."""

import os
import re
from typing import Literal

from fastapi import HTTPException

Stage = Literal["provider", "format", "verification"]


def revision() -> str:
    value = os.getenv("RENDER_GIT_COMMIT", os.getenv("TARGETJEE_REVISION", ""))
    return value[:8] if re.fullmatch(r"[a-f0-9]{40}", value) else "workspace"


class EngineError(HTTPException):
    def __init__(self, status: int, detail: str, code: str, stage: Stage = "provider") -> None:
        super().__init__(status, detail)
        self.code = code
        self.stage = stage
