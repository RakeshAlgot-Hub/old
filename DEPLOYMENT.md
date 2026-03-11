# Deployment Guide for AWS EC2 (Free Tier)

This guide helps you deploy the backend to an AWS EC2 `t2.micro` or `t3.micro` instance using Docker and Docker Compose.

## 1. Prerequisites
- An AWS Account.
- EC2 Instance (Ubuntu 22.04 LTS recommended).
- Security Group configured to allow:
    - SSH (Port 22)
    - HTTP (Port 80)
    - HTTPS (Port 443)

## 2. Server Setup
Once you've SSHed into your EC2 instance:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Add your user to the docker group
sudo usermod -aG docker $USER
# (Log out and log back in for this to take effect)
```

## 3. Clone and Configure
Clone your repository to the server:

```bash
git clone <your-repo-url>
cd <repo-folder>
```

Create and configure your `.env` file:
```bash
cp api/.env.example api/.env
nano api/.env
```
*Tip: For `MONGO_URL`, use a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) to save memory on your EC2 instance.*

## 4. Deployment
Start the services:

```bash
docker compose up -d --build
```

Check the status:
```bash
docker compose ps
docker compose logs -f backend
```

## 5. SSL (Optional but Recommended)
To enable HTTPS, use Certbot with Nginx:

```bash
sudo apt-get install certbot python3-certbot-nginx -y
# Note: You need a domain name pointing to your EC2 IP
sudo certbot --nginx -d yourdomain.com
```

## 6. Performance Optimization for Free Tier
- **SWAP Space:** t2.micro has only 1GB RAM. It's highly recommended to add 2GB of swap space to prevent the server from crashing.
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

- **Database:** Avoid running MongoDB locally on the same instance if possible; use MongoDB Atlas.
- **Workers:** Keep the number of Gunicorn workers low (set to 2 in the Dockerfile).
