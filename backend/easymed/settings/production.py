from .base import *
import os
from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Off unless the server's .env says otherwise. With DEBUG on, any error page
# shows settings, URLs and local variables, and Django keeps every SQL query
# of a request in memory.
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = ["*"]