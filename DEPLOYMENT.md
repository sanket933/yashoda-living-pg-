# YAHODA Living PG Management System - Production Deployment Guide

## Deployment Options

This guide covers multiple deployment options for the YAHODA Living PG Management System:

1. **Docker Compose** (Recommended for small to medium deployments)
2. **Cloud Services** (AWS, DigitalOcean, Render, Railway)
3. **VPS/Traditional Hosting** (Ubuntu/CentOS)

## Prerequisites

- Domain name
- SSL certificate (Let's Encrypt recommended)
- Production database (MongoDB Atlas or self-hosted)
- Production email service (Gmail SMTP, SendGrid, Mailgun)
- Razorpay production account
- Cloudinary account (for file storage)

## Option 1: Docker Compose Deployment

### 1. Prepare Environment Variables

```bash
# Copy production environment file
cp server/.env.production server/.env

# Update with your production values
nano server/.env
```

### 2. Configure Docker Compose

Update `docker-compose.yml` with your specific configurations:
- Update environment variables
- Configure port mappings
- Set up volume mounts

### 3. Build and Start Services

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### 4. Configure Nginx (Optional)

Create `nginx.conf` for reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Backend API
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL Certificate Setup

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to nginx ssl directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
```

## Option 2: Cloud Service Deployment

### AWS Deployment

#### 1. Set up MongoDB Atlas

1. Create MongoDB Atlas account
2. Create a free tier cluster
3. Get connection string
4. Update `MONGO_URI` in environment variables

#### 2. Deploy Backend to AWS Elastic Beanstalk

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Initialize Elastic Beanstalk
eb init -p node.js yahoda-backend

# Create environment
eb create production-env

# Deploy
eb deploy
```

#### 3. Deploy Frontend to AWS S3 + CloudFront

```bash
# Build frontend
cd client
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Configure CloudFront distribution
# Point to S3 bucket
# Set up custom domain
```

### DigitalOcean Deployment

#### 1. Create Droplet

- Ubuntu 22.04 LTS
- 2GB RAM minimum
- Enable Docker

#### 2. Deploy with Docker Compose

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Clone repository
git clone <repository-url>
cd yahooda-living-web-site

# Copy environment file
cp server/.env.production server/.env
nano server/.env

# Start services
docker-compose up -d
```

#### 3. Configure Domain

- Add A record in DNS settings
- Point to droplet IP address
- Set up SSL with Let's Encrypt

### Render Deployment

#### 1. Deploy Backend

1. Connect GitHub repository to Render
2. Create new web service
3. Configure:
   - Build Command: `cd server && npm install`
   - Start Command: `node src/server.js`
   - Environment Variables: Add all from `.env.production`

#### 2. Deploy Frontend

1. Create new static site
2. Configure:
   - Build Command: `cd client && npm run build`
   - Publish Directory: `client/dist`
   - Environment Variables: Add `VITE_API_URL`

#### 3. Set up MongoDB Atlas

- Use MongoDB Atlas for database
- Update `MONGO_URI` in Render environment variables

## Option 3: VPS Deployment (Ubuntu)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Clone Repository

```bash
# Clone repository
cd /var/www
sudo git clone <repository-url> yahoda-living
sudo chown -R $USER:$USER yahoda-living
cd yahoda-living
```

### 3. Install Dependencies

```bash
# Backend dependencies
cd server
npm install --production

# Frontend dependencies
cd ../client
npm install
npm run build
```

### 4. Configure Environment

```bash
cd /var/www/yahoda-living/server
cp .env.production .env
nano .env
```

### 5. Start Backend with PM2

```bash
cd /var/www/yahoda-living/server
pm2 start src/server.js --name yahoda-backend
pm2 save
pm2 startup
```

### 6. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/yahoda-living
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/yahoda-living/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/yahoda-living /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Database Setup

### MongoDB Atlas (Recommended)

1. Create free tier account
2. Create cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for cloud deployment)
5. Get connection string
6. Update `MONGO_URI` in environment

### Self-Hosted MongoDB

```bash
# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB on boot
sudo systemctl enable mongod

# Create admin user
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "your_password",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})

# Enable authentication
sudo nano /etc/mongod.conf
# Set security.authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall (UFW)
- [ ] Set up fail2ban for brute force protection
- [ ] Enable MongoDB authentication
- [ ] Use environment variables for sensitive data
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Monitor logs regularly

## Monitoring and Logging

### Application Logs

```bash
# PM2 logs
pm2 logs yahoda-backend

# Docker logs
docker-compose logs -f backend

# Application logs
tail -f /var/www/yahoda-living/server/logs/app.log
```

### Database Monitoring

- Use MongoDB Atlas for built-in monitoring
- Set up alerts for high CPU/memory usage
- Monitor slow queries

### Performance Monitoring

Consider using:
- New Relic
- Datadog
- Sentry (for error tracking)

## Backup Strategy

### Database Backups

```bash
# MongoDB backup
mongodump --uri="mongodb://user:pass@host:port/db" --out /backup/$(date +%Y%m%d)

# Automated backup with cron
0 2 * * * mongodump --uri="mongodb://user:pass@host:port/db" --out /backup/$(date +%Y%m%d)
```

### Application Backups

```bash
# Backup application files
tar -czf /backup/yahoda-$(date +%Y%m%d).tar.gz /var/www/yahoda-living
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (Nginx, HAProxy)
- Deploy multiple backend instances
- Use shared session storage (Redis)
- Use CDN for static assets

### Database Scaling

- Use MongoDB Atlas for automatic scaling
- Implement read replicas
- Use connection pooling
- Optimize indexes

## Troubleshooting

### Common Issues

**Service won't start:**
- Check logs: `pm2 logs` or `docker-compose logs`
- Verify environment variables
- Check database connection

**Database connection failed:**
- Verify MongoDB is running
- Check connection string
- Verify IP whitelist (MongoDB Atlas)
- Check firewall rules

**Email not sending:**
- Verify SMTP credentials
- Check email service status
- Review email logs
- Test with Ethereal in development

**Payment failures:**
- Verify Razorpay keys
- Check webhook secret
- Review payment logs
- Test with Razorpay test mode

## Maintenance

### Regular Tasks

- **Daily:** Monitor logs and errors
- **Weekly:** Review security updates
- **Monthly:** Database backups verification
- **Quarterly:** Security audit
- **Annually:** Disaster recovery testing

### Updates

```bash
# Update application
cd /var/www/yahoda-living
git pull origin main
cd server
npm install --production
pm2 restart yahoda-backend

# Update dependencies
npm audit fix
npm update
```

## Support

For production issues:
1. Check logs first
2. Review this documentation
3. Check service status
4. Verify environment configuration
5. Contact support if needed
