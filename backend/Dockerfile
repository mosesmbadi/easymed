FROM python:3.11-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apk update && apk add --no-cache \
    python3-dev \
    gcc \
    libc-dev \
    weasyprint \
    ttf-dejavu \
    fontconfig

WORKDIR /app

RUN pip install --upgrade pip
RUN pip install uvicorn
ADD ./requirements.txt /app/
RUN pip install -r requirements.txt


COPY . /app

EXPOSE 8080

RUN chmod +x ./entrypoint.sh
ENTRYPOINT [ "./entrypoint.sh" ]




