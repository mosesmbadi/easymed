#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

from django.core.management.commands.runserver import Command as runserver


def main():
    """Run administrative tasks."""
    args = sys.argv

    runserver.default_port = 8080

    if "docker" in args:
        os.environ.setdefault(
            "DJANGO_SETTINGS_MODULE", "easymed.settings.production"
        )
    elif "test" in args or "pytest" in args:
        os.environ.setdefault(
            "DJANGO_SETTINGS_MODULE", "easymed.settings.testing"
        )
    else:
        os.environ.setdefault(
            "DJANGO_SETTINGS_MODULE", "easymed.settings.development"
        )

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()


# #!/usr/bin/env python
# """Django's command-line utility for administrative tasks."""
# import os
# import sys
# from decouple import config

# config.read_env()


# def main():
#     """Run administrative tasks."""
#     os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easymed.settings')
#     try:
#         from django.core.management import execute_from_command_line
#     except ImportError as exc:
#         raise ImportError(
#             "Couldn't import Django. Are you sure it's installed and "
#             "available on your PYTHONPATH environment variable? Did you "
#             "forget to activate a virtual environment?"
#         ) from exc
#     execute_from_command_line(sys.argv)


# if __name__ == '__main__':
#     main()
