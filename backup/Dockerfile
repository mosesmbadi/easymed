FROM postgres:15

RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

COPY backup.sh /backup.sh
COPY restore.sh /restore.sh
COPY list-backups.sh /list-backups.sh
COPY crontab /etc/cron.d/backup-cron

RUN chmod +x /backup.sh /restore.sh /list-backups.sh && \
    chmod 0644 /etc/cron.d/backup-cron && \
    crontab /etc/cron.d/backup-cron && \
    mkdir -p /backups

VOLUME /backups

# Start cron in the foreground and log output
CMD ["sh", "-c", "printenv > /etc/environment && cron -f"]
