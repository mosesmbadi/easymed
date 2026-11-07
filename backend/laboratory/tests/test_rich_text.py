"""What may reach the lab report and the screens from a formatted interpretation."""
import pytest

from laboratory.models import LabTestInterpretation, LabTestProfile
from laboratory.rich_text import MAX_RICH_TEXT_LENGTH, has_content, rich_text_html, without_images
from laboratory.serializers import LabTestInterpretationSerializer

PNG = (
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)


def test_lists_tables_and_formatting_survive():
    html = (
        '<h2>Stages</h2><p style="text-align: center;"><strong>GFR</strong></p>'
        '<ol><li>Normal</li></ol><ul><li>Note</li></ul>'
        '<table><thead><tr><th>Stage</th></tr></thead><tbody><tr><td colspan="2">1</td></tr></tbody></table>'
    )

    cleaned = rich_text_html(html)

    for kept in ('<h2>', 'text-align: center', '<strong>', '<ol>', '<ul>', '<li>', '<table>', '<th>', 'colspan="2"'):
        assert kept in cleaned


def test_an_embedded_image_survives():
    assert f'src="{PNG}"' in rich_text_html(f'<p><img src="{PNG}" width="120" alt="Chart"></p>')


@pytest.mark.parametrize('source', [
    'file:///etc/passwd',
    'http://169.254.169.254/latest/meta-data/',
    'https://example.com/a.png',
    '/media/signatures/a.png',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:text/html;base64,PGh0bWw+PC9odG1sPg==',
])
def test_an_image_pointing_anywhere_else_is_removed(source):
    assert '<img' not in rich_text_html(f'<p>Text<img src="{source}"></p>')


@pytest.mark.parametrize('dangerous, gone', [
    ('<script>alert(1)</script>', 'alert'),
    ('<style>body { display: none }</style>', 'display'),
    ('<iframe src="file:///etc/passwd"></iframe>', 'passwd'),
    ('<svg><image href="file:///etc/passwd"/></svg>', 'passwd'),
    ('<p onclick="alert(1)">x</p>', 'onclick'),
    ('<a href="javascript:alert(1)">x</a>', 'javascript'),
    ('<p style="background-image: url(file:///etc/passwd)">x</p>', 'passwd'),
    ('<p style="position: fixed">x</p>', 'position'),
    ('<link rel="stylesheet" href="http://example.com/a.css">', 'stylesheet'),
])
def test_anything_active_is_removed(dangerous, gone):
    assert gone not in rich_text_html(f'{dangerous}<p>Kept</p>')
    assert 'Kept' in rich_text_html(f'{dangerous}<p>Kept</p>')


def test_an_unknown_tag_goes_but_its_text_stays():
    assert rich_text_html('<p><font>Kept</font></p>') == '<p>Kept</p>'


@pytest.mark.parametrize('html, expected', [
    ('<p>Kept</p><p><br></p>', '<p>Kept</p>'),
    ('<p>Kept</p><p>&nbsp;</p><p></p>', '<p>Kept</p>'),
    ('<p>Kept</p><p style="text-align: center;"><br></p>', '<p>Kept</p>'),
    ('<ol><li>Kept</li></ol><p><br></p>', '<ol><li>Kept</li></ol>'),
    ('<table><tbody><tr><td>Kept</td></tr></tbody></table><p><br></p>',
     '<table><tbody><tr><td>Kept</td></tr></tbody></table>'),
])
def test_blank_lines_at_the_end_are_dropped(html, expected):
    assert rich_text_html(html) == expected


@pytest.mark.parametrize('html', [
    '<p>One</p><p><br></p><p>Two</p>',
    '<p><br></p><p>Kept</p>',
    f'<p>Kept</p><p><img src="{PNG}"></p>',
    '<p>Kept</p><p><br></p>Loose text',
])
def test_anything_else_is_left_as_typed(html):
    assert rich_text_html(html) == html


def test_plain_text_is_escaped_and_keeps_its_line_breaks():
    assert rich_text_html('Stage 1: >= 90\nStage 5: <15') == 'Stage 1: &gt;= 90<br>Stage 5: &lt;15'


def test_nothing_gives_nothing():
    assert rich_text_html(None) == ''


def test_without_images_keeps_the_rest():
    assert without_images(f'<p>Kept<img src="{PNG}"></p>') == '<p>Kept</p>'
    assert without_images('Plain\ntext') == 'Plain\ntext'


@pytest.mark.parametrize('html, expected', [
    ('<p><br></p>', False),
    ('<p>&nbsp;</p>', False),
    ('<p>Text</p>', True),
    (f'<p><img src="{PNG}"></p>', True),
])
def test_has_content(html, expected):
    assert has_content(html) is expected


@pytest.fixture
def profile(db):
    return LabTestProfile.objects.create(name='UEC')


def save(profile, interpretation):
    return LabTestInterpretationSerializer(data={'test_profile': profile.id, 'interpretation': interpretation})


def test_saving_stores_the_cleaned_html(profile):
    serializer = save(profile, '<ul><li>Kept</li></ul><script>alert(1)</script>')

    assert serializer.is_valid(), serializer.errors
    assert serializer.save().interpretation == '<ul><li>Kept</li></ul>'


def test_an_emptied_editor_is_refused(profile):
    serializer = save(profile, '<p><br></p>')

    assert not serializer.is_valid()
    assert 'interpretation' in serializer.errors


def test_one_that_is_too_large_is_refused(profile):
    serializer = save(profile, f'<p>{"x" * MAX_RICH_TEXT_LENGTH}</p>')

    assert not serializer.is_valid()
    assert 'too large' in str(serializer.errors['interpretation'])


def test_what_is_already_stored_is_cleaned_on_the_way_out(profile):
    row = LabTestInterpretation.objects.create(
        test_profile=profile, interpretation='<p>Kept</p><script>alert(1)</script>')

    assert LabTestInterpretationSerializer(row).data['interpretation'] == '<p>Kept</p>'
