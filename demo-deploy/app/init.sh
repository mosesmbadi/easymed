#!/bin/bash

DISK_DEVICE="/dev/xvdf"
MOUNT_POINT="/srv/postgres_data"

# Format only if not already formatted
if ! blkid $DISK_DEVICE; then
    mkfs.ext4 $DISK_DEVICE
fi

mkdir -p $MOUNT_POINT
mount $DISK_DEVICE $MOUNT_POINT

# Update /etc/fstab to persist mount
echo "$DISK_DEVICE $MOUNT_POINT ext4 defaults,nofail 0 2" >> /etc/fstab


# Install Docker
if ! command -v docker &> /dev/null; then
  sudo apt-get update
  sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker ubuntu
fi

# Optional: Install legacy docker-compose (if needed for 'docker-compose' command)
if ! command -v docker-compose &> /dev/null; then
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# to refresh group membership
newgrp docker <<EONG
docker version
EONG