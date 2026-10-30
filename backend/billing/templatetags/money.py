from decimal import Decimal, InvalidOperation

from django import template
from django.conf import settings

register = template.Library()


def _get_fraction_digits() -> int:
    try:
        return int(getattr(settings, "EASYMED_CURRENCY_FRACTION_DIGITS", 2))
    except (TypeError, ValueError):
        return 2


def _get_currency_label() -> str:
    symbol = getattr(settings, "EASYMED_CURRENCY_SYMBOL", "")
    code = getattr(settings, "EASYMED_CURRENCY_CODE", "")
    return (symbol or code or "").strip()


@register.filter(name="money")
def money(value):
    """Format numeric values as money using deployment-configured currency settings."""

    if value is None or value == "":
        return ""

    digits = _get_fraction_digits()
    label = _get_currency_label()

    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return f"{label} {value}".strip() if label else str(value)

    if digits <= 0:
        quant = Decimal("1")
        formatted = f"{amount.quantize(quant):,.0f}"
    else:
        quant = Decimal("1." + ("0" * digits))
        formatted = f"{amount.quantize(quant):,.{digits}f}"

    return f"{label} {formatted}".strip() if label else formatted
