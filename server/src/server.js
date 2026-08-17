import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import cron from 'node-cron';

import { connectDB, disconnectDB } from './config/db.js';
import { sendStudentInvitation, sendPaymentConfirmation, sendPaymentReminder } from './config/email.js';
import auth, { requireStudent, requireStudentAccess } from './middleware/auth.js';
import { errorHandler, notFound, asyncHandler } from './middleware/errorHandler.js';
import { AdminUser, User, Package, Student, Room, RentRecord, Payment, Expense, FeePlan, PortalAccess, PGSettings, Installment, Receipt, ActivityLog, Notification } from './models/index.js';
import { seedData } from './seed.js';
import { buildDashboardSummary } from './services/adminService.js';
import { normalizePaymentPayload } from './utils/paymentValidation.js';

dotenv.config();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

// Configure Multer for file uploads (in-memory storage for now, can be replaced with Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'));
    }
  },
});

const app = express();
const PORT = process.env.PORT || 5000;
const memoryStore = {
  adminUsers: [
    {
      _id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@yahoda.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
    },
  ],
  settings: {
    _id: 'settings-1',
    name: 'YAHODA LIVING',
    ownerName: 'Yahoda Living Admin',
    address: 'Near raisoni collage wagholi,Pune',
    phone: '+91 98765 43210',
    email: 'admin@yahoda.com',
    logo: '',
    defaultMonthlyRent: 8000,
    defaultDueDate: 5,
    currency: 'INR',
    paymentMethods: ['Cash', 'UPI', 'Bank Transfer'],
  },
  students: [
    {
      _id: 'student-1',
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul@example.com',
      room: 'A-101',
      bed: 'A-101-1',
      monthlyRent: 8000,
      securityDeposit: 16000,
      joiningDate: new Date('2026-07-02').toISOString(),
      status: 'Active',
      archived: false,
      createdAt: new Date('2026-07-02').toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'student-2',
      name: 'Priya Nair',
      phone: '9876543211',
      email: 'priya@example.com',
      room: 'A-102',
      bed: 'A-102-1',
      monthlyRent: 8500,
      securityDeposit: 17000,
      joiningDate: new Date('2026-06-15').toISOString(),
      status: 'Active',
      archived: false,
      createdAt: new Date('2026-06-15').toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'student-3',
      name: 'Karthik Reddy',
      phone: '9876543212',
      email: 'karthik@example.com',
      room: 'B-201',
      bed: 'B-201-1',
      monthlyRent: 7200,
      securityDeposit: 14400,
      joiningDate: new Date('2026-05-10').toISOString(),
      status: 'Active',
      archived: false,
      createdAt: new Date('2026-05-10').toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'student-4',
      name: 'Ananya Joshi',
      phone: '9876543213',
      email: 'ananya@example.com',
      room: 'B-202',
      bed: 'B-202-1',
      monthlyRent: 7800,
      securityDeposit: 15600,
      joiningDate: new Date('2026-08-01').toISOString(),
      status: 'Vacating',
      archived: false,
      createdAt: new Date('2026-08-01').toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  rooms: [
    {
      _id: 'room-1',
      roomNumber: 'A-101',
      type: 'Single',
      monthlyRent: 8000,
      status: 'Occupied',
      beds: [{ bedNumber: 'A-101-1', status: 'Occupied', studentId: 'student-1' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'room-2',
      roomNumber: 'A-102',
      type: 'Single',
      monthlyRent: 8500,
      status: 'Occupied',
      beds: [{ bedNumber: 'A-102-1', status: 'Occupied', studentId: 'student-2' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'room-3',
      roomNumber: 'B-201',
      type: 'Double',
      monthlyRent: 7200,
      status: 'Occupied',
      beds: [{ bedNumber: 'B-201-1', status: 'Occupied', studentId: 'student-3' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'room-4',
      roomNumber: 'B-202',
      type: 'Double',
      monthlyRent: 7800,
      status: 'Occupied',
      beds: [{ bedNumber: 'B-202-1', status: 'Occupied', studentId: 'student-4' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  rentRecords: [
    {
      _id: 'rent-1',
      studentId: 'student-1',
      studentName: 'Rahul Sharma',
      room: 'A-101',
      month: '2026-08',
      baseRent: 8000,
      additionalCharges: 300,
      discount: 0,
      totalAmount: 8300,
      paidAmount: 8300,
      remainingAmount: 0,
      status: 'Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'rent-2',
      studentId: 'student-2',
      studentName: 'Priya Nair',
      room: 'A-102',
      month: '2026-08',
      baseRent: 8500,
      additionalCharges: 400,
      discount: 0,
      totalAmount: 8900,
      paidAmount: 6000,
      remainingAmount: 2900,
      status: 'Partial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'rent-3',
      studentId: 'student-3',
      studentName: 'Karthik Reddy',
      room: 'B-201',
      month: '2026-08',
      baseRent: 7200,
      additionalCharges: 250,
      discount: 200,
      totalAmount: 7250,
      paidAmount: 7250,
      remainingAmount: 0,
      status: 'Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'rent-4',
      studentId: 'student-4',
      studentName: 'Ananya Joshi',
      room: 'B-202',
      month: '2026-08',
      baseRent: 7800,
      additionalCharges: 500,
      discount: 0,
      totalAmount: 8300,
      paidAmount: 3500,
      remainingAmount: 4800,
      status: 'Partial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  payments: [
    {
      _id: 'payment-1',
      studentId: 'student-1',
      studentName: 'Rahul Sharma',
      room: 'A-101',
      amount: 8300,
      paymentMode: 'UPI',
      paymentDate: new Date('2026-08-05').toISOString(),
      receiptNumber: 'RCPT-1001',
      transactionId: 'TXN-1001',
      notes: 'Monthly rent payment',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'payment-2',
      studentId: 'student-2',
      studentName: 'Priya Nair',
      room: 'A-102',
      amount: 6000,
      paymentMode: 'Bank Transfer',
      paymentDate: new Date('2026-08-07').toISOString(),
      receiptNumber: 'RCPT-1002',
      transactionId: 'TXN-1002',
      notes: 'Advance rent and maintenance',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'payment-3',
      studentId: 'student-3',
      studentName: 'Karthik Reddy',
      room: 'B-201',
      amount: 7250,
      paymentMode: 'Cash',
      paymentDate: new Date('2026-08-09').toISOString(),
      receiptNumber: 'RCPT-1003',
      transactionId: 'TXN-1003',
      notes: 'Full rent for August',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'payment-4',
      studentId: 'student-4',
      studentName: 'Ananya Joshi',
      room: 'B-202',
      amount: 3500,
      paymentMode: 'UPI',
      paymentDate: new Date('2026-08-11').toISOString(),
      receiptNumber: 'RCPT-1004',
      transactionId: 'TXN-1004',
      notes: 'Partial payment before vacating',
      createdAt: new Date().toISOString(),
    },
  ],
  packages: [
    { _id: 'package-1', name: 'Food Package', description: 'Complete package with food included', amount: 120000, foodIncluded: true, duration: 12, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'package-2', name: 'Without Food Package', description: 'Package without food', amount: 70000, foodIncluded: false, duration: 12, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  feePlans: [
    { _id: 'plan-1', name: 'Standard Stay', amount: 7500, billingCycle: 'Monthly', dueDay: 5, description: 'Basic room + utilities', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'plan-2', name: 'Premium Stay', amount: 9500, billingCycle: 'Monthly', dueDay: 5, description: 'Premium room with higher amenities', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  users: [
    {
      _id: 'user-1',
      email: 'rahul@example.com',
      passwordHash: bcrypt.hashSync('YH1234', 10),
      role: 'student',
      studentId: 'student-1',
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'user-2',
      email: 'priya@example.com',
      passwordHash: bcrypt.hashSync('YH5678', 10),
      role: 'student',
      studentId: 'student-2',
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'user-3',
      email: 'karthik@example.com',
      passwordHash: bcrypt.hashSync('YH9012', 10),
      role: 'student',
      studentId: 'student-3',
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'user-4',
      email: 'ananya@example.com',
      passwordHash: bcrypt.hashSync('YH3456', 10),
      role: 'student',
      studentId: 'student-4',
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  portalAccess: [
    { _id: 'portal-1', studentId: 'student-1', studentName: 'Rahul Sharma', email: 'rahul@example.com', portalEnabled: true, status: 'Active', accessCode: 'YH-1001', lastLoginAt: new Date('2026-08-12').toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'portal-2', studentId: 'student-2', studentName: 'Priya Nair', email: 'priya@example.com', portalEnabled: true, status: 'Active', accessCode: 'YH-1002', lastLoginAt: new Date('2026-08-13').toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  expenses: [
    {
      _id: 'expense-1',
      title: 'Electricity Bill',
      category: 'Utilities',
      amount: 4600,
      date: new Date('2026-08-05').toISOString(),
      notes: 'Monthly electricity charges for common areas',
      receiptUrl: '',
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'expense-2',
      title: 'Water Supply',
      category: 'Utilities',
      amount: 1800,
      date: new Date('2026-08-06').toISOString(),
      notes: 'Daily water supply for residents',
      receiptUrl: '',
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'expense-3',
      title: 'Housekeeping Materials',
      category: 'Maintenance',
      amount: 3200,
      date: new Date('2026-08-08').toISOString(),
      notes: 'Soap, broom, detergent and cleaning tools',
      receiptUrl: '',
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'expense-4',
      title: 'Wi-Fi Recharge',
      category: 'Internet',
      amount: 2500,
      date: new Date('2026-08-12').toISOString(),
      notes: 'Monthly broadband recharge',
      receiptUrl: '',
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  installments: [
    {
      _id: 'installment-1',
      rentRecordId: 'rent-1',
      studentId: 'student-1',
      studentName: 'Rahul Sharma',
      installmentNumber: 1,
      totalInstallments: 2,
      amountDue: 4000,
      amountPaid: 4000,
      remainingAmount: 0,
      dueDate: new Date('2026-08-20').toISOString(),
      status: 'Paid',
      paidDate: new Date('2026-08-18').toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'installment-2',
      rentRecordId: 'rent-1',
      studentId: 'student-1',
      studentName: 'Rahul Sharma',
      installmentNumber: 2,
      totalInstallments: 2,
      amountDue: 4000,
      amountPaid: 0,
      remainingAmount: 4000,
      dueDate: new Date('2026-09-05').toISOString(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  receipts: [
    {
      _id: 'receipt-1',
      paymentId: 'payment-1',
      studentId: 'student-1',
      studentName: 'Rahul Sharma',
      amount: 8000,
      receiptImage: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      originalFilename: 'receipt_aug_2026.jpg',
      fileSize: 245678,
      mimeType: 'image/jpeg',
      uploadedAt: new Date('2026-08-15').toISOString(),
      verificationStatus: 'Approved',
      verifiedBy: 'admin-1',
      verifiedAt: new Date('2026-08-15').toISOString(),
      verificationNotes: 'Receipt verified and matched with payment record',
      createdAt: new Date('2026-08-15').toISOString(),
      updatedAt: new Date('2026-08-15').toISOString(),
    },
  ],
  activityLogs: [
    {
      _id: 'log-1',
      adminId: 'admin-1',
      adminName: 'Super Admin',
      action: 'Settings Changed',
      entity: 'PGSettings',
      entityId: 'settings-1',
      previousValue: { defaultDueDate: 5 },
      newValue: { defaultDueDate: 6 },
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'log-2',
      adminId: 'admin-1',
      adminName: 'Super Admin',
      action: 'Room Added',
      entity: 'Room',
      entityId: 'A-101',
      previousValue: null,
      newValue: { roomNumber: 'A-101', status: 'Occupied' },
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'log-3',
      adminId: 'admin-1',
      adminName: 'Super Admin',
      action: 'Payment Added',
      entity: 'Payment',
      entityId: 'RCPT-1001',
      previousValue: null,
      newValue: { studentName: 'Rahul Sharma', amount: 8300 },
      createdAt: new Date().toISOString(),
    },
  ],
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Root Endpoint
app.get('/api/', (req, res) => {
  res.json({
    message: 'YAHODA LIVING API',
    version: '1.0.0',
    endpoints: {
      admin: {
        login: '/api/admin/login',
        dashboard: '/api/admin/dashboard',
        students: '/api/admin/students',
        payments: '/api/admin/payments',
        rooms: '/api/admin/rooms',
        packages: '/api/admin/packages',
        settings: '/api/admin/settings',
        activityLog: '/api/admin/activity-log'
      },
      student: {
        login: '/api/student/login',
        dashboard: '/api/student/dashboard',
        requestOtp: '/api/student/request-otp',
        payments: '/api/student/payments'
      }
    }
  });
});

// Input Validation Middleware
const validateStudent = (req, res, next) => {
  const { name, phone, email, monthlyRent, securityDeposit } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters' });
  }
  
  if (!phone || !/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ message: 'Phone must be a valid 10-digit number' });
  }
  
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Email must be a valid email address' });
  }
  
  if (monthlyRent !== undefined && (isNaN(monthlyRent) || Number(monthlyRent) < 0)) {
    return res.status(400).json({ message: 'Monthly rent must be a positive number' });
  }
  
  if (securityDeposit !== undefined && (isNaN(securityDeposit) || Number(securityDeposit) < 0)) {
    return res.status(400).json({ message: 'Security deposit must be a positive number' });
  }
  
  next();
};

const validatePayment = (req, res, next) => {
  const { amount, paymentMode, studentId } = req.body;
  
  if (!studentId) {
    return res.status(400).json({ message: 'Student ID is required' });
  }
  
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  
  if (!paymentMode || !['Cash', 'UPI', 'Bank Transfer', 'Cheque'].includes(paymentMode)) {
    return res.status(400).json({ message: 'Payment mode must be Cash, UPI, Bank Transfer, or Cheque' });
  }
  
  next();
};

const validateExpense = (req, res, next) => {
  const { title, amount, category } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ message: 'Title must be at least 2 characters' });
  }
  
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  
  if (!category || !['Utilities', 'Maintenance', 'Food', 'Rent', 'Staff', 'Other'].includes(category)) {
    return res.status(400).json({ message: 'Category must be valid' });
  }
  
  next();
};

const validatePackage = (req, res, next) => {
  const { name, amount, duration } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ message: 'Package name must be at least 2 characters' });
  }
  
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  
  if (!duration || isNaN(duration) || Number(duration) < 1 || Number(duration) > 60) {
    return res.status(400).json({ message: 'Duration must be between 1 and 60 months' });
  }
  
  next();
};

app.get('/api/health', async (_, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const storage = mongoose.connection.readyState === 1 ? 'mongodb' : 'memory';
    
    return res.json({
      server: 'ok',
      database: dbStatus,
      storage: storage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      server: 'error',
      database: 'error',
      storage: 'unknown',
      error: error.message
    });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await AdminUser.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET || 'yahoda-living-secret', { expiresIn: '8h' });
  return res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/student/login', async (req, res) => {
  const { email, password, otp } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  if (otp) {
    if (user.otp !== otp || new Date(user.otpExpires) < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }
    user.otp = null;
    user.otpExpires = null;
  } else {
    const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordMatch) return res.status(401).json({ message: 'Invalid credentials' });
  }
  await user.save();
  const token = jwt.sign({ id: user._id, email: user.email, role: user.role, studentId: user.studentId }, process.env.JWT_SECRET || 'yahoda-living-secret', { expiresIn: '7d' });
  return res.json({ token, user: { id: user._id, email: user.email, role: user.role, studentId: user.studentId } });
});

app.get('/api/student/dashboard', auth, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.studentId || req.user.id;
    // ... (rest of the code remains the same)
    
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    
    const [rentRecords, payments, installments, plan] = await Promise.all([
      RentRecord.find({ studentId: student._id }).sort({ month: -1 }),
      Payment.find({ studentId: student._id }).sort({ createdAt: -1 }),
      Installment.find({ studentId: student._id }).sort({ dueDate: 1 }),
      student.feePlanId ? FeePlan.findById(student.feePlanId) : null,
    ]);
    
    return res.json({ student, rentRecords, payments, installments, plan });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
});

app.get('/api/admin/dashboard', auth, async (_, res) => {
  const [students, rooms, payments, expenses, pendingRent, rentRecords, feePlans, portalReady] = await Promise.all([
    Student.countDocuments({ archived: { $ne: true } }),
    Room.countDocuments(),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    RentRecord.aggregate([{ $group: { _id: null, total: { $sum: '$remainingAmount' } } }]),
    RentRecord.find(),
    FeePlan.countDocuments({ active: { $ne: false } }),
    Student.countDocuments({ portalEnabled: true }),
  ]);

  const summary = buildDashboardSummary({
    students,
    totalMonthlyRent: rentRecords.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0),
    pendingRent: pendingRent[0]?.total || 0,
    expenses: expenses[0]?.total || 0,
    payments: payments[0]?.total || 0,
    feePlans,
    portalReady,
  });

  let advancedStats = {
    overdueInstallments: 0,
    packageDistribution: [],
    occupancyRate: '0%',
    totalBeds: rooms,
    occupiedBeds: 0,
    monthlyTrends: [],
    collectionRate: summary.totalMonthlyRent > 0 ? ((summary.payments / summary.totalMonthlyRent) * 100).toFixed(1) : 0,
    averagePayment: 0,
  };

  return res.json({
    stats: { ...summary, ...advancedStats },
    rooms,
    recentPayments: [],
    recentExpenses: [],
  });
});

app.get('/api/admin/activity-log', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, entity, startDate, endDate } = req.query;
    
    const filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await ActivityLog.countDocuments(filter);
    
    return res.json({ logs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Activity log fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch activity logs' });
  }
});

app.get('/api/admin/settings', auth, async (_, res) => {
  const settings = (await PGSettings.findOne()) || (await PGSettings.create({}));
  return res.json({ settings });
});

app.put('/api/admin/settings', auth, async (req, res) => {
  try {
    const settings = await PGSettings.findOne();
    if (settings) {
      Object.assign(settings, req.body);
      await settings.save();
    } else {
      await PGSettings.create(req.body);
    }
    const updatedSettings = await PGSettings.findOne();
    await ActivityLog.create({
      adminName: req.user?.email || 'Admin',
      adminId: req.user?.id || 'system',
      action: 'Settings Changed',
      entity: 'PGSettings',
      entityId: updatedSettings._id.toString(),
      previousValue: {},
      newValue: req.body,
    });
    res.json({ settings: updatedSettings });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ message: error.message || 'Failed to update settings' });
  }
});

app.get('/api/admin/search', auth, async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ results: [] });

  const studentResults = await Student.find({ $or: [{ name: { $regex: query, $options: 'i' } }, { phone: { $regex: query, $options: 'i' } }, { room: { $regex: query, $options: 'i' } }] }).limit(10);
  const paymentResults = await Payment.find({ $or: [{ receiptNumber: { $regex: query, $options: 'i' } }, { transactionId: { $regex: query, $options: 'i' } }, { studentName: { $regex: query, $options: 'i' } }] }).limit(10);
  const roomResults = await Room.find({ roomNumber: { $regex: query, $options: 'i' } }).limit(10);
  return res.json({ results: [...studentResults.map((student) => ({ type: 'student', data: student })), ...paymentResults.map((payment) => ({ type: 'payment', data: payment })), ...roomResults.map((room) => ({ type: 'room', data: room }))] });
});

app.get('/api/admin/students', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, room, search } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (room) filter.room = { $regex: room, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await Student.countDocuments(filter);
    
    return res.json({ students, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Student fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch students' });
  }
});

app.post('/api/admin/students', validateStudent, auth, async (req, res) => {
  const student = await Student.create({
    ...req.body,
    portalStatus: req.body.email ? 'Invitation Sent' : 'Not Activated',
    portalEnabled: Boolean(req.body.email),
    portalAccessCode: req.body.portalAccessCode || `YH-${Math.floor(1000 + Math.random() * 9000)}`,
  });

  // Auto-create User record if email provided
  if (student.email) {
    const defaultPassword = `YH${Math.floor(1000 + Math.random() * 9000)}`;
    const user = await User.create({
      email: student.email,
      passwordHash: bcrypt.hashSync(defaultPassword, 10),
      role: 'student',
      studentId: student._id,
      accountStatus: 'active',
    });

    const accessCode = student.portalAccessCode || `YH-${Math.floor(1000 + Math.random() * 9000)}`;
    await PortalAccess.findOneAndUpdate(
      { studentId: student._id },
      { studentId: student._id, studentName: student.name, email: student.email, portalEnabled: true, status: 'Active', accessCode },
      { upsert: true, new: true }
    );

    // Send invitation email
    await sendStudentInvitation(student.email, student.name, accessCode, defaultPassword);

    // Create notification for student
    await Notification.create({
      userId: user._id,
      studentId: student._id,
      type: 'new_student',
      title: 'Welcome to YAHODA LIVING',
      message: `Your account has been created. Your temporary password is: ${defaultPassword}. Please change it after first login.`,
      read: false,
    });
  }

  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Student Added', entity: 'Student', entityId: student._id.toString(), newValue: { name: student.name, room: student.room, email: student.email } });
  res.status(201).json({ student });
});

// Helper function to generate installments from fee plan
async function generateInstallments(feePlan) {
  const { paymentPlan, totalAmount, startDate, endDate, _id: feePlanId, studentId, studentName } = feePlan;
  
  let numberOfInstallments = 1;
  if (paymentPlan === 'Full Payment') numberOfInstallments = 1;
  else if (paymentPlan === '2 Installments') numberOfInstallments = 2;
  else if (paymentPlan === '3 Installments') numberOfInstallments = 3;
  else if (paymentPlan === '4 Installments') numberOfInstallments = 4;
  else if (paymentPlan === '6 Installments') numberOfInstallments = 6;
  else if (paymentPlan === '12 Installments') numberOfInstallments = 12;
  else if (paymentPlan === 'Custom') numberOfInstallments = 1; // Custom plans handled separately
  
  const installmentAmount = Math.round(totalAmount / numberOfInstallments);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const daysPerInstallment = Math.floor(totalDays / numberOfInstallments);
  
  const installments = [];
  for (let i = 0; i < numberOfInstallments; i++) {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + (daysPerInstallment * i));
    
    installments.push({
      feePlanId,
      studentId,
      studentName,
      installmentNumber: i + 1,
      totalInstallments: numberOfInstallments,
      amountDue: installmentAmount,
      amountPaid: 0,
      remainingAmount: installmentAmount,
      dueDate,
      status: 'Pending',
    });
  }
  
  // Validate that sum of installments equals total amount
  const totalInstallmentAmount = installments.reduce((sum, inst) => sum + inst.amountDue, 0);
  if (Math.abs(totalInstallmentAmount - totalAmount) > 10) { // Allow small rounding differences
    throw new Error(`Installment total (${totalInstallmentAmount}) does not match package total (${totalAmount})`);
  }
  
  return installments;
}

app.post('/api/admin/fee-plans', auth, async (req, res) => {
  try {
    const { studentId, packageId, startDate, endDate, paymentPlan } = req.body;
    
    // Validate required fields
    if (!studentId || !packageId || !startDate || !endDate || !paymentPlan) {
      return res.status(400).json({ message: 'Missing required fields: studentId, packageId, startDate, endDate, paymentPlan' });
    }
    
    // Get package details
    const pkg = await Package.findById(packageId);
    
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    
    // Get student details
    const student = await Student.findById(studentId);
    
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    const totalAmount = pkg.amount;
    const feePlanData = {
      studentId,
      packageId,
      totalAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      paymentPlan,
      totalPaid: 0,
      totalRemaining: totalAmount,
      status: 'Active',
    };
    
    // Validate dates
    if (new Date(feePlanData.endDate) <= new Date(feePlanData.startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    feePlan = await FeePlan.create(feePlanData);
    
    // Generate installments
    const installments = await generateInstallments({ ...feePlan.toObject(), studentName: student.name });
    
    // Insert installments with error handling
    let createdInstallments;
    try {
      createdInstallments = await Installment.insertMany(installments);
    } catch (installmentError) {
      console.error('Installment creation error:', installmentError);
      // Delete fee plan if installments fail
      await FeePlan.findByIdAndDelete(feePlan._id);
      return res.status(500).json({ message: 'Failed to create installments', error: installmentError.message });
    }
    
    // Update student with fee plan and package
    await Student.findByIdAndUpdate(studentId, { 
      feePlanId: feePlan._id,
      packageId: packageId
    });
    
    // Log activity
    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Fee Plan Created',
      entity: 'FeePlan',
      entityId: feePlan._id.toString(),
      newValue: { studentName: student.name, totalAmount, paymentPlan },
      createdAt: new Date(),
    });
    
    return res.status(201).json({ feePlan, installments: createdInstallments });
  } catch (error) {
    console.error('Fee plan creation error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create fee plan' });
  }
});

app.post('/api/admin/students/:id/portal-access', auth, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const accessCode = String(req.body?.accessCode || `YH-${Math.floor(1000 + Math.random() * 9000)}`).trim();
  if (!accessCode) return res.status(400).json({ message: 'Portal access code is required.' });

  const previousValue = { portalEnabled: student.portalEnabled, portalAccessCode: student.portalAccessCode };
  student.portalEnabled = true;
  student.portalAccessCode = accessCode;
  await student.save();
  const access = await PortalAccess.findOneAndUpdate(
    { studentId: student._id },
    { studentId: student._id, studentName: student.name, email: student.email, portalEnabled: true, status: 'Active', accessCode },
    { upsert: true, new: true }
  );
  
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Portal Access Granted', entity: 'Student', entityId: student._id.toString(), previousValue, newValue: { portalEnabled: true, portalAccessCode: accessCode } });
  
  res.json({ access });
});

app.put('/api/admin/students/:id', auth, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const previousValue = { ...student.toObject() };
  const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Student Edited', entity: 'Student', entityId: updated._id.toString(), previousValue, newValue: updated.toObject() });
  res.json({ student: updated });
});

app.delete('/api/admin/students/:id', auth, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  student.archived = true; student.status = 'Archived'; await student.save();
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Student Archived', entity: 'Student', entityId: student._id.toString(), previousValue: { archived: false, status: 'Active' }, newValue: { archived: true, status: 'Archived' } });
  res.json({ message: 'Student archived successfully.' });
});

app.post('/api/admin/students/:id/restore', auth, async (req, res) => {
  const student = await Student.findById(req.params.id); if (!student) return res.status(404).json({ message: 'Student not found' });
  student.archived = false; student.status = 'Active'; await student.save();
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Student Restored', entity: 'Student', entityId: student._id.toString(), previousValue: { archived: true, status: 'Archived' }, newValue: { archived: false, status: 'Active' } });
  res.json({ message: 'Student restored successfully.' });
});

app.get('/api/admin/rooms', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, type, floor } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (floor) filter.floor = floor;
    
    const rooms = await Room.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await Room.countDocuments(filter);
    
    return res.json({ rooms, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Room fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch rooms' });
  }
});

app.post('/api/admin/rooms', auth, async (req, res) => {
  const room = await Room.create(req.body); await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Room Added', entity: 'Room', entityId: room._id.toString(), newValue: { roomNumber: room.roomNumber } }); res.json({ room });
});

app.get('/api/admin/packages', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, active } = req.query;
    
    const filter = {};
    if (active !== undefined) filter.active = active === 'true';
    
    const packages = await Package.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await Package.countDocuments(filter);
    
    return res.json({ packages, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Package fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch packages' });
  }
});

app.post('/api/admin/packages', validatePackage, auth, async (req, res) => {
  const pkg = await Package.create(req.body);
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Package Added', entity: 'Package', entityId: pkg._id.toString(), newValue: { name: pkg.name, amount: pkg.amount } });
  res.json({ package: pkg });
});

app.put('/api/admin/packages/:id', auth, async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  const previousValue = { ...pkg.toObject() };
  const updated = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Package Edited', entity: 'Package', entityId: updated._id.toString(), previousValue, newValue: updated.toObject() });
  res.json({ package: updated });
});

app.delete('/api/admin/packages/:id', auth, async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) return res.status(404).json({ message: 'Package not found' });
  pkg.active = false;
  await pkg.save();
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Package Disabled', entity: 'Package', entityId: pkg._id.toString(), previousValue: { active: true }, newValue: { active: false } });
  res.json({ message: 'Package disabled successfully.' });
});

app.get('/api/admin/rent', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, studentId, month, status } = req.query;
    
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (month) filter.month = month;
    if (status) filter.status = status;
    
    const records = await RentRecord.find(filter)
      .sort({ month: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await RentRecord.countDocuments(filter);
    
    return res.json({ records, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Rent record fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch rent records' });
  }
});

app.post('/api/admin/rent/generate', auth, async (req, res) => {
  const { studentId, month, baseRent, additionalCharges = 0, discount = 0 } = req.body; const student = await Student.findById(studentId); if (!student) return res.status(404).json({ message: 'Student not found' }); const totalAmount = Number(baseRent || student.monthlyRent || 0) + Number(additionalCharges || 0) - Number(discount || 0); const record = await RentRecord.create({ studentId: student._id, studentName: student.name, room: student.room, month, baseRent: Number(baseRent || student.monthlyRent || 0), additionalCharges: Number(additionalCharges || 0), discount: Number(discount || 0), totalAmount, paidAmount: 0, remainingAmount: totalAmount, status: 'Pending' }); await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Rent Generated', entity: 'RentRecord', entityId: record._id.toString(), newValue: { month, totalAmount } }); res.status(201).json({ record });
});

app.put('/api/admin/rent/:id', auth, async (req, res) => {
  const record = await RentRecord.findById(req.params.id); if (!record) return res.status(404).json({ message: 'Rent record not found' }); const previousValue = { ...record.toObject() }; const updates = req.body; const totalAmount = Number(updates.baseRent || record.baseRent) + Number(updates.additionalCharges || record.additionalCharges) - Number(updates.discount || record.discount); const paidAmount = Number(updates.paidAmount ?? record.paidAmount); const remainingAmount = Math.max(totalAmount - paidAmount, 0); const updated = await RentRecord.findByIdAndUpdate(req.params.id, { ...updates, totalAmount, remainingAmount, status: remainingAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending' }, { new: true }); await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Rent Edited', entity: 'RentRecord', entityId: updated._id.toString(), previousValue, newValue: updated.toObject() }); res.json({ record: updated });
});

app.get('/api/admin/payments', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, studentId, paymentMode, startDate, endDate } = req.query;
    
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (paymentMode) filter.paymentMode = paymentMode;
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }
    
    const payments = await Payment.find(filter)
      .sort({ paymentDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await Payment.countDocuments(filter);
    
    return res.json({ payments, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Payment fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch payments' });
  }
});

app.post('/api/admin/payments', validatePayment, auth, async (req, res) => {
  try {
    const { studentId, amount, installmentId, paymentMode } = req.body;
    
    // Validate required fields
    if (!studentId || !amount) {
      return res.status(400).json({ message: 'Missing required fields: studentId, amount' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be positive' });
    }
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const validatedPayload = normalizePaymentPayload(req.body, [student]);
    const payment = await Payment.create(validatedPayload);
    
    // Update rent record if exists
    const record = await RentRecord.findOne({ studentId: payment.studentId, month: payment.month || new Date().toISOString().slice(0, 7) });
    if (record) {
      record.paidAmount = Number(record.paidAmount || 0) + Number(payment.amount || 0);
      record.remainingAmount = Math.max(record.totalAmount - record.paidAmount, 0);
      record.status = record.remainingAmount === 0 ? 'Paid' : 'Partial';
      await record.save();
    }
    
    // Update installment if provided
    if (installmentId) {
      const installment = await Installment.findById(installmentId);
      if (installment && installment.studentId.toString() === studentId.toString()) {
        installment.amountPaid = Number(installment.amountPaid || 0) + Number(payment.amount);
        installment.remainingAmount = Math.max(installment.amountDue - installment.amountPaid, 0);
        
        if (installment.remainingAmount <= 0) {
          installment.status = 'Paid';
          installment.paidDate = new Date();
        } else if (installment.amountPaid > 0) {
          installment.status = 'Partial';
        }
        
        await installment.save();
        
        // Update fee plan totals
        if (installment.feePlanId) {
          const feePlan = await FeePlan.findById(installment.feePlanId);
          if (feePlan) {
            feePlan.totalPaid = Number(feePlan.totalPaid || 0) + Number(payment.amount);
            feePlan.totalRemaining = Math.max(feePlan.totalAmount - feePlan.totalPaid, 0);
            
            if (feePlan.totalRemaining <= 0) {
              feePlan.status = 'Completed';
            }
            
            await feePlan.save();
          }
        }
      }
    }
    
    // Send payment confirmation email
    if (student.email) {
      await sendPaymentConfirmation(student.email, student.name, payment.amount, payment.paymentMode, payment.receiptNumber);
    }
    
    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Payment Added',
      entity: 'Payment',
      entityId: payment._id.toString(),
      newValue: { amount: payment.amount, studentName: payment.studentName },
    });
    
    res.status(201).json({ payment });
  } catch (error) {
    console.error('Payment creation error:', error);
    const message = error?.message || 'Failed to record payment.';
    const statusCode = Number(error?.statusCode || 500);
    res.status(statusCode).json({ message });
  }
});

app.get('/api/admin/fee-plans', auth, async (_, res) => {
  const plans = await FeePlan.find().sort({ createdAt: -1 });
  return res.json({ plans });
});

app.post('/api/admin/fee-plans', auth, async (req, res) => {
  const plan = await FeePlan.create(req.body);
  await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Fee Plan Added', entity: 'FeePlan', entityId: plan._id.toString(), newValue: { name: plan.name, amount: plan.amount } });
  res.status(201).json({ plan });
});

app.get('/api/admin/installments', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, studentId, dueDateFrom, dueDateTo } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }
    
    const installments = await Installment.find(filter)
      .sort({ dueDate: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await Installment.countDocuments(filter);
    
    return res.json({ installments, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Installment fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch installments' });
  }
});

app.post('/api/admin/rent/:rentRecordId/create-installments', auth, async (req, res) => {
  try {
    const { numberOfInstallments = 2, dueDate } = req.body;
    
    const rentRecord = await RentRecord.findById(req.params.rentRecordId);
    if (!rentRecord) return res.status(404).json({ message: 'Rent record not found' });
    
    const installmentAmount = Math.ceil(rentRecord.totalAmount / numberOfInstallments);
    const installments = [];
    
    for (let i = 0; i < numberOfInstallments; i++) {
      const isLastInstallment = i === numberOfInstallments - 1;
      const amount = isLastInstallment ? rentRecord.totalAmount - (installmentAmount * i) : installmentAmount;
      const baseDueDate = new Date(dueDate || rentRecord.month + '-05');
      baseDueDate.setDate(baseDueDate.getDate() + i * 15);
      
      const installment = await Installment.create({
        rentRecordId: rentRecord._id,
        studentId: rentRecord.studentId,
        studentName: rentRecord.studentName,
        installmentNumber: i + 1,
        totalInstallments: numberOfInstallments,
        amountDue: amount,
        amountPaid: 0,
        remainingAmount: amount,
        dueDate: baseDueDate,
        status: 'Pending',
      });
      installments.push(installment);
    }
    
    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Installments Created',
      entity: 'Installment',
      entityId: req.params.rentRecordId,
      newValue: { count: numberOfInstallments },
    });
    
    res.status(201).json({ installments });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create installments' });
  }
});

app.put('/api/admin/installments/:id', auth, async (req, res) => {
  try {
    const installment = await Installment.findById(req.params.id);
    if (!installment) return res.status(404).json({ message: 'Installment not found' });
    
    const previousValue = { ...installment.toObject() };
    const updated = await Installment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Installment Updated',
      entity: 'Installment',
      entityId: updated._id.toString(),
      previousValue,
      newValue: updated.toObject(),
    });
    
    res.json({ installment: updated });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update installment' });
  }
});

app.post('/api/admin/installments/:id/pay', auth, async (req, res) => {
  try {
    const { paidAmount } = req.body;
    
    const installment = await Installment.findById(req.params.id);
    if (!installment) return res.status(404).json({ message: 'Installment not found' });
    
    const previousValue = { ...installment.toObject() };
    installment.paidAmount = Number(paidAmount || installment.amount);
    installment.status = installment.paidAmount >= installment.amount ? 'Paid' : 'Partial';
    installment.paidDate = new Date();
    await installment.save();
    
    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Installment Paid',
      entity: 'Installment',
      entityId: installment._id.toString(),
      previousValue,
      newValue: installment.toObject(),
    });
    
    res.json({ installment });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to mark installment as paid' });
  }
});

app.get('/api/admin/portal-access', auth, async (_, res) => {
  const access = await PortalAccess.find().sort({ createdAt: -1 });
  return res.json({ access });
});

app.get('/api/admin/receipts', auth, async (_, res) => {
  try {
    const receipts = await Receipt.find().sort({ uploadedAt: -1 });
    return res.json({ receipts });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch receipts' });
  }
});

app.post('/api/student/receipts', auth, requireStudent, async (req, res) => {
  try {
    const { receiptImage, originalFilename, fileSize, mimeType, amount, paymentId, installmentId } = req.body;

    const student = await Student.findById(req.user.studentId || req.user.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const receipt = await Receipt.create({
      paymentId,
      installmentId,
      studentId: student._id,
      studentName: student.name,
      amount: Number(amount || 0),
      receiptImage,
      originalFilename,
      fileSize,
      mimeType,
      uploadedAt: new Date(),
      verificationStatus: 'Pending',
    });

    res.status(201).json({ receipt });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to upload receipt' });
  }
});

app.get('/api/student/receipts', auth, requireStudent, async (req, res) => {
  try {
    const receipts = await Receipt.find({ studentId: req.user.studentId || req.user.id }).sort({ uploadedAt: -1 });
    res.json({ receipts });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch receipts' });
  }
});

app.put('/api/admin/receipts/:id', auth, async (req, res) => {
  try {
    const { verificationStatus, verificationNotes, rejectionReason } = req.body;

    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

    receipt.verificationStatus = verificationStatus || receipt.verificationStatus;
    receipt.verifiedBy = req.user?.email || 'Admin';
    receipt.verifiedAt = new Date();
    receipt.verificationNotes = verificationNotes;
    receipt.rejectionReason = rejectionReason;
    await receipt.save();

    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: `Receipt ${verificationStatus}`,
      entity: 'Receipt',
      entityId: receipt._id.toString(),
      newValue: { verificationStatus },
    });

    res.json({ receipt });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to verify receipt' });
  }
});

// Student Authentication Endpoints
app.post('/api/student/login', async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (otp) {
      // OTP login
      if (user.otp !== otp || new Date(user.otpExpires) < new Date()) {
        return res.status(401).json({ message: 'Invalid or expired OTP' });
      }
      user.otp = null;
      user.otpExpires = null;
      user.lastLogin = new Date();
    } else {
      // Password login
      const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!passwordMatch) return res.status(401).json({ message: 'Invalid credentials' });
      user.lastLogin = new Date();
    }

    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, studentId: user.studentId }, process.env.JWT_SECRET || 'yahoda-living-secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, studentId: user.studentId } });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
});

app.post('/api/student/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // In development, return OTP for testing. In production, send via email/SMS
    if (process.env.NODE_ENV === 'development') {
      res.json({ message: 'OTP generated successfully', otp });
    } else {
      res.json({ message: 'OTP sent to your registered email' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to generate OTP' });
  }
});

// Student Dashboard Endpoint
app.get('/api/student/dashboard', auth, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.studentId || req.user.id;

    const student = await Student.findById(studentId);
    const feePlans = await FeePlan.find({ studentId }).sort({ createdAt: -1 });
    const installments = await Installment.find({ studentId }).sort({ dueDate: 1 });
    const payments = await Payment.find({ studentId }).sort({ paymentDate: -1 });
    const receipts = await Receipt.find({ studentId }).sort({ uploadedAt: -1 });
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.json({
      student,
      feePlans,
      installments,
      payments,
      receipts,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch dashboard' });
  }
});

// Student Notifications Endpoint
app.get('/api/student/notifications', auth, requireStudent, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
});

app.put('/api/student/notifications/:id/read', auth, requireStudent, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to mark notification as read' });
  }
});

// Student Payment Endpoint
app.post('/api/student/payments', auth, requireStudent, async (req, res) => {
  try {
    const { amount, paymentMode, installmentId, transactionId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const studentId = req.user.studentId || req.user.id;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const payment = await Payment.create({
      studentId: student._id,
      studentName: student.name,
      room: student.room,
      amount: Number(amount),
      paymentMode: paymentMode || 'Online',
      paymentDate: new Date(),
      receiptNumber: `RCPT-${Date.now()}`,
      transactionId: transactionId || `TXN-${Date.now()}`,
      notes: 'Online payment via student portal',
    });

    // Update installment if provided
    if (installmentId) {
      const installment = await Installment.findOne({ _id: installmentId, studentId });
      if (installment) {
        installment.amountPaid = Number(installment.amountPaid || 0) + Number(amount);
        installment.remainingAmount = Math.max(0, Number(installment.amountDue) - installment.amountPaid);
        installment.status = installment.remainingAmount === 0 ? 'Paid' : 'Partial';
        if (installment.status === 'Paid') {
          installment.paidDate = new Date();
        }
        await installment.save();
      }
    }

    // Create notification for admin
    await Notification.create({
      type: 'payment_received',
      title: 'New Payment Received',
      message: `${student.name} paid ₹${amount} via ${paymentMode || 'Online'}`,
      studentId: student._id,
      read: false,
    });

    res.status(201).json({ payment });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Payment failed' });
  }
});

app.get('/api/admin/expenses', auth, async (_, res) => {
  const expenses = await Expense.find().sort({ createdAt: -1 });
  return res.json({ expenses });
});

app.post('/api/admin/expenses', validateExpense, auth, async (req, res) => {
  const expense = await Expense.create(req.body); await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Expense Added', entity: 'Expense', entityId: expense._id.toString(), newValue: { title: expense.title, amount: expense.amount } }); res.status(201).json({ expense });
});

app.put('/api/admin/expenses/:id', auth, async (req, res) => {
  const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true }); await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Expense Edited', entity: 'Expense', entityId: expense._id.toString(), previousValue: {}, newValue: expense.toObject() }); res.json({ expense });
});

app.delete('/api/admin/expenses/:id', auth, async (req, res) => {
  const expense = await Expense.findById(req.params.id); if (!expense) return res.status(404).json({ message: 'Expense not found' }); await expense.deleteOne(); await ActivityLog.create({ adminId: req.user?.id || 'admin', adminName: req.user?.email || 'Admin', action: 'Expense Deleted', entity: 'Expense', entityId: expense._id.toString(), previousValue: expense.toObject(), newValue: null }); res.json({ message: 'Expense deleted successfully.' });
});

app.get('/api/admin/reports', auth, async (req, res) => {
  try {
    const { startDate, endDate, studentId } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    const studentFilter = studentId ? { studentId } : {};
    
    const [students, payments, expenses, rentRecords] = await Promise.all([
      Student.countDocuments({ archived: { $ne: true }, ...studentFilter }),
      Payment.aggregate([
        { $match: { ...dateFilter, ...studentFilter } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      RentRecord.find(studentFilter)
    ]);
    
    return res.json({ 
      summary: { 
        activeStudents: students, 
        payments: payments[0]?.total || 0, 
        paymentCount: payments[0]?.count || 0,
        expenses: expenses[0]?.total || 0,
        expenseCount: expenses[0]?.count || 0,
        rentRecords: rentRecords.length, 
        profit: (payments[0]?.total || 0) - (expenses[0]?.total || 0) 
      }, 
      rentRecords,
      filters: { startDate, endDate, studentId }
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch reports' });
  }
});

app.get('/api/admin/export/students', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, room } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (room) filter.room = { $regex: room, $options: 'i' };
    
    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();
    
    const total = await Student.countDocuments(filter);
    
    return res.json({ data: students, count: students.length, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Student export error:', error);
    return res.status(500).json({ message: error.message || 'Failed to export students' });
  }
});

app.get('/api/admin/export/payments', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, startDate, endDate, studentId } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }
    if (studentId) filter.studentId = studentId;
    
    const payments = await Payment.find(filter)
      .sort({ paymentDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();
    
    const total = await Payment.countDocuments(filter);
    
    return res.json({ data: payments, count: payments.length, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Payment export error:', error);
    return res.status(500).json({ message: error.message || 'Failed to export payments' });
  }
});

app.get('/api/admin/export/expenses', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, startDate, endDate, category } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (category) filter.category = category;
    
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();
    
    const total = await Expense.countDocuments(filter);
    
    return res.json({ data: expenses, count: expenses.length, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Expense export error:', error);
    return res.status(500).json({ message: error.message || 'Failed to export expenses' });
  }
});

app.get('/api/admin/export/installments', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, studentId, dueDateFrom, dueDateTo } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }
    
    const installments = await Installment.find(filter)
      .sort({ dueDate: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();
    
    const total = await Installment.countDocuments(filter);
    
    return res.json({ data: installments, count: installments.length, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Installment export error:', error);
    return res.status(500).json({ message: error.message || 'Failed to export installments' });
  }
});

// Admin Notifications Endpoints
app.get('/api/admin/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ adminId: req.user?.id }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
});

app.post('/api/admin/notifications', auth, async (req, res) => {
  try {
    const { type, title, message, studentId, metadata } = req.body;

    const notification = await Notification.create({
      adminId: req.user?.id,
      adminName: req.user?.email,
      type,
      title,
      message,
      studentId,
      metadata,
      read: false,
    });

    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create notification' });
  }
});

app.put('/api/admin/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user?.id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to mark notification as read' });
  }
});

// Manual Automation Endpoints
// Razorpay Payment Endpoints

// POST /api/payments/create-order - Create Razorpay order
app.post('/api/payments/create-order', auth, requireStudent, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        studentId: req.user.studentId,
        userId: req.user.id,
      },
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ message: 'Failed to create payment order', error: error.message });
  }
});

// POST /api/payments/verify - Verify Razorpay payment
app.post('/api/payments/verify', auth, requireStudent, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount, installmentId } = req.body;
    
    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    
    // Create payment record
    const student = await Student.findById(req.user.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const payment = await Payment.create({
      studentId: student._id,
      studentName: student.name,
      room: student.room,
      amount: Number(amount),
      paymentMode: 'Online (Razorpay)',
      paymentDate: new Date(),
      receiptNumber: `RZP-${razorpayPaymentId}`,
      transactionId: razorpayPaymentId,
      notes: `Razorpay Order: ${razorpayOrderId}`,
    });
    
    // Update installment if provided
    if (installmentId) {
      const installment = await Installment.findById(installmentId);
      if (installment && installment.studentId.toString() === student._id.toString()) {
        installment.amountPaid = Number(installment.amountPaid || 0) + Number(amount);
        installment.remainingAmount = Math.max(installment.amountDue - installment.amountPaid, 0);
        
        if (installment.remainingAmount <= 0) {
          installment.status = 'Paid';
          installment.paidDate = new Date();
        } else if (installment.amountPaid > 0) {
          installment.status = 'Partial';
        }
        
        await installment.save();
        
        // Update fee plan totals
        if (installment.feePlanId) {
          const feePlan = await FeePlan.findById(installment.feePlanId);
          if (feePlan) {
            feePlan.totalPaid = Number(feePlan.totalPaid || 0) + Number(amount);
            feePlan.totalRemaining = Math.max(feePlan.totalAmount - feePlan.totalPaid, 0);
            
            if (feePlan.totalRemaining <= 0) {
              feePlan.status = 'Completed';
            }
            
            await feePlan.save();
          }
        }
      }
    }
    
    // Send payment confirmation email
    if (student.email) {
      await sendPaymentConfirmation(student.email, student.name, payment.amount, 'Online (Razorpay)', payment.receiptNumber);
    }
    
    // Create notification
    await Notification.create({
      userId: req.user.id,
      studentId: student._id,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment of ₹${amount} has been received successfully.`,
      read: false,
    });
    
    await ActivityLog.create({
      adminId: 'system',
      adminName: 'Razorpay Webhook',
      action: 'Payment Verified',
      entity: 'Payment',
      entityId: payment._id.toString(),
      newValue: { amount: payment.amount, studentName: payment.studentName, transactionId: razorpayPaymentId },
    });
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Failed to verify payment', error: error.message });
  }
});

// POST /api/payments/webhook - Razorpay webhook handler
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const { order_id, payment_id, signature, amount, notes } = req.body;
    
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_placeholder';
    const receivedSignature = req.headers['x-razorpay-signature'];
    
    if (!receivedSignature) {
      return res.status(400).json({ message: 'Missing webhook signature' });
    }
    
    // Create HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (receivedSignature !== expectedSignature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }
    
    // Process payment (idempotent - check if already processed)
    const existingPayment = await Payment.findOne({ transactionId: payment_id });
    if (existingPayment) {
      return res.json({ success: true, message: 'Payment already processed' });
    }
    
    // Get student from notes
    const studentId = notes?.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID not found in payment notes' });
    }
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Create payment record
    const payment = await Payment.create({
      studentId: student._id,
      studentName: student.name,
      room: student.room,
      amount: Number(amount) / 100, // Convert from paise to rupees
      paymentMode: 'Online (Razorpay)',
      paymentDate: new Date(),
      receiptNumber: `RZP-${payment_id}`,
      transactionId: payment_id,
      notes: `Razorpay Order: ${order_id} (Webhook)`,
    });
    
    // Update fee plan if exists
    if (student.feePlanId) {
      const feePlan = await FeePlan.findById(student.feePlanId);
      if (feePlan) {
        feePlan.totalPaid = Number(feePlan.totalPaid || 0) + payment.amount;
        feePlan.totalRemaining = Math.max(feePlan.totalAmount - feePlan.totalPaid, 0);
        
        if (feePlan.totalRemaining <= 0) {
          feePlan.status = 'Completed';
        }
        
        await feePlan.save();
      }
    }
    
    // Send payment confirmation email
    if (student.email) {
      await sendPaymentConfirmation(student.email, student.name, payment.amount, 'Online (Razorpay)', payment.receiptNumber);
    }
    
    // Create notification
    await Notification.create({
      studentId: student._id,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Your payment of ₹${payment.amount} has been received successfully.`,
      read: false,
    });
    
    await ActivityLog.create({
      adminId: 'system',
      adminName: 'Razorpay Webhook',
      action: 'Payment Received',
      entity: 'Payment',
      entityId: payment._id.toString(),
      newValue: { amount: payment.amount, studentName: payment.studentName, transactionId: payment_id },
    });
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ message: 'Failed to process webhook', error: error.message });
  }
});

// Receipt Submission Endpoints

// POST /api/student/receipts/submit - Submit external payment receipt
app.post('/api/student/receipts/submit', auth, requireStudent, upload.single('receipt'), async (req, res) => {
  try {
    const { amount, paymentDate, paymentMethod, transactionId, installmentId } = req.body;
    
    // Validate required fields
    if (!amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields: amount, paymentDate, paymentMethod' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'Receipt image is required' });
    }
    
    const student = await Student.findById(req.user.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check for duplicate transaction ID
    if (transactionId) {
      const existingReceipt = await Receipt.findOne({ transactionId: transactionId.trim() });
      if (existingReceipt) {
        return res.status(400).json({ message: 'Transaction ID already exists' });
      }
    }
    
    // Convert image to base64 for storage (can be replaced with Cloudinary)
    const receiptImage = req.file.buffer.toString('base64');
    
    // Create receipt record
    const receipt = await Receipt.create({
      studentId: student._id,
      studentName: student.name,
      amount: Number(amount),
      receiptImage,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
      verificationStatus: 'Pending',
    });
    
    // Create notification for admin
    await Notification.create({
      type: 'receipt_submitted',
      title: 'New Receipt Submitted',
      message: `${student.name} has submitted a receipt of ₹${amount} for verification.`,
      metadata: { receiptId: receipt._id, studentId: student._id },
      read: false,
    });
    
    await ActivityLog.create({
      adminId: 'system',
      adminName: 'Student Portal',
      action: 'Receipt Submitted',
      entity: 'Receipt',
      entityId: receipt._id.toString(),
      newValue: { amount: receipt.amount, studentName: receipt.studentName },
    });
    
    res.status(201).json({ 
      receipt: {
        _id: receipt._id,
        amount: receipt.amount,
        uploadedAt: receipt.uploadedAt,
        verificationStatus: receipt.verificationStatus,
      }
    });
  } catch (error) {
    console.error('Receipt submission error:', error);
    res.status(500).json({ message: error.message || 'Failed to submit receipt' });
  }
});

// GET /api/student/receipts - Get student's receipts
app.get('/api/student/receipts', auth, requireStudent, async (req, res) => {
  try {
    const receipts = await Receipt.find({ studentId: req.user.studentId })
      .sort({ uploadedAt: -1 })
      .select('-receiptImage'); // Exclude image data from list
    
    res.json({ receipts });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ message: 'Failed to retrieve receipts' });
  }
});

// GET /api/admin/receipts/pending - Get pending receipts for admin review
app.get('/api/admin/receipts/pending', auth, async (req, res) => {
  try {
    const receipts = await Receipt.find({ verificationStatus: 'Pending' })
      .sort({ uploadedAt: -1 })
      .select('-receiptImage'); // Exclude image data from list
    
    res.json({ receipts });
  } catch (error) {
    console.error('Get pending receipts error:', error);
    res.status(500).json({ message: 'Failed to retrieve pending receipts' });
  }
});

// POST /api/admin/receipts/:id/verify - Verify or reject receipt
app.post('/api/admin/receipts/:id/verify', auth, async (req, res) => {
  try {
    const { status, notes, installmentId } = req.body;
    
    if (!['AUTOMATICALLY_VERIFIED', 'NEEDS_REVIEW', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid verification status' });
    }
    
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }
    
    const previousStatus = receipt.verificationStatus;
    receipt.verificationStatus = status;
    receipt.verificationNotes = notes;
    receipt.verifiedBy = req.user?.email || 'Admin';
    receipt.verifiedAt = new Date();
    
    await receipt.save();
    
    // If verified, create payment record
    if (status === 'AUTOMATICALLY_VERIFIED') {
      const student = await Student.findById(receipt.studentId);
      if (student) {
        const payment = await Payment.create({
          studentId: student._id,
          studentName: student.name,
          room: student.room,
          amount: receipt.amount,
          paymentMode: 'External (Receipt Verified)',
          paymentDate: new Date(),
          receiptNumber: `EXT-${receipt._id.toString().slice(-8)}`,
          transactionId: receipt.transactionId || `receipt-${receipt._id}`,
          notes: `Receipt verified by ${receipt.verifiedBy}`,
        });
        
        // Update installment if provided
        if (installmentId) {
          const installment = await Installment.findById(installmentId);
          if (installment && installment.studentId.toString() === student._id.toString()) {
            installment.amountPaid = Number(installment.amountPaid || 0) + Number(receipt.amount);
            installment.remainingAmount = Math.max(installment.amountDue - installment.amountPaid, 0);
            
            if (installment.remainingAmount <= 0) {
              installment.status = 'Paid';
              installment.paidDate = new Date();
            } else if (installment.amountPaid > 0) {
              installment.status = 'Partial';
            }
            
            await installment.save();
            
            // Update fee plan totals
            if (installment.feePlanId) {
              const feePlan = await FeePlan.findById(installment.feePlanId);
              if (feePlan) {
                feePlan.totalPaid = Number(feePlan.totalPaid || 0) + Number(receipt.amount);
                feePlan.totalRemaining = Math.max(feePlan.totalAmount - feePlan.totalPaid, 0);
                
                if (feePlan.totalRemaining <= 0) {
                  feePlan.status = 'Completed';
                }
                
                await feePlan.save();
              }
            }
          }
        }
        
        // Link payment to receipt
        receipt.paymentId = payment._id;
        await receipt.save();
        
        // Send confirmation email
        if (student.email) {
          await sendPaymentConfirmation(student.email, student.name, payment.amount, 'External (Receipt Verified)', payment.receiptNumber);
        }
        
        // Create notification for student
        await Notification.create({
          studentId: student._id,
          type: 'receipt_verified',
          title: 'Receipt Verified',
          message: `Your receipt of ₹${receipt.amount} has been verified and payment recorded.`,
          read: false,
        });
      }
    } else if (status === 'REJECTED') {
      // Create notification for student about rejection
      await Notification.create({
        studentId: receipt.studentId,
        type: 'receipt_rejected',
        title: 'Receipt Rejected',
        message: `Your receipt submission was rejected. Reason: ${notes || 'Not specified'}`,
        read: false,
      });
    }
    
    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Receipt Verified',
      entity: 'Receipt',
      entityId: receipt._id.toString(),
      previousValue: { verificationStatus: previousStatus },
      newValue: { verificationStatus: status, notes },
    });
    
    res.json({ receipt });
  } catch (error) {
    console.error('Receipt verification error:', error);
    res.status(500).json({ message: error.message || 'Failed to verify receipt' });
  }
});

// GET /api/admin/receipts/:id - Get receipt details with image
app.get('/api/admin/receipts/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }
    
    res.json({ 
      receipt: {
        _id: receipt._id,
        studentId: receipt.studentId,
        studentName: receipt.studentName,
        amount: receipt.amount,
        receiptImage: receipt.receiptImage,
        originalFilename: receipt.originalFilename,
        fileSize: receipt.fileSize,
        mimeType: receipt.mimeType,
        uploadedAt: receipt.uploadedAt,
        verificationStatus: receipt.verificationStatus,
        verifiedBy: receipt.verifiedBy,
        verifiedAt: receipt.verifiedAt,
        verificationNotes: receipt.verificationNotes,
      }
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ message: 'Failed to retrieve receipt' });
  }
});

// POST /api/payments/:paymentId/generate-receipt - Generate PDF receipt for payment
app.post('/api/payments/:paymentId/generate-receipt', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    const student = await Student.findById(payment.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Generate PDF receipt
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      const pdfBase64 = pdfBuffer.toString('base64');
      
      // Create receipt record
      const receipt = Receipt.create({
        paymentId: payment._id,
        studentId: student._id,
        studentName: student.name,
        amount: payment.amount,
        receiptImage: pdfBase64,
        originalFilename: `receipt-${payment._id}.pdf`,
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        verificationStatus: 'AUTOMATICALLY_VERIFIED',
        verifiedBy: 'System',
        verifiedAt: new Date(),
      }).then(receipt => {
        res.json({ 
          receipt: {
            _id: receipt._id,
            amount: receipt.amount,
            originalFilename: receipt.originalFilename,
            receiptImage: receipt.receiptImage,
          }
        });
      });
    });
    
    // Build PDF content
    doc.fontSize(20).text('YAHODA LIVING', { align: 'center' });
    doc.fontSize(12).text('PG Management System', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).text('PAYMENT RECEIPT', { align: 'center', underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Receipt Number: ${payment.receiptNumber}`);
    doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString()}`);
    doc.text(`Transaction ID: ${payment.transactionId || 'N/A'}`);
    doc.moveDown();
    
    doc.text('Student Details:', { underline: true });
    doc.text(`Name: ${student.name}`);
    doc.text(`Room: ${student.room || 'N/A'}`);
    doc.moveDown();
    
    doc.text('Payment Details:', { underline: true });
    doc.text(`Amount: ₹${payment.amount}`);
    doc.text(`Payment Mode: ${payment.paymentMode}`);
    if (payment.notes) {
      doc.text(`Notes: ${payment.notes}`);
    }
    doc.moveDown();
    
    doc.fontSize(10).text('This is a computer-generated receipt.', { align: 'center' });
    doc.text('For any queries, please contact the administration.', { align: 'center' });
    
    doc.end();
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500).json({ message: 'Failed to generate receipt' });
  }
});

// GET /api/payments/:paymentId/receipt - Download receipt PDF
app.get('/api/payments/:paymentId/receipt', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({ paymentId: req.params.paymentId });
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found for this payment' });
    }
    
    // Convert base64 back to buffer
    const pdfBuffer = Buffer.from(receipt.receiptImage, 'base64');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.originalFilename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ message: 'Failed to download receipt' });
  }
});

app.post('/api/admin/automation/send-reminders', auth, async (req, res) => {
  try {
    const { daysBefore = 7 } = req.body;
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + daysBefore);

    const upcomingInstallments = await Installment.find({
      status: 'Pending',
      dueDate: { $lte: reminderDate }
    });

    let remindersSent = 0;
    for (const inst of upcomingInstallments) {
      await Notification.create({
        studentId: inst.studentId,
        type: 'installment_due',
        title: 'Payment Reminder',
        message: `Installment ${inst.installmentNumber} of ${inst.totalInstallments} is due on ${new Date(inst.dueDate).toLocaleDateString()}. Amount: ₹${inst.amountDue}`,
        read: false,
      });
      remindersSent++;
    }

    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Reminders Sent',
      entity: 'Automation',
      newValue: { count: remindersSent, daysBefore },
    });

    res.json({ message: `Sent ${remindersSent} reminders`, remindersSent });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to send reminders' });
  }
});

app.post('/api/admin/automation/check-overdue', auth, async (req, res) => {
  try {
    const today = new Date();

    const overdueInstallments = await Installment.find({
      status: 'Pending',
      dueDate: { $lt: today }
    });

    let overdueCount = 0;
    for (const inst of overdueInstallments) {
      inst.status = 'Overdue';
      await inst.save();

      await Notification.create({
        studentId: inst.studentId,
        type: 'installment_overdue',
        title: 'Installment Overdue',
        message: `Installment ${inst.installmentNumber} of ${inst.totalInstallments} is overdue. Due date was ${new Date(inst.dueDate).toLocaleDateString()}. Amount: ₹${inst.amountDue}`,
        read: false,
      });
      overdueCount++;
    }

    await ActivityLog.create({
      adminId: req.user?.id || 'admin',
      adminName: req.user?.email || 'Admin',
      action: 'Overdue Check',
      entity: 'Automation',
      newValue: { count: overdueCount },
    });

    res.json({ message: `Marked ${overdueCount} installments as overdue`, overdueCount });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to check overdue' });
  }
});

app.get('/api/admin/export/payments', auth, async (_, res) => {
  const payments = await Payment.find().lean();
  return res.json({ data: payments, count: payments.length });
});

app.get('/api/admin/export/rent', auth, async (_, res) => {
  const rent = await RentRecord.find().lean();
  return res.json({ data: rent, count: rent.length });
});

app.get('/api/admin/export/expenses', auth, async (_, res) => {
  const expenses = await Expense.find().lean();
  return res.json({ data: expenses, count: expenses.length });
});

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: Object.values(err.errors).map(e => e.message) 
    });
  }
  // Handle other errors
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// ==================== AUTOMATED TASKS WITH NODE-CRON ====================

// Send payment reminders every day at 9 AM for installments due in 3 days
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running daily payment reminder task...');
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const upcomingInstallments = await Installment.find({
      status: 'Pending',
      dueDate: { $lte: threeDaysFromNow, $gte: new Date() }
    }).populate('studentId');
    
    let remindersSent = 0;
    for (const installment of upcomingInstallments) {
      if (installment.studentId && installment.studentId.email) {
        await sendPaymentReminder(
          installment.studentId.email,
          installment.studentName,
          installment.amountDue,
          installment.dueDate
        );
        
        await Notification.create({
          studentId: installment.studentId._id,
          type: 'installment_due',
          title: 'Payment Reminder',
          message: `Installment ${installment.installmentNumber} of ${installment.totalInstallments} is due on ${new Date(installment.dueDate).toLocaleDateString()}. Amount: ₹${installment.amountDue}`,
          read: false,
        });
        
        remindersSent++;
      }
    }
    
    await ActivityLog.create({
      adminId: 'system',
      adminName: 'Cron Job',
      action: 'Daily Payment Reminders',
      entity: 'Automation',
      newValue: { count: remindersSent },
    });
    
    console.log(`Daily reminder task completed. Sent ${remindersSent} reminders.`);
  } catch (error) {
    console.error('Error in daily reminder task:', error);
  }
});

// Check for overdue installments every day at 10 AM
cron.schedule('0 10 * * *', async () => {
  try {
    console.log('Running daily overdue check task...');
    
    const today = new Date();
    const overdueInstallments = await Installment.find({
      status: 'Pending',
      dueDate: { $lt: today }
    });
    
    let overdueCount = 0;
    for (const installment of overdueInstallments) {
      installment.status = 'Overdue';
      await installment.save();
      
      await Notification.create({
        studentId: installment.studentId,
        type: 'installment_overdue',
        title: 'Installment Overdue',
        message: `Installment ${installment.installmentNumber} of ${installment.totalInstallments} is overdue. Due date was ${new Date(installment.dueDate).toLocaleDateString()}. Amount: ₹${installment.amountDue}`,
        read: false,
      });
      
      overdueCount++;
    }
    
    await ActivityLog.create({
      adminId: 'system',
      adminName: 'Cron Job',
      action: 'Daily Overdue Check',
      entity: 'Automation',
      newValue: { count: overdueCount },
    });
    
    console.log(`Overdue check task completed. Marked ${overdueCount} installments as overdue.`);
  } catch (error) {
    console.error('Error in overdue check task:', error);
  }
});

// Send weekly summary every Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  try {
    console.log('Running weekly summary task...');
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentPayments = await Payment.find({
      paymentDate: { $gte: oneWeekAgo }
    }).populate('studentId');
    
    const totalCollected = recentPayments.reduce((sum, p) => sum + p.amount, 0);
    
    await ActivityLog.create({
      adminId: 'system',
      adminName: 'Cron Job',
      action: 'Weekly Summary',
      entity: 'Automation',
      newValue: { 
        totalPayments: recentPayments.length,
        totalCollected,
        dateRange: `${oneWeekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}`
      },
    });
    
    console.log(`Weekly summary task completed. Total payments: ${recentPayments.length}, Total collected: ₹${totalCollected}`);
  } catch (error) {
    console.error('Error in weekly summary task:', error);
  }
});

// Error handling middleware (must be after all routes)
app.use(notFound);
app.use(errorHandler);

// ==================== SERVER START ====================

async function startServer() {
  const dbConnection = await connectDB();
  if (dbConnection) {
    await seedData();
  }
  app.listen(PORT, () => {
    console.log(`YAHODA admin API running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

export { app, startServer };

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});
