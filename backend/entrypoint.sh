#!/bin/sh
python manage.py collectstatic --no-input
python manage.py migrate

python manage.py generate_dummy_data


exec "$@"

