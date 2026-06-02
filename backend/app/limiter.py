from slowapi import Limiter
from slowapi.util import get_remote_address

# Key function uses X-Forwarded-For when present, falls back to direct client IP.
# Swap storage_uri to "redis://localhost:6379" for multi-instance deployments.
limiter = Limiter(key_func=get_remote_address)
