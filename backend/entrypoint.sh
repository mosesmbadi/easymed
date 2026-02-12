#!/bin/sh
python manage.py collectstatic --no-input
python manage.py migrate

case "${GENERATE_DEMO_DATA:-true}" in
	true|True|TRUE|1|yes|YES)
		python manage.py generate_dummy_data
		;;
	*)
		echo "Skipping demo data generation (GENERATE_DEMO_DATA=${GENERATE_DEMO_DATA})."
		;;
esac


exec "$@"

