"""
A profile's name heads every page its results run onto, not only the first.
Read from WeasyPrint's laid-out pages, as the sign-off tests do.
"""
from laboratory.tests.test_report_signoff import (  # noqa: F401  (fixtures)
    LONG_REPORT, api, boxes_with_class, lab_setup, laid_out_pages, make_visit, printed_text,
)


def test_a_long_profile_has_its_name_on_every_page(make_visit, monkeypatch):
    pages = laid_out_pages(make_visit(LONG_REPORT), monkeypatch)
    with_results = [page for page in pages if boxes_with_class(page, 'results')]
    assert len(with_results) > 1, 'the report should run past one page for this test'

    for number, page in enumerate(with_results, start=1):
        titles = boxes_with_class(page, 'section-title')
        assert titles, f'page {number} has results but no profile name'
        assert printed_text(titles[0]) == 'PANEL'


def test_the_columns_keep_their_widths(make_visit, monkeypatch):
    """The title row spans every column; the widths must still come from the columns."""
    page = laid_out_pages(make_visit(3), monkeypatch)[0]
    def header_cell(name):
        return next(box for box in boxes_with_class(page, name) if box.element.tag == 'th')

    name, flag = header_cell('col-name'), header_cell('col-flag')

    assert name.width > 3 * flag.width
