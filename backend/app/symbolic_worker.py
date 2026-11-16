"""Disposable worker; input only contains item data, never BYOK headers."""

import json
import sys

from .limits import SYMBOLIC_CPU_SECONDS, SYMBOLIC_MEMORY_BYTES

try:
    import resource

    resource.setrlimit(resource.RLIMIT_CPU, (SYMBOLIC_CPU_SECONDS, SYMBOLIC_CPU_SECONDS))
    resource.setrlimit(resource.RLIMIT_AS, (SYMBOLIC_MEMORY_BYTES, SYMBOLIC_MEMORY_BYTES))
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
