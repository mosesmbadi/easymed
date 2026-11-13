"""
Uploads keep working with DEBUG off (the test settings run with it off).

The frontend shows the logo through Django's /images/ route, and PDFs embed
the logo and signatures by URL. Both used to depend on DEBUG being on, which
is why production ran with it on.
"""
import base64

import pytest
from django.conf import settings

from easymed import pdf
from easymed.pdf import HTML, local_file_for, url_fetcher

PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')


@pytest.fixture
def logo():
    # MEDIA_ROOT is a temporary directory for every test (see conftest.py).
    path = settings.MEDIA_ROOT / 'Company' / 'company-logo' / 'logo.png'
    path.parent.mkdir(parents=True)
    path.write_bytes(PNG)
    return path


def test_debug_is_off_here():
    assert settings.DEBUG is False


@pytest.mark.django_db
def test_an_upload_is_served_with_debug_off(client, logo):
    response = client.get('/images/Company/company-logo/logo.png')

    assert response.status_code == 200
    assert b''.join(response.streaming_content) == PNG


@pytest.mark.django_db
def test_the_media_route_stays_inside_media_root(client, logo):
    # Django refuses the path outright (400) or finds nothing (404).
    assert client.get('/images/../settings/base.py').status_code in (400, 404)


def test_a_pdf_reads_an_upload_from_disk_whatever_host_the_url_names(logo):
    assert local_file_for('http://api:8080/images/Company/company-logo/logo.png') == logo.resolve()
    assert local_file_for('https://lim.example.com/images/Company/company-logo/logo.png') == logo.resolve()


def test_a_pdf_never_reads_outside_media_and_static(logo):
    assert local_file_for('http://api:8080/images/../../../etc/passwd') is None
    assert local_file_for('http://api:8080/images/%2e%2e/%2e%2e/etc/passwd') is None
    assert local_file_for('file:///etc/passwd') is None
    assert local_file_for('http://api:8080/images/missing.png') is None


def test_an_upload_is_fetched_without_an_http_request(logo, monkeypatch):
    def no_network(url, *args, **kwargs):
        raise AssertionError(f'fetched over the network: {url}')
    monkeypatch.setattr(pdf.weasyprint, 'default_url_fetcher', no_network)

    fetched = url_fetcher('http://api:8080/images/Company/company-logo/logo.png')

    assert fetched['string'] == PNG
    assert fetched['mime_type'] == 'image/png'


def test_every_pdf_uses_the_disk_fetcher():
    assert HTML(string='<p>One</p>').url_fetcher is url_fetcher


def test_other_urls_still_go_to_weasyprint(monkeypatch):
    seen = []
    monkeypatch.setattr(pdf.weasyprint, 'default_url_fetcher',
                        lambda url, *a, **k: seen.append(url) or {'string': b'', 'mime_type': 'text/css'})

    url_fetcher('https://cdn.example.com/style.css')

    assert seen == ['https://cdn.example.com/style.css']
