"""Every PDF shares one font setup: see easymed/pdf.py for what happens otherwise."""
import weasyprint

from easymed.pdf import HTML


def test_documents_share_one_font_configuration():
    first = HTML(string='<p>One</p>').render()
    second = HTML(string='<p>Two</p>').render()

    assert first.font_config is second.font_config


def test_it_still_writes_a_pdf():
    assert HTML(string='<p>One</p>').write_pdf().startswith(b'%PDF')


def test_a_font_configuration_passed_in_is_respected():
    own = weasyprint.text.fonts.FontConfiguration()

    assert HTML(string='<p>One</p>').render(font_config=own).font_config is own
