"""A small JSON-over-HTTPS helper, so the integrations need no extra dependency."""
import base64
import json
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_TIMEOUT = 20


class IntegrationError(Exception):
    """An outside service refused the request or could not be reached."""

    def __init__(self, message, status=None, body=None):
        super().__init__(message)
        self.status = status
        self.body = body


def request_json(method, url, *, payload=None, headers=None, form=None, basic_auth=None,
                 timeout=DEFAULT_TIMEOUT):
    """Send JSON (or a form) and return the decoded JSON reply, or raise IntegrationError."""
    headers = dict(headers or {})
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers.setdefault('Content-Type', 'application/json')
    elif form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers.setdefault('Content-Type', 'application/x-www-form-urlencoded')
    headers.setdefault('Accept', 'application/json')
    if basic_auth:
        token = base64.b64encode(f"{basic_auth[0]}:{basic_auth[1]}".encode()).decode()
        headers['Authorization'] = f"Basic {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode() or '{}'
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors='replace')
        raise IntegrationError(f"{url} answered {exc.code}: {body[:300]}", exc.code, body)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise IntegrationError(f"Could not reach {url}: {exc}")
    try:
        return json.loads(body)
    except ValueError:
        raise IntegrationError(f"{url} did not answer JSON: {body[:300]}", body=body)
