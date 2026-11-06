"""
WeasyPrint, as every PDF in the system should use it: `from easymed.pdf import HTML`.

Left to itself WeasyPrint builds a new FontConfiguration for each document. With
the Pango and Fontconfig in our Alpine image, garbage collecting those segfaults
the whole Python process, sooner or later, so one is kept for the life of the
process. Pango isn't thread safe, so sharing it means rendering one at a time.
"""
import threading

import weasyprint
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


class HTML(weasyprint.HTML):
    def render(self, font_config=None, *args, **kwargs):
        with _lock:
            return super().render(font_config or _shared_font_config(), *args, **kwargs)

    def write_pdf(self, *args, **kwargs):
        # Calls render() above for its fonts, and writes them out using them.
        with _lock:
            return super().write_pdf(*args, **kwargs)
