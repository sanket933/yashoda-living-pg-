# YAHODA Living PG Management System - Development Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6.0 or higher)
- Git
- A code editor (VS Code recommended)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd yashooda-living-web-site
```

### 2. Install Dependencies

#### Backend Dependencies

```bash
cd server
npm install
```

#### Frontend Dependencies

```bash
cd ../client
npm install
```

### 3. Environment Configuration

#### Backend Environment Setup

1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Update the `.env` file with your local configuration:

```env
# MongoDB Configuration
MONGO_URI=mongodb://127.0.0.1:27017/yahoda_living

# JWT Configuration
JWT_SECRET=yahoda-living-secret-key-change-in-production
JWT_EXPIRES_IN_ADMIN=8h
JWT_EXPIRES_IN_STUDENT=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Client Configuration
CLIENT_URL=http://localhost:5173

# Email Configuration (Development - Use Ethereal for testing)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_ethereal_email
EMAIL_PASS=your_ethereal_password
EMAIL_FROM=YAHODA LIVING <your_ethereal_email>

# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=your_test_razorpay_key_id
RAZORPAY_KEY_SECRET=your_test_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_test_razorpay_webhook_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,application/pdf

# Cron Job Configuration
ENABLE_CRON_JOBS=true
CRON_REMINDER_TIME=0 9 * * *
CRON_OVERDUE_CHECK_TIME=0 10 * * *
CRON_WEEKLY_SUMMARY_TIME=0 9 * * 1

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Session Configuration
SESSION_SECRET=your_session_secret_change_in_production
SESSION_MAX_AGE=86400000
```

#### Frontend Environment Setup

1. Create a `.env` file in the client directory:
```bash
cd ../client
touch .env
```

2. Add the following configuration:
```env
VITE_API_URL=http://localhost:5000
VITE_CLIENT_URL=http://localhost:5173
```

### 4. MongoDB Setup

#### Option A: Local MongoDB Installation

1. Install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - Windows: Run MongoDB as a service
   - Mac/Linux: `sudo systemctl start mongod`
3. Verify MongoDB is running:
```bash
mongosh
```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGO_URI` in your `.env` file

### 5. Start Development Servers

#### Start Backend Server

```bash
cd server
npm run dev
```

The backend will run on `http://localhost:5000`

#### Start Frontend Server

In a new terminal:

```bash
cd client
npm run dev
```

The frontend will run on `http://localhost:5173`

### 6. Seed Initial Data

The backend will automatically seed initial data on first startup, including:
- Default admin user (email: admin@yahoda.com, password: admin123)
- Sample packages
- Sample rooms

## Development Workflow

### Running Tests

```bash
cd server
npm test
```

### Code Formatting

```bash
# Format code
npm run format

# Lint code
npm run lint
```

### Database Management

#### Reset Database

```bash
cd server
npm run seed:reset
```

#### View Database Logs

```bash
cd server
npm run db:logs
```

## Common Development Tasks

### Adding a New API Endpoint

1. Add the route in `server/src/server.js`
2. Use appropriate middleware (`auth`, `requireStudent`, `requireAdmin`)
3. Implement error handling with try-catch
4. Add activity logging for admin actions
5. Test the endpoint using Postman or curl

### Adding a New Model

1. Define the schema in `server/src/models/index.js`
2. Add appropriate indexes for performance
3. Export the model
4. Update seed data if needed

### Adding Email Templates

1. Create template in `server/src/config/email.js`
2. Use the template in appropriate endpoints
3. Test with Ethereal in development

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongosh`
- Check connection string in `.env`
- Verify MongoDB is accessible on the configured port

### Port Already in Use

- Find process using the port: `netstat -ano | findstr :5000`
- Kill the process: `taskkill /F /PID <PID>`
- Or change the PORT in `.env`

### Email Not Sending

- In development, emails use Ethereal (test email service)
- Check Ethereal credentials in `.env`
- View email logs in console
- For production, configure SMTP settings

### Cron Jobs Not Running

- Ensure `ENABLE_CRON_JOBS=true` in `.env`
- Check cron syntax in `server/src/server.js`
- Verify server is running continuously

## Development Best Practices

1. **Always use environment variables** for sensitive data
2. **Never commit `.env` files** to version control
3. **Use the `auth` middleware** on all protected routes
4. **Log admin actions** to the ActivityLog collection
5. **Validate input** before processing
6. **Handle errors gracefully** with try-catch blocks
7. **Use indexes** for frequently queried fields
8. **Test in development** before deploying to production

## API Documentation

### Admin Endpoints

- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/students` - List students (with pagination)
- `POST /api/admin/students` - Create student
- `PUT /api/admin/students/:id` - Update student
- `DELETE /api/admin/students/:id` - Archive student
- `GET /api/admin/payments` - List payments (with pagination)
- `POST /api/admin/payments` - Create payment
- `GET /api/admin/rooms` - List rooms (with pagination)
- `POST /api/admin/rooms` - Create room
- `GET /api/admin/packages` - List packages (with pagination)
- `POST /api/admin/packages` - Create package
- `GET /api/admin/reports` - Financial reports (with filters)
- `GET /api/admin/activity-log` - Activity log (with pagination)

### Student Endpoints

- `POST /api/student/login` - Student login
- `POST /api/student/request-otp` - Request OTP
- `GET /api/student/dashboard` - Student dashboard
- `GET /api/student/notifications` - List notifications
- `PUT /api/student/notifications/:id/read` - Mark notification as read
- `POST /api/student/payments` - Make payment
- `POST /api/student/receipts` - Upload receipt
- `GET /api/student/receipts` - List receipts

### Payment Endpoints

- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify Razorpay payment

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in the console
3. Check MongoDB logs
4. Verify environment configuration
