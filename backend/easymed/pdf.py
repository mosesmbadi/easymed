"""
WeasyPrint, as every PDF in the system should use it: `from easymed.pdf import HTML`.

Left to itself WeasyPrint builds a new FontConfiguration for each document. With
the Pango and Fontconfig in our Alpine image, garbage collecting those segfaults
the whole Python process, sooner or later, so one is kept for the life of the
process. Pango isn't thread safe, so sharing it means rendering one at a time.

Images are read from disk, not downloaded. Views hand templates absolute URLs
such as http://api:8080/images/Company/logo.png; left to itself WeasyPrint
would fetch those over HTTP from the very server that is rendering, which
only works while Django serves /images/ and costs a request per image. The
url_fetcher below reads anything under MEDIA_URL or STATIC_URL straight from
MEDIA_ROOT / STATIC_ROOT, whatever host the URL names, and passes every other
URL to WeasyPrint's own fetcher.
"""
import mimetypes
import threading
from pathlib import Path
from urllib.parse import unquote, urlsplit

import weasyprint
from django.conf import settings
from weasyprint.text.fonts import FontConfiguration

_lock = threading.RLock()
_font_config = None


def _shared_font_config():
    # Made on first use, so that it belongs to the process doing the rendering
    # rather than to a parent that a Celery worker was forked from.
    global _font_config
    if _font_config is None:
        _font_config = FontConfiguration()
    return _font_config


def local_file_for(url):
    """
    The file on disk an http(s) URL under MEDIA_URL or STATIC_URL names, or
    None. Never anything outside those two directories.
    """
    parts = urlsplit(url)
    if parts.scheme not in ('http', 'https'):
        return None
    path = unquote(parts.path)
    for prefix, root in ((settings.MEDIA_URL, settings.MEDIA_ROOT),
                         (settings.STATIC_URL, settings.STATIC_ROOT)):
        if not (prefix and root and path.startswith(prefix)):
            continue
        root = Path(root).resolve()
        candidate = (root / path[len(prefix):]).resolve()
        if candidate.is_relative_to(root) and candidate.is_file():
            return candidate
    return None


def url_fetcher(url, *args, **kwargs):
    local = local_file_for(url)
    if local is None:
        return weasyprint.default_url_fetcher(url, *args, **kwargs)
    return {
        'string': local.read_bytes(),
        'mime_type': mimetypes.guess_type(local.name)[0] or 'application/octet-stream',
        'redirected_url': url,
        'filename': local.name,
    }


class HTML(weasyprint.HTML):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('url_fetcher', url_fetcher)
        super().__init__(*args, **kwargs)

    def render(self, font_config=None, *args, **kwargs):
        with _lock:
            return super().render(font_config or _shared_font_config(), *args, **kwargs)

    def write_pdf(self, *args, **kwargs):
        # Calls render() above for its fonts, and writes them out using them.
        with _lock:
            return super().write_pdf(*args, **kwargs)
