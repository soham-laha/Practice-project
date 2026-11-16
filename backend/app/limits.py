"""Fixed execution budgets; no request or environment can raise these limits.

A low-CPU host needs more elapsed time than CPU time for a disposable worker's
imports and algebra. Keep the computational/memory caps while allowing bounded
scheduler delay. Provider + symbolic wall budgets fit the frontend's 110s proxy
upstream timeout on an already-running service (cold starts remain host-owned).
"""

SYMBOLIC_WALL_SECONDS = 30
SYMBOLIC_CPU_SECONDS = 6
SYMBOLIC_MEMORY_BYTES = 512 * 1024 * 1024
GEMINI_WALL_SECONDS = 75
