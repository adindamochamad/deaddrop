"""
Middleware autentikasi API key untuk endpoint write (jobs, scenario, chaos).
Jika API_KEY tidak diset di .env, middleware tidak aktif (mode demo/dev).
"""

import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

API_KEY = os.getenv("API_KEY", "")

# Path POST yang wajib autentikasi saat API_KEY diset
_PATH_TERLINDUNGI = {
    ("POST", "/api/jobs"),
    ("POST", "/api/scenario"),
}


def _perlu_auth(method: str, path: str) -> bool:
    if (method, path) in _PATH_TERLINDUNGI:
        return True
    if method == "POST" and path.startswith("/api/chaos/"):
        return True
    return False


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not API_KEY:
            return await call_next(request)

        if _perlu_auth(request.method, request.url.path):
            kunci = request.headers.get("X-API-Key", "")
            if kunci != API_KEY:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or missing X-API-Key header"},
                )

        return await call_next(request)
