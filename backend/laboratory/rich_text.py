"""
Formatted text typed into the lab's settings: lists, tables and images.

It ends up as HTML in the lab report, which WeasyPrint renders on the server, and
in the browser. WeasyPrint fetches whatever an image points at, so an unchecked
`<img src="file:///...">` could print a server file onto a report. Everything is
therefore rebuilt from an allowlist, and an image must carry its own bytes.
"""
import re
from html import unescape

import html5lib
from django.template.defaultfilters import linebreaksbr
from django.utils.html import strip_tags
from django.utils.safestring import mark_safe
from html5lib.filters.base import Filter
from html5lib.serializer import HTMLSerializer

# About 1.5 MB of images once encoded. Kept below Django's 2.5 MB request limit.
MAX_RICH_TEXT_LENGTH = 2 * 1024 * 1024

ALLOWED_TAGS = frozenset({
    'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'del', 'div', 'em',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'span',
    'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
})
# Removed along with what is inside them. Any other unknown tag loses only the tag.
DROPPED_WITH_CONTENT = frozenset({
    'applet', 'base', 'button', 'embed', 'form', 'frame', 'frameset', 'head', 'iframe', 'input', 'link',
    'math', 'meta', 'noscript', 'object', 'script', 'select', 'style', 'svg', 'template', 'textarea', 'title',
})
ALLOWED_STYLES = frozenset({
    'background-color', 'border', 'border-bottom', 'border-collapse', 'border-color', 'border-left',
    'border-right', 'border-style', 'border-top', 'border-width', 'color', 'font-size', 'font-style',
    'font-weight', 'height', 'line-height', 'margin-left', 'padding', 'padding-left', 'text-align',
    'text-decoration', 'vertical-align', 'width',
})

SAFE_STYLE_VALUE = re.compile(r'^[#\w\s.,%()-]+$')
SAFE_SIZE = re.compile(r'^\d+(\.\d+)?(%|px)?$')
SAFE_SPAN = re.compile(r'^\d{1,3}$')
SAFE_LINK = re.compile(r'^(https?://|mailto:)', re.IGNORECASE)
# SVG is left out on purpose: it can reference other files.
SAFE_IMAGE = re.compile(r'^data:image/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$', re.IGNORECASE)
LOOKS_LIKE_HTML = re.compile(r'<\s*/?\s*[a-zA-Z!][^>]*>')


def _clean_style(style):
    kept = []
    for declaration in style.split(';'):
        prop, _, value = declaration.partition(':')
        prop, value = prop.strip().lower(), value.strip()
        if prop in ALLOWED_STYLES and SAFE_STYLE_VALUE.match(value) and 'url' not in value.lower():
            kept.append(f'{prop}: {value}')
    return '; '.join(kept)


def _clean_attribute(tag, name, value):
    """The value to keep for this attribute, or None to remove it."""
    if name == 'style':
        return _clean_style(value) or None
    if name in ('colspan', 'rowspan'):
        return value if SAFE_SPAN.match(value) else None
    if name in ('width', 'height'):
        return value if SAFE_SIZE.match(value) else None
    if tag == 'a' and name == 'href':
        return value if SAFE_LINK.match(value.strip()) else None
    if tag == 'img' and name == 'alt':
        return value
    return None


class _Allowlist(Filter):
    def __init__(self, source, images):
        super().__init__(source)
        self.images = images

    def _image_allowed(self, token):
        return self.images and SAFE_IMAGE.match(token['data'].get((None, 'src'), '').strip())

    def __iter__(self):
        dropping = 0
        for token in super().__iter__():
            kind, name = token['type'], token.get('name')
            is_tag = kind in ('StartTag', 'EmptyTag', 'EndTag')

            if is_tag and name in DROPPED_WITH_CONTENT:
                dropping += {'StartTag': 1, 'EndTag': -1}.get(kind, 0)
                continue
            if dropping or kind in ('Comment', 'Doctype', 'Entity'):
                continue
            if is_tag and name not in ALLOWED_TAGS:
                continue

            if kind in ('StartTag', 'EmptyTag'):
                attributes = {}
                if name == 'img':
                    if not self._image_allowed(token):
                        continue
                    attributes[(None, 'src')] = token['data'][(None, 'src')].strip()
                for (namespace, attribute), value in token['data'].items():
                    kept = None if namespace else _clean_attribute(name, attribute, value)
                    if kept is not None:
                        attributes[(None, attribute)] = kept
                token['data'] = attributes
            yield token


def sanitize_html(value, images=True):
    fragment = html5lib.parseFragment(value, treebuilder='etree', namespaceHTMLElements=False)
    stream = html5lib.getTreeWalker('etree')(fragment)
    serializer = HTMLSerializer(omit_optional_tags=False, quote_attr_values='always')
    return serializer.render(_Allowlist(stream, images))


def rich_text_html(value):
    """
    Safe to print as it stands. Text saved before the editor existed, or that has
    no markup, is plain: it is escaped and keeps its line breaks.
    """
    if not value:
        return ''
    if LOOKS_LIKE_HTML.search(value):
        return mark_safe(sanitize_html(value))
    return linebreaksbr(value, autoescape=True)


def without_images(value):
    """The same text with its images taken out."""
    if not value or not LOOKS_LIKE_HTML.search(value):
        return value
    return sanitize_html(value, images=False)


def has_content(html):
    """False for what an editor leaves behind when emptied, such as `<p><br></p>`."""
    return '<img' in html or bool(unescape(strip_tags(html)).strip())
