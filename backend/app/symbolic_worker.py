"""Disposable worker; input only contains item data, never BYOK headers."""

import json
import sys

try:
    import resource

    resource.setrlimit(resource.RLIMIT_CPU, (6, 6))
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
except (ImportError, ValueError):
    pass
from .schemas import Item
from .symbolic import verify_item

try:
    items = json.load(sys.stdin)
    print(json.dumps({"results": [verify_item(Item.model_validate(i)) for i in items]}))
except (
    ValueError,
    TypeError,
    KeyError,
    RecursionError,
    ArithmeticError,
    NotImplementedError,
) as exc:
    # No input text or header is included in errors.
    print(json.dumps({"error": str(exc) if isinstance(exc, ValueError) else "Verification failed"}))
