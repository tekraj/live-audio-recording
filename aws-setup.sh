#!/bin/bash
# Send output to log for debugging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/stdout) 2>&1

# 1. Standard Updates
apt-get update -y
apt-get install -y ca-certificates curl git

# 2. Setup Docker Repository
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Install Docker
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Permissions Setup
systemctl start docker
systemctl enable docker
groupadd -f docker
usermod -aG docker ubuntu
chown root:docker /var/run/docker.sock

# 5. FIX: Handle GitHub SSH fingerprinting
mkdir -p /root/.ssh
ssh-keyscan github.com >> /root/.ssh/known_hosts

# 6. Clone the Repo
cd /home/ubuntu
git clone https://github.com/tekraj/live-audio-recording.git 
chown -R ubuntu:ubuntu live-audio-recording