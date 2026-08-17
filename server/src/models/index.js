import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const adminUserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
}, { timestamps: true });

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  accountStatus: { type: String, enum: ['active', 'suspended', 'archived'], default: 'active' },
  otp: String,
  otpExpires: Date,
  lastLogin: Date,
}, { timestamps: true });

// Add indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ studentId: 1 });

const packageSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  amount: { type: Number, required: true },
  foodIncluded: { type: Boolean, default: false },
  duration: { type: Number, default: 12 }, // in months
  active: { type: Boolean, default: true },
}, { timestamps: true });

const studentSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  profilePhoto: String, // Base64
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  college: String,
  company: String,
  course: String,
  job: String,
  parentName: String,
  parentPhone: String,
  permanentAddress: String,
  governmentId: String,
  governmentIdType: String,
  room: String,
  bed: String,
  floor: String,
  monthlyRent: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now },
  leavingDate: Date,
  status: { type: String, enum: ['Active', 'Notice Period', 'Left', 'Archived'], default: 'Active' },
  archived: { type: Boolean, default: false },
  previousStatus: String,
  packageId: { type: Schema.Types.ObjectId, ref: 'Package' },
  feePlanId: { type: Schema.Types.ObjectId, ref: 'FeePlan' },
  portalStatus: { type: String, enum: ['Not Activated', 'Invitation Sent', 'Active', 'Suspended', 'Archived'], default: 'Not Activated' },
  portalEnabled: { type: Boolean, default: false },
  portalAccessCode: String,
}, { timestamps: true });

// Add indexes for performance
studentSchema.index({ email: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ archived: 1 });

const roomSchema = new Schema({
  roomNumber: { type: String, required: true, unique: true },
  floor: String,
  type: { type: String, enum: ['Single', 'Double', 'Triple', 'Four Sharing', 'Custom'], default: 'Single' },
  monthlyRent: { type: Number, default: 0 },
  status: { type: String, enum: ['Available', 'Occupied', 'Maintenance'], default: 'Available' },
  totalBeds: { type: Number, default: 1 },
  beds: [{
    bedNumber: String,
    status: { type: String, enum: ['Available', 'Occupied', 'Maintenance'], default: 'Available' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  }],
}, { timestamps: true });

// Add indexes for performance
roomSchema.index({ roomNumber: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ floor: 1 });
roomSchema.index({ status: 1, type: 1 });

const rentRecordSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: String,
  room: String,
  month: { type: String, required: true },
  baseRent: { type: Number, default: 0 },
  additionalCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' },
}, { timestamps: true });

// Add indexes for performance
rentRecordSchema.index({ studentId: 1 });
rentRecordSchema.index({ month: 1 });
rentRecordSchema.index({ status: 1 });
rentRecordSchema.index({ studentId: 1, month: -1 });
rentRecordSchema.index({ status: 1, month: -1 });

const paymentSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: String,
  room: String,
  amount: { type: Number, required: true },
  paymentMode: { type: String, default: 'Cash' },
  paymentDate: { type: Date, default: Date.now },
  receiptNumber: String,
  transactionId: String,
  notes: String,
  correctedBy: String,
  correctionReason: String,
}, { timestamps: true });

// Add indexes for performance
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ studentId: 1, paymentDate: -1 });
paymentSchema.index({ paymentMode: 1 });
paymentSchema.index({ receiptNumber: 1 });

const expenseSchema = new Schema({
  title: { type: String, required: true },
  category: { type: String, default: 'Maintenance' },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: String,
  receiptUrl: String,
  archived: { type: Boolean, default: false },
}, { timestamps: true });

// Add indexes for performance
expenseSchema.index({ category: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ archived: 1 });
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ archived: 1, date: -1 });

const feePlanSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  packageId: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
  totalAmount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  paymentPlan: { type: String, enum: ['Full Payment', '2 Installments', '3 Installments', '4 Installments', '6 Installments', '12 Installments', 'Custom'], required: true },
  totalPaid: { type: Number, default: 0 },
  totalRemaining: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
}, { timestamps: true });

// Add indexes for performance
feePlanSchema.index({ studentId: 1 });
feePlanSchema.index({ packageId: 1 });
feePlanSchema.index({ status: 1 });
feePlanSchema.index({ startDate: -1 });
feePlanSchema.index({ endDate: -1 });
feePlanSchema.index({ studentId: 1, status: 1 });
feePlanSchema.index({ status: 1, startDate: -1 });

const portalAccessSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: String,
  email: String,
  portalEnabled: { type: Boolean, default: true },
  status: { type: String, default: 'Active' },
  lastLoginAt: Date,
  accessCode: String,
}, { timestamps: true });

// Add indexes for performance
portalAccessSchema.index({ studentId: 1 });
portalAccessSchema.index({ email: 1 });
portalAccessSchema.index({ accessCode: 1 });
portalAccessSchema.index({ status: 1 });
portalAccessSchema.index({ portalEnabled: 1 });

const pgSettingsSchema = new Schema({
  name: { type: String, default: 'YAHODA LIVING' },
  ownerName: { type: String, default: 'Admin' },
  address: { type: String, default: 'PG Address' },
  phone: { type: String, default: '+91 00000 00000' },
  email: { type: String, default: 'admin@yahoda.com' },
  logo: String,
  defaultMonthlyRent: { type: Number, default: 8000 },
  defaultDueDate: { type: Number, default: 5 },
  currency: { type: String, default: 'INR' },
  paymentMethods: [{ type: String, default: 'Cash' }],
}, { timestamps: true });

const installmentSchema = new Schema({
  feePlanId: { type: Schema.Types.ObjectId, ref: 'FeePlan' },
  rentRecordId: { type: Schema.Types.ObjectId, ref: 'RentRecord' },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: String,
  installmentNumber: { type: Number },
  sequenceNumber: { type: Number },
  totalInstallments: { type: Number },
  amountDue: { type: Number },
  amount: { type: Number },
  amountPaid: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Overdue'], default: 'Pending' },
  paidDate: Date,
  notes: String,
}, { timestamps: true });

// Add indexes for performance
installmentSchema.index({ studentId: 1 });
installmentSchema.index({ feePlanId: 1 });
installmentSchema.index({ dueDate: 1 });
installmentSchema.index({ status: 1 });

const receiptSchema = new Schema({
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  installmentId: { type: Schema.Types.ObjectId, ref: 'Installment' },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: String,
  amount: { type: Number, required: true },
  receiptImage: String,
  originalFilename: String,
  fileSize: Number,
  mimeType: String,
  uploadedAt: { type: Date, default: Date.now },
  verificationStatus: { type: String, default: 'Pending' },
  verifiedBy: String,
  verifiedAt: Date,
  verificationNotes: String,
  rejectionReason: String,
}, { timestamps: true });

// Add indexes for performance
receiptSchema.index({ studentId: 1 });
receiptSchema.index({ verificationStatus: 1 });

const activityLogSchema = new Schema({
  adminId: String,
  adminName: String,
  action: String,
  entity: String,
  entityId: String,
  previousValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

// Add indexes for performance
activityLogSchema.index({ adminId: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ entity: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ entity: 1, createdAt: -1 });

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  adminId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  type: { type: String, enum: ['payment_success', 'receipt_generated', 'receipt_submitted', 'receipt_verified', 'receipt_rejected', 'installment_due', 'installment_overdue', 'partial_payment', 'new_student', 'payment_received', 'receipt_requires_review', 'duplicate_receipt', 'payment_failed'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: Date,
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

// Add indexes for performance
notificationSchema.index({ userId: 1 });
notificationSchema.index({ studentId: 1 });
notificationSchema.index({ adminId: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ studentId: 1, read: 1 });

export const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Package = mongoose.models.Package || mongoose.model('Package', packageSchema);
export const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
export const RentRecord = mongoose.models.RentRecord || mongoose.model('RentRecord', rentRecordSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
export const FeePlan = mongoose.models.FeePlan || mongoose.model('FeePlan', feePlanSchema);
export const PortalAccess = mongoose.models.PortalAccess || mongoose.model('PortalAccess', portalAccessSchema);
export const PGSettings = mongoose.models.PGSettings || mongoose.model('PGSettings', pgSettingsSchema);
export const Installment = mongoose.models.Installment || mongoose.model('Installment', installmentSchema);
export const Receipt = mongoose.models.Receipt || mongoose.model('Receipt', receiptSchema);
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
