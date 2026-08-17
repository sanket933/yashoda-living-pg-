import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

const defaultLogin = {
  email: 'admin@yahoda.com',
  password: 'admin123',
};

const navItems = [
  'Dashboard',
  'Students',
  'Rooms',
  'Packages',
  'Rent',
  'Payments',
  'Expenses',
  'Plans',
  'Installments',
  'Receipts',
  'Portal Access',
  'Reports',
  'Activity Log',
  'Settings',
];

const initialStudentForm = {
  name: '',
  phone: '',
  email: '',
  room: '',
  bed: '',
  packageId: '',
  monthlyRent: 0,
  securityDeposit: 0,
  joiningDate: '',
  status: 'Active',
};

const initialRoomForm = {
  roomNumber: '',
  type: 'Single',
  monthlyRent: 0,
  status: 'Available',
};

const initialExpenseForm = {
  title: '',
  category: 'Utilities',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

const initialPlanForm = {
  name: '',
  amount: 0,
  billingCycle: 'Monthly',
  dueDay: 5,
  description: '',
  active: true,
};

const initialPaymentForm = {
  studentId: '',
  studentName: '',
  room: '',
  amount: 0,
  paymentMode: 'Cash',
  receiptNumber: '',
  transactionId: '',
  notes: '',
  month: '2026-08',
};

const initialSettingsForm = {
  name: 'YAHODA LIVING',
  ownerName: 'Admin',
  address: 'PG Address',
  phone: '+91 00000 00000',
  email: 'admin@yahoda.com',
  defaultMonthlyRent: 8000,
  defaultDueDate: 5,
  currency: 'INR',
  paymentMethods: 'Cash, UPI, Bank Transfer',
};

const initialInstallmentForm = {
  numberOfInstallments: 2,
  dueDate: new Date().toISOString().slice(0, 10),
};

const initialReceiptForm = {
  receiptImage: null,
  originalFilename: '',
  amount: 0,
  paymentId: '',
  installmentId: '',
};

function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('yahoda-token') || '');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [settings, setSettings] = useState({ name: 'YAHODA LIVING', phone: '+91 00000 00000', email: 'admin@yahoda.com', address: 'PG Address' });
  const [dashboard, setDashboard] = useState({ stats: {}, rooms: 0, recentPayments: [], recentExpenses: [] });
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [packages, setPackages] = useState([]);
  const [rent, setRent] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [portalAccess, setPortalAccess] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [roomForm, setRoomForm] = useState(initialRoomForm);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [settingsForm, setSettingsForm] = useState(initialSettingsForm);
  const [installmentForm, setInstallmentForm] = useState(initialInstallmentForm);
  const [receiptForm, setReceiptForm] = useState(initialReceiptForm);
  const [packageForm, setPackageForm] = useState({ name: '', description: '', amount: 0, foodIncluded: false, duration: 12, active: true });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [selectedRentForInstallments, setSelectedRentForInstallments] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReceiptVerifyModal, setShowReceiptVerifyModal] = useState(false);
  const [selectedReceiptForVerify, setSelectedReceiptForVerify] = useState(null);
  const [receiptVerificationForm, setReceiptVerificationForm] = useState({ verificationStatus: 'Approved', verificationNotes: '' });
  const [portalCodeDraft, setPortalCodeDraft] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  function showMessage(message) {
    setToast(message);
    window.clearTimeout(showMessage.timeoutId);
    showMessage.timeoutId = window.setTimeout(() => setToast(''), 2800);
  }

  async function loginIfNeeded() {
    if (!token) {
      const response = await API.post('/admin/login', defaultLogin);
      const nextToken = response.data.token;
      localStorage.setItem('yahoda-token', nextToken);
      setToken(nextToken);
      return nextToken;
    }
    return token;
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError('');
      const currentToken = await loginIfNeeded();
      const authConfig = { headers: { Authorization: `Bearer ${currentToken}` } };

      const [dashboardRes, studentsRes, roomsRes, packagesRes, rentRes, paymentsRes, expensesRes, plansRes, installmentsRes, receiptsRes, portalRes, settingsRes, logsRes, notificationsRes] = await Promise.all([
        API.get('/admin/dashboard', authConfig),
        API.get('/admin/students', authConfig),
        API.get('/admin/rooms', authConfig),
        API.get('/admin/packages', authConfig),
        API.get('/admin/rent', authConfig),
        API.get('/admin/payments', authConfig),
        API.get('/admin/expenses', authConfig),
        API.get('/admin/fee-plans', authConfig),
        API.get('/admin/installments', authConfig),
        API.get('/admin/receipts', authConfig),
        API.get('/admin/portal-access', authConfig),
        API.get('/admin/settings', authConfig),
        API.get('/admin/activity-log', authConfig),
        API.get('/admin/notifications', authConfig),
      ]);

      setDashboard(dashboardRes.data);
      setStudents(studentsRes.data.students || []);
      setRooms(roomsRes.data.rooms || []);
      setPackages(packagesRes.data.packages || []);
      setRent(rentRes.data.records || []);
      setPayments(paymentsRes.data.payments || []);
      setExpenses(expensesRes.data.expenses || []);
      setPlans(plansRes.data.plans || []);
      setInstallments(installmentsRes.data.installments || []);
      setReceipts(receiptsRes.data.receipts || []);
      setPortalAccess(portalRes.data.access || []);
      setSettings(settingsRes.data.settings || settings);
      setLogs(logsRes.data.logs || []);
      setNotifications(notificationsRes.data.notifications || []);
      setSettingsForm({
        name: settingsRes.data.settings?.name || 'YAHODA LIVING',
        ownerName: settingsRes.data.settings?.ownerName || 'Admin',
        address: settingsRes.data.settings?.address || 'PG Address',
        phone: settingsRes.data.settings?.phone || '+91 00000 00000',
        email: settingsRes.data.settings?.email || 'admin@yahoda.com',
        defaultMonthlyRent: settingsRes.data.settings?.defaultMonthlyRent || 8000,
        defaultDueDate: settingsRes.data.settings?.defaultDueDate || 5,
        currency: settingsRes.data.settings?.currency || 'INR',
        paymentMethods: (settingsRes.data.settings?.paymentMethods || ['Cash', 'UPI', 'Bank Transfer']).join(', '),
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(value) {
    const query = value.trim();
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await API.get('/admin/search', { headers: authHeaders, params: { q: query } });
      setSearchResults(response.data.results || []);
    } catch (requestError) {
      console.error(requestError);
    }
  }

  async function submitStudent(event) {
    event.preventDefault();
    const currentToken = token || (await loginIfNeeded());
    const payload = {
      ...studentForm,
      monthlyRent: Number(studentForm.monthlyRent || 0),
      securityDeposit: Number(studentForm.securityDeposit || 0),
    };

    try {
      if (editingStudentId) {
        await API.put(`/admin/students/${editingStudentId}`, payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Student information updated successfully.');
      } else {
        await API.post('/admin/students', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Student added successfully.');
      }
      setShowStudentModal(false);
      setStudentForm(initialStudentForm);
      setEditingStudentId(null);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save student.');
    }
  }

  async function submitRoom(event) {
    event.preventDefault();
    const currentToken = token || (await loginIfNeeded());
    const payload = { ...roomForm, monthlyRent: Number(roomForm.monthlyRent || 0) };
    try {
      await API.post('/admin/rooms', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage('Room added successfully.');
      setShowRoomModal(false);
      setRoomForm(initialRoomForm);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save room.');
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    const currentToken = token || (await loginIfNeeded());
    const payload = { ...expenseForm, amount: Number(expenseForm.amount || 0) };
    try {
      if (editingExpenseId) {
        await API.put(`/admin/expenses/${editingExpenseId}`, payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Expense updated successfully.');
      } else {
        await API.post('/admin/expenses', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Expense added successfully.');
      }
      setShowExpenseModal(false);
      setExpenseForm(initialExpenseForm);
      setEditingExpenseId(null);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save expense.');
    }
  }

  async function submitPlan(event) {
    event.preventDefault();
    const currentToken = token || (await loginIfNeeded());
    const payload = { ...planForm, amount: Number(planForm.amount || 0), dueDay: Number(planForm.dueDay || 0) };
    try {
      if (editingPlanId) {
        await API.put(`/admin/fee-plans/${editingPlanId}`, payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Fee plan updated successfully.');
      } else {
        await API.post('/admin/fee-plans', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Fee plan added successfully.');
      }
      setShowPlanModal(false);
      setPlanForm(initialPlanForm);
      setEditingPlanId(null);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save fee plan.');
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    const currentToken = token || (await loginIfNeeded());
    const student = students.find((item) => item._id === paymentForm.studentId) || {};
    const payload = {
      ...paymentForm,
      studentName: paymentForm.studentName || student.name || 'Student',
      room: paymentForm.room || student.room || '—',
      amount: Number(paymentForm.amount || 0),
    };
    try {
      await API.post('/admin/payments', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage('Payment recorded successfully.');
      setShowPaymentModal(false);
      setPaymentForm(initialPaymentForm);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to record payment.');
    }
  }

  async function createInstallments(event) {
    event.preventDefault();
    if (!selectedRentForInstallments) return;
    
    const currentToken = token || (await loginIfNeeded());
    const payload = {
      numberOfInstallments: Number(installmentForm.numberOfInstallments || 2),
      dueDate: installmentForm.dueDate,
    };
    
    try {
      await API.post(`/admin/rent/${selectedRentForInstallments}/create-installments`, payload, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage('Installments created successfully.');
      setShowInstallmentModal(false);
      setSelectedRentForInstallments(null);
      setInstallmentForm(initialInstallmentForm);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create installments.');
    }
  }

  async function markInstallmentAsPaid(installmentId) {
    const currentToken = token || (await loginIfNeeded());
    try {
      await API.post(`/admin/installments/${installmentId}/pay`, { paidAmount: null }, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage('Installment marked as paid.');
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to mark installment as paid.');
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    const currentToken = token || (await loginIfNeeded());
    const payload = {
      ...settingsForm,
      defaultMonthlyRent: Number(settingsForm.defaultMonthlyRent || 0),
      defaultDueDate: Number(settingsForm.defaultDueDate || 0),
      paymentMethods: settingsForm.paymentMethods.split(',').map((item) => item.trim()).filter(Boolean),
    };
    try {
      const response = await API.put('/admin/settings', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
      setSettings(response.data.settings || payload);
      setShowSettingsModal(false);
      showMessage('PG settings updated successfully.');
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update settings.');
    }
  }

  async function issuePortalAccess(studentId) {
    const currentToken = token || (await loginIfNeeded());
    const student = students.find((item) => item._id === studentId);
    if (!student) return;

    const draftCode = portalCodeDraft || `YH-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await API.post(`/admin/students/${studentId}/portal-access`, { accessCode: draftCode }, { headers: { Authorization: `Bearer ${currentToken}` } });
      setPortalCodeDraft('');
      showMessage('Portal access code issued successfully.');
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to issue portal access.');
    }
  }

  async function submitReceipt(event) {
    event.preventDefault();
    if (!receiptForm.receiptImage) {
      setError('Please select a receipt image.');
      return;
    }

    const currentToken = token || (await loginIfNeeded());
    const payload = {
      receiptImage: receiptForm.receiptImage,
      originalFilename: receiptForm.originalFilename,
      fileSize: receiptForm.fileSize || 0,
      mimeType: receiptForm.mimeType || 'image/jpeg',
      amount: Number(receiptForm.amount || 0),
      paymentId: receiptForm.paymentId || null,
      installmentId: receiptForm.installmentId || null,
    };

    try {
      await API.post('/student/receipts', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage('Receipt uploaded successfully. Awaiting admin verification.');
      setShowReceiptModal(false);
      setReceiptForm(initialReceiptForm);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to upload receipt.');
    }
  }

  async function verifyReceipt(event) {
    event.preventDefault();
    if (!selectedReceiptForVerify) return;

    const currentToken = token || (await loginIfNeeded());
    const payload = {
      verificationStatus: receiptVerificationForm.verificationStatus,
      verificationNotes: receiptVerificationForm.verificationNotes,
      rejectionReason: receiptVerificationForm.verificationStatus === 'Rejected' ? receiptVerificationForm.verificationNotes : null,
    };

    try {
      await API.put(`/admin/receipts/${selectedReceiptForVerify._id}`, payload, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage(`Receipt ${receiptVerificationForm.verificationStatus.toLowerCase()} successfully.`);
      setShowReceiptVerifyModal(false);
      setSelectedReceiptForVerify(null);
      setReceiptVerificationForm({ verificationStatus: 'Approved', verificationNotes: '' });
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to verify receipt.');
    }
  }

  function openVerifyReceipt(receipt) {
    setSelectedReceiptForVerify(receipt);
    setReceiptVerificationForm({ verificationStatus: receipt.verificationStatus || 'Approved', verificationNotes: '' });
    setShowReceiptVerifyModal(true);
  }

  function handleReceiptImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result;
      setReceiptForm({
        ...receiptForm,
        receiptImage: base64,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  function openEditStudent(student) {
    setStudentForm({
      name: student.name || '',
      phone: student.phone || '',
      email: student.email || '',
      room: student.room || '',
      bed: student.bed || '',
      packageId: student.packageId || '',
      monthlyRent: student.monthlyRent || 0,
      securityDeposit: student.securityDeposit || 0,
      joiningDate: student.joiningDate ? String(student.joiningDate).slice(0, 10) : '',
      status: student.status || 'Active',
      feePlanId: student.feePlanId || '',
      portalEnabled: Boolean(student.portalEnabled),
    });
    setEditingStudentId(student._id);
    setShowStudentModal(true);
  }

  function openEditPackage(pkg) {
    setPackageForm({
      name: pkg.name || '',
      description: pkg.description || '',
      amount: pkg.amount || 0,
      foodIncluded: pkg.foodIncluded || false,
      duration: pkg.duration || 12,
      active: pkg.active !== false,
    });
    setEditingPackageId(pkg._id);
    setShowPackageModal(true);
  }

  async function submitPackage(event) {
    event.preventDefault();
    const currentToken = token || (await loginIfNeeded());
    const payload = {
      ...packageForm,
      amount: Number(packageForm.amount || 0),
      duration: Number(packageForm.duration || 12),
    };

    try {
      if (editingPackageId) {
        await API.put(`/admin/packages/${editingPackageId}`, payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Package updated successfully.');
      } else {
        await API.post('/admin/packages', payload, { headers: { Authorization: `Bearer ${currentToken}` } });
        showMessage('Package added successfully.');
      }
      setShowPackageModal(false);
      setPackageForm({ name: '', description: '', amount: 0, foodIncluded: false, duration: 12, active: true });
      setEditingPackageId(null);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save package.');
    }
  }

  function openEditPlan(plan) {
    setPlanForm({
      name: plan.name || '',
      amount: plan.amount || 0,
      billingCycle: plan.billingCycle || 'Monthly',
      dueDay: plan.dueDay || 5,
      description: plan.description || '',
      active: plan.active !== false,
    });
    setEditingPlanId(plan._id);
    setShowPlanModal(true);
  }

  function openEditExpense(expense) {
    setExpenseForm({
      title: expense.title || '',
      category: expense.category || 'Utilities',
      amount: expense.amount || 0,
      date: expense.date ? String(expense.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: expense.notes || '',
    });
    setEditingExpenseId(expense._id);
    setShowExpenseModal(true);
  }

  function archiveStudent(studentId) {
    const target = students.find((student) => student._id === studentId);
    if (!target) return;
    setError('Archive action is available in the API layer. The current UI keeps historic data protected and leaves records in place.');
  }

  async function sendReminders() {
    try {
      const currentToken = token || (await loginIfNeeded());
      const response = await API.post('/admin/automation/send-reminders', { daysBefore: 7 }, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage(`Sent ${response.data.remindersSent} reminders`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reminders');
    }
  }

  async function checkOverdue() {
    try {
      const currentToken = token || (await loginIfNeeded());
      const response = await API.post('/admin/automation/check-overdue', {}, { headers: { Authorization: `Bearer ${currentToken}` } });
      showMessage(`Marked ${response.data.overdueCount} installments as overdue`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check overdue');
    }
  }

  async function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportStudents() {
    try {
      const currentToken = token || (await loginIfNeeded());
      const response = await API.get('/admin/export/students', { headers: { Authorization: `Bearer ${currentToken}` } });
      exportToCSV(response.data.data, 'students_export');
      showMessage('Students exported successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export students');
    }
  }

  async function exportPayments() {
    try {
      const currentToken = token || (await loginIfNeeded());
      const response = await API.get('/admin/export/payments', { headers: { Authorization: `Bearer ${currentToken}` } });
      exportToCSV(response.data.data, 'payments_export');
      showMessage('Payments exported successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export payments');
    }
  }

  async function exportRent() {
    try {
      const currentToken = token || (await loginIfNeeded());
      const response = await API.get('/admin/export/rent', { headers: { Authorization: `Bearer ${currentToken}` } });
      exportToCSV(response.data.data, 'rent_records_export');
      showMessage('Rent records exported successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export rent records');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const statsCards = [
    { label: 'TOTAL STUDENTS', value: dashboard?.stats?.totalStudents ?? students.length, action: 'View Students', accent: 'blue' },
    { label: 'RENT PENDING', value: currency(dashboard?.stats?.pendingRent ?? 0), action: 'View Pending', accent: 'amber' },
    { label: 'RENT COLLECTED', value: currency(dashboard?.stats?.rentCollected ?? 0), action: 'View Payments', accent: 'green' },
    { label: 'EXPENSES', value: currency(dashboard?.stats?.expenses ?? 0), action: 'View Expenses', accent: 'red' },
    { label: 'FEE PLANS', value: dashboard?.stats?.feePlans ?? plans.length, action: 'Manage Plans', accent: 'violet' },
    { label: 'PORTAL READY', value: dashboard?.stats?.portalReady ?? portalAccess.filter((access) => access.status === 'Active').length, action: 'Portal Access', accent: 'cyan' },
  ];

  const renderDashboard = () => (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Admin overview</p>
          <h2>Dashboard</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="secondary-button" onClick={sendReminders}>Send Reminders</button>
          <button className="secondary-button" onClick={checkOverdue}>Check Overdue</button>
          <button className="primary-button" onClick={() => setActiveTab('Rent')}>Generate Monthly Rent</button>
        </div>
      </div>

      <div className="stats-grid">
        {statsCards.map((card) => (
          <button key={card.label} className={`stat-card ${card.accent}`} onClick={() => setActiveTab(card.action.includes('Students') ? 'Students' : card.action.includes('Pending') ? 'Rent' : card.action.includes('Payments') ? 'Payments' : card.action.includes('Plans') ? 'Plans' : card.action.includes('Portal') ? 'Portal Access' : 'Expenses')}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.action}</small>
          </button>
        ))}
      </div>

      <div className="quick-actions">
        <button className="primary-button" onClick={() => { setShowStudentModal(true); setEditingStudentId(null); setStudentForm(initialStudentForm); }}>+ Add Student</button>
        <button className="secondary-button" onClick={() => { setShowRoomModal(true); setRoomForm(initialRoomForm); }}>+ Add Room</button>
        <button className="secondary-button" onClick={() => { setShowPaymentModal(true); setPaymentForm(initialPaymentForm); }}>+ Record Payment</button>
        <button className="secondary-button" onClick={() => { setShowExpenseModal(true); setExpenseForm(initialExpenseForm); }}>+ Add Expense</button>
        <button className="secondary-button" onClick={() => setActiveTab('Rent')}>Generate Monthly Rent</button>
      </div>

      <div className="content-grid two-columns">
        <div className="panel">
          <h3>Recent payments</h3>
          <ul className="list">
            {(dashboard.recentPayments || []).map((payment) => (
              <li key={payment._id || payment.receiptNumber}>
                <span>{payment.studentName || 'Student'}</span>
                <strong>{currency(payment.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h3>Recent expenses</h3>
          <ul className="list">
            {(dashboard.recentExpenses || []).map((expense) => (
              <li key={expense._id || expense.title}>
                <span>{expense.title}</span>
                <strong>{currency(expense.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="content-grid two-columns">
        <div className="panel">
          <h3>Financial Summary</h3><p>Collections: {currency(dashboard?.stats?.rentCollected || 0)}</p><p>Expenses: {currency(dashboard?.stats?.expenses || 0)}</p><p>Profit: {currency((dashboard?.stats?.rentCollected || 0) - (dashboard?.stats?.expenses || 0))}</p>
        </div>
        <div className="panel">
          <h3>Occupancy</h3><p>Active students: {dashboard?.stats?.totalStudents || 0}</p><p>Total rooms: {rooms.length}</p>
        </div>
      </div>

      <div className="panel">
        <h3>Notifications ({notifications.filter(n => !n.read).length} unread)</h3>
        {notifications.length === 0 ? (
          <p style={{ color: '#64748b', margin: '0' }}>No notifications</p>
        ) : (
          <ul className="list">
            {notifications.slice(0, 5).map((notif) => (
              <li key={notif._id} style={{ background: notif.read ? 'transparent' : '#eff6ff' }}>
                <span>{notif.title}</span>
                <small style={{ color: '#64748b' }}>{formatDate(notif.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="page">
      <div className="section-header">
        <div><p className="eyebrow">Residents</p><h2>Students</h2></div>
        <button className="primary-button" onClick={() => { setShowStudentModal(true); setEditingStudentId(null); setStudentForm(initialStudentForm); }}>Add Student</button>
      </div>
      <div className="table-box">
        <table>
          <thead>
            <tr><th>Student</th><th>Room</th><th>Rent</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(students || []).map((student) => (
              <tr key={student._id}>
                <td>{student.name}</td>
                <td>{student.room || '—'}</td>
                <td>{currency(student.monthlyRent)}</td>
                <td><span className="pill">{student.status || 'Active'}</span></td>
                <td className="actions">
                  <button onClick={() => openEditStudent(student)}>Edit</button>
                  <button onClick={() => archiveStudent(student._id)}>Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRooms = () => (
    <div className="page">
      <div className="section-header">
        <div><p className="eyebrow">Property</p><h2>Rooms</h2></div>
        <button className="primary-button" onClick={() => { setShowRoomModal(true); setRoomForm(initialRoomForm); }}>Add Room</button>
      </div>
      <div className="table-box">
        <table>
          <thead>
            <tr><th>Room</th><th>Type</th><th>Rent</th><th>Status</th><th>Beds</th></tr>
          </thead>
          <tbody>
            {(rooms || []).map((room) => (
              <tr key={room._id}>
                <td>{room.roomNumber}</td>
                <td>{room.type}</td>
                <td>{currency(room.monthlyRent)}</td>
                <td><span className="pill">{room.status}</span></td>
                <td>{room.beds?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPackages = () => (
    <div className="page">
      <div className="section-header">
        <div><p className="eyebrow">Fee Structure</p><h2>Packages</h2></div>
        <button className="primary-button" onClick={() => { setShowPackageModal(true); setEditingPackageId(null); setPackageForm({ name: '', description: '', amount: 0, foodIncluded: false, duration: 12, active: true }); }}>Add Package</button>
      </div>
      <div className="table-box">
        <table>
          <thead>
            <tr><th>Package Name</th><th>Description</th><th>Amount</th><th>Food Included</th><th>Duration</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(packages || []).map((pkg) => (
              <tr key={pkg._id}>
                <td>{pkg.name}</td>
                <td>{pkg.description || '—'}</td>
                <td>{currency(pkg.amount)}</td>
                <td>{pkg.foodIncluded ? '✓ Yes' : '✗ No'}</td>
                <td>{pkg.duration} months</td>
                <td><span className="pill">{pkg.active === false ? 'Inactive' : 'Active'}</span></td>
                <td className="actions">
                  <button onClick={() => openEditPackage(pkg)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRent = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Finance</p><h2>Rent Records</h2></div><button className="primary-button">Generate Rent</button></div>
      <div className="table-box">
        <table>
          <thead>
            <tr><th>Student</th><th>Month</th><th>Base</th><th>Paid</th><th>Pending</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(rent || []).map((record) => (
              <tr key={record._id}>
                <td>{record.studentName}</td>
                <td>{record.month}</td>
                <td>{currency(record.baseRent)}</td>
                <td>{currency(record.paidAmount)}</td>
                <td>{currency(record.remainingAmount)}</td>
                <td><span className="pill">{record.status}</span></td>
                <td className="actions"><button onClick={() => { setSelectedRentForInstallments(record._id); setShowInstallmentModal(true); }}>Create Installments</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Transactions</p><h2>Payments</h2></div><button className="primary-button" onClick={() => { setShowPaymentModal(true); setPaymentForm(initialPaymentForm); }}>Record Payment</button></div>
      <div className="table-box">
        <table>
          <thead><tr><th>Student</th><th>Amount</th><th>Mode</th><th>Receipt</th><th>Date</th></tr></thead>
          <tbody>
            {(payments || []).map((payment) => (
              <tr key={payment._id}><td>{payment.studentName}</td><td>{currency(payment.amount)}</td><td>{payment.paymentMode}</td><td>{payment.receiptNumber}</td><td>{formatDate(payment.paymentDate)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Costs</p><h2>Expenses</h2></div><button className="primary-button" onClick={() => { setShowExpenseModal(true); setExpenseForm(initialExpenseForm); }}>Add Expense</button></div>
      <div className="table-box">
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {(expenses || []).map((expense) => (
              <tr key={expense._id}>
                <td>{expense.title}</td>
                <td>{expense.category}</td>
                <td>{currency(expense.amount)}</td>
                <td>{formatDate(expense.date)}</td>
                <td className="actions"><button onClick={() => openEditExpense(expense)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPlans = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Plan control</p><h2>Fee Plans</h2></div><button className="primary-button" onClick={() => { setShowPlanModal(true); setEditingPlanId(null); setPlanForm(initialPlanForm); }}>Add Plan</button></div>
      <div className="table-box">
        <table>
          <thead><tr><th>Name</th><th>Billing</th><th>Amount</th><th>Due Day</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {(plans || []).map((plan) => (
              <tr key={plan._id}><td>{plan.name}</td><td>{plan.billingCycle}</td><td>{currency(plan.amount)}</td><td>{plan.dueDay}</td><td><span className="pill">{plan.active === false ? 'Inactive' : 'Active'}</span></td><td className="actions"><button onClick={() => openEditPlan(plan)}>Edit</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPortalAccess = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Student access</p><h2>Portal Access</h2></div></div>
      <div className="portal-controls panel">
        <label htmlFor="portalCodeInput">New access code</label>
        <div className="portal-control-row">
          <input id="portalCodeInput" value={portalCodeDraft} onChange={(event) => setPortalCodeDraft(event.target.value)} placeholder="e.g. YH-7421" />
          <button className="primary-button" onClick={() => issuePortalAccess(students[0]?._id)}>Assign to first student</button>
        </div>
      </div>
      <div className="table-box">
        <table>
          <thead><tr><th>Student</th><th>Email</th><th>Access Code</th><th>Status</th><th>Last Login</th><th>Action</th></tr></thead>
          <tbody>
            {(portalAccess || []).map((entry) => (
              <tr key={entry._id}>
                <td>{entry.studentName}</td>
                <td>{entry.email}</td>
                <td>{entry.accessCode}</td>
                <td><span className="pill">{entry.status}</span></td>
                <td>{formatDate(entry.lastLoginAt)}</td>
                <td className="actions"><button onClick={() => issuePortalAccess(students.find((student) => student.email === entry.email)?._id || entry.studentId)}>Issue Code</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel">
          <h3>Recent expenses</h3>
          <ul className="list">
            {(dashboard.recentExpenses || []).map((expense) => (
              <li key={expense._id}>
                <span>{expense.title || 'Expense'}</span>
                <strong>{currency(expense.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Insights</p><h2>Reports</h2></div></div>
      <div className="report-grid">
        <div className="panel"><h3>Financial Summary</h3><p>Collections: {currency(dashboard?.stats?.rentCollected || 0)}</p><p>Expenses: {currency(dashboard?.stats?.expenses || 0)}</p><p>Profit: {currency((dashboard?.stats?.rentCollected || 0) - (dashboard?.stats?.expenses || 0))}</p></div>
        <div className="panel"><h3>Occupancy</h3><p>Active students: {dashboard?.stats?.totalStudents || 0}</p><p>Total rooms: {rooms.length}</p></div>
        <div className="panel"><h3>Advanced Stats</h3><p>Overdue Installments: {dashboard?.stats?.overdueInstallments || 0}</p><p>Occupancy Rate: {dashboard?.stats?.occupancyRate || '0%'}</p><p>Collection Rate: {dashboard?.stats?.collectionRate || '0%'}</p></div>
      </div>
      <div className="content-grid two-columns">
        <div className="panel">
          <h3>Financial Summary</h3><p>Collections: {currency(dashboard?.stats?.rentCollected || 0)}</p><p>Expenses: {currency(dashboard?.stats?.expenses || 0)}</p><p>Profit: {currency((dashboard?.stats?.rentCollected || 0) - (dashboard?.stats?.expenses || 0))}</p>
        </div>
        <div className="panel">
          <h3>Occupancy</h3><p>Active students: {dashboard?.stats?.totalStudents || 0}</p><p>Total rooms: {rooms.length}</p>
        </div>
      </div>
      <div className="panel">
        <h3>Export Data</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="secondary-button" onClick={exportStudents}>Export Students (CSV)</button>
          <button className="secondary-button" onClick={exportPayments}>Export Payments (CSV)</button>
          <button className="secondary-button" onClick={exportRent}>Export Rent Records (CSV)</button>
        </div>
      </div>
    </div>
  );

  const renderInstallments = () => {
    const pendingInstallments = (installments || []).filter((inst) => inst.status === 'Pending');
    const paidInstallments = (installments || []).filter((inst) => inst.status === 'Paid');
    
    return (
      <div className="page">
        <div className="section-header"><div><p className="eyebrow">Payment plans</p><h2>Installments</h2></div></div>
        <div className="table-box">
          <h3>Pending Installments ({pendingInstallments.length})</h3>
          <table>
            <thead><tr><th>Student</th><th>Sequence</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {pendingInstallments.map((inst) => (
                <tr key={inst._id}><td>{inst.studentName}</td><td>{inst.sequenceNumber}/{inst.totalInstallments}</td><td>{currency(inst.amount)}</td><td>{formatDate(inst.dueDate)}</td><td><span className="pill">{inst.status}</span></td><td className="actions"><button onClick={() => markInstallmentAsPaid(inst._id)}>Mark Paid</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-box">
          <h3>Paid Installments ({paidInstallments.length})</h3>
          <table>
            <thead><tr><th>Student</th><th>Sequence</th><th>Amount</th><th>Paid Date</th><th>Status</th></tr></thead>
            <tbody>
              {paidInstallments.map((inst) => (
                <tr key={inst._id}><td>{inst.studentName}</td><td>{inst.sequenceNumber}/{inst.totalInstallments}</td><td>{currency(inst.amount)}</td><td>{formatDate(inst.paidDate)}</td><td><span className="pill">{inst.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReceipts = () => {
    const pendingReceipts = (receipts || []).filter((r) => r.verificationStatus === 'Pending');
    const approvedReceipts = (receipts || []).filter((r) => r.verificationStatus === 'Approved');
    const rejectedReceipts = (receipts || []).filter((r) => r.verificationStatus === 'Rejected');

    return (
      <div className="page">
        <div className="section-header"><div><p className="eyebrow">Payment proof</p><h2>Receipt Verification</h2></div><button onClick={() => setShowReceiptModal(true)}>Upload Receipt</button></div>
        <div className="table-box">
          <h3>Pending Receipts ({pendingReceipts.length})</h3>
          <table>
            <thead><tr><th>Student</th><th>Amount</th><th>Upload Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {pendingReceipts.map((receipt) => (
                <tr key={receipt._id}><td>{receipt.studentName}</td><td>{currency(receipt.amount)}</td><td>{formatDate(receipt.uploadedAt)}</td><td><span className="pill">{receipt.verificationStatus}</span></td><td className="actions"><button onClick={() => openVerifyReceipt(receipt)}>Verify</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-box">
          <h3>Approved Receipts ({approvedReceipts.length})</h3>
          <table>
            <thead><tr><th>Student</th><th>Amount</th><th>Upload Date</th><th>Verified By</th><th>Status</th></tr></thead>
            <tbody>
              {approvedReceipts.map((receipt) => (
                <tr key={receipt._id}><td>{receipt.studentName}</td><td>{currency(receipt.amount)}</td><td>{formatDate(receipt.uploadedAt)}</td><td>{receipt.verifiedBy}</td><td><span className="pill approved">{receipt.verificationStatus}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-box">
          <h3>Rejected Receipts ({rejectedReceipts.length})</h3>
          <table>
            <thead><tr><th>Student</th><th>Amount</th><th>Upload Date</th><th>Rejection Reason</th><th>Status</th></tr></thead>
            <tbody>
              {rejectedReceipts.map((receipt) => (
                <tr key={receipt._id}><td>{receipt.studentName}</td><td>{currency(receipt.amount)}</td><td>{formatDate(receipt.uploadedAt)}</td><td>{receipt.rejectionReason}</td><td><span className="pill rejected">{receipt.verificationStatus}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLogs = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Audit trail</p><h2>Activity Log</h2></div></div>
      <div className="log-list">
        {(logs || []).map((log) => (
          <div key={log._id} className="log-item">
            <span>{formatDate(log.createdAt)}</span>
            <strong>{log.adminName || 'Admin'}</strong>
            <p>{log.action}</p>
            <small>{log.entity}</small>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Control</p><h2>Settings</h2></div><button className="primary-button" onClick={() => { setShowSettingsModal(true); setSettingsForm({ ...settingsForm, ...settings }); }}>Edit Settings</button></div>
      <div className="settings-grid">
        <div className="panel"><p>PG Name</p><strong>{settings.name}</strong></div>
        <div className="panel"><p>Owner Name</p><strong>{settings.ownerName || 'Admin'}</strong></div>
        <div className="panel"><p>Phone</p><strong>{settings.phone}</strong></div>
        <div className="panel"><p>Email</p><strong>{settings.email}</strong></div>
        <div className="panel"><p>Address</p><strong>{settings.address}</strong></div>
        <div className="panel"><p>Default Due Date</p><strong>{settings.defaultDueDate || 5}</strong></div>
      </div>
    </div>
  );

  const contentMap = {
    Dashboard: renderDashboard,
    Students: renderStudents,
    Rooms: renderRooms,
    Packages: renderPackages,
    Rent: renderRent,
    Payments: renderPayments,
    Expenses: renderExpenses,
    Plans: renderPlans,
    Installments: renderInstallments,
    Receipts: renderReceipts,
    'Portal Access': renderPortalAccess,
    Reports: renderReports,
    'Activity Log': renderLogs,
    Settings: renderSettings,
  };

  const Content = contentMap[activeTab] || renderDashboard;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">Y</div>
          <div>
            <h1>{settings.name}</h1>
            <small>Admin Panel</small>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <button key={item} className={activeTab === item ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(item)}>{item}</button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="search-wrap">
            <input value={searchQuery} onChange={(event) => handleSearch(event.target.value)} placeholder="Search students, rooms, payments, receipt numbers..." />
          </div>
          <div className="topbar-right">
            <span>{settings.email}</span>
            <button className="ghost-button" onClick={() => { localStorage.removeItem('yahoda-token'); window.location.reload(); }}>Logout</button>
          </div>
        </header>

        {searchResults.length > 0 && (
          <div className="search-results-panel">
            {searchResults.map((result, index) => (
              <div className="search-result" key={`${result._id || index}-${result.type || 'item'}`}>
                <strong>{result.name || result.studentName || result.roomNumber || 'Result'}</strong>
                <span>{result.type || 'record'}</span>
              </div>
            ))}
          </div>
        )}

        {error && <div className="alert-box">{error}</div>}
        {toast && <div className="toast-alert">{toast}</div>}
        {loading ? <div className="loader">Loading admin data...</div> : <Content />}
      </main>

      {showStudentModal && (
        <div className="modal-backdrop" onClick={() => setShowStudentModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingStudentId ? 'Edit Student' : 'Add Student'}</h3>
              <button onClick={() => setShowStudentModal(false)}>Close</button>
            </div>
            <form onSubmit={submitStudent} className="form-grid">
              <input value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} placeholder="Full name" required />
              <input value={studentForm.phone} onChange={(event) => setStudentForm({ ...studentForm, phone: event.target.value })} placeholder="Phone number" required />
              <input value={studentForm.email} onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })} placeholder="Email" type="email" />
              <input value={studentForm.room} onChange={(event) => setStudentForm({ ...studentForm, room: event.target.value })} placeholder="Room number" />
              <input value={studentForm.bed} onChange={(event) => setStudentForm({ ...studentForm, bed: event.target.value })} placeholder="Bed number" />
              <select value={studentForm.packageId || ''} onChange={(event) => setStudentForm({ ...studentForm, packageId: event.target.value })}>
                <option value="">Select package</option>
                {(packages || []).map((pkg) => <option key={pkg._id} value={pkg._id}>{pkg.name} - {currency(pkg.amount)}</option>)}
              </select>
              <input value={studentForm.monthlyRent} onChange={(event) => setStudentForm({ ...studentForm, monthlyRent: event.target.value })} placeholder="Monthly rent" type="number" />
              <input value={studentForm.securityDeposit} onChange={(event) => setStudentForm({ ...studentForm, securityDeposit: event.target.value })} placeholder="Security deposit" type="number" />
              <input value={studentForm.joiningDate} onChange={(event) => setStudentForm({ ...studentForm, joiningDate: event.target.value })} type="date" />
              <select value={studentForm.status} onChange={(event) => setStudentForm({ ...studentForm, status: event.target.value })}>
                <option>Active</option>
                <option>Notice Period</option>
                <option>Left</option>
                <option>Archived</option>
              </select>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(studentForm.portalEnabled)} onChange={(event) => setStudentForm({ ...studentForm, portalEnabled: event.target.checked })} />
                Enable student portal
              </label>
              <button type="submit" className="primary-button">{editingStudentId ? 'Update Student' : 'Save Student'}</button>
            </form>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="modal-backdrop" onClick={() => setShowPlanModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPlanId ? 'Edit Fee Plan' : 'Add Fee Plan'}</h3>
              <button onClick={() => setShowPlanModal(false)}>Close</button>
            </div>
            <form onSubmit={submitPlan} className="form-grid">
              <input value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} placeholder="Plan name" required />
              <input value={planForm.amount} onChange={(event) => setPlanForm({ ...planForm, amount: event.target.value })} placeholder="Plan amount" type="number" required />
              <select value={planForm.billingCycle} onChange={(event) => setPlanForm({ ...planForm, billingCycle: event.target.value })}>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Yearly</option>
              </select>
              <input value={planForm.dueDay} onChange={(event) => setPlanForm({ ...planForm, dueDay: event.target.value })} placeholder="Due day" type="number" />
              <textarea value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} placeholder="Description" rows="3" />
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(planForm.active)} onChange={(event) => setPlanForm({ ...planForm, active: event.target.checked })} />
                Active plan
              </label>
              <button type="submit" className="primary-button">{editingPlanId ? 'Update Plan' : 'Save Plan'}</button>
            </form>
          </div>
        </div>
      )}

      {showPackageModal && (
        <div className="modal-backdrop" onClick={() => setShowPackageModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPackageId ? 'Edit Package' : 'Add Package'}</h3>
              <button onClick={() => setShowPackageModal(false)}>Close</button>
            </div>
            <form onSubmit={submitPackage} className="form-grid">
              <input value={packageForm.name} onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })} placeholder="Package name" required />
              <input value={packageForm.amount} onChange={(event) => setPackageForm({ ...packageForm, amount: event.target.value })} placeholder="Package amount" type="number" required />
              <textarea value={packageForm.description} onChange={(event) => setPackageForm({ ...packageForm, description: event.target.value })} placeholder="Description" rows="3" />
              <input value={packageForm.duration} onChange={(event) => setPackageForm({ ...packageForm, duration: event.target.value })} placeholder="Duration (months)" type="number" />
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(packageForm.foodIncluded)} onChange={(event) => setPackageForm({ ...packageForm, foodIncluded: event.target.checked })} />
                Food Included
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(packageForm.active)} onChange={(event) => setPackageForm({ ...packageForm, active: event.target.checked })} />
                Active package
              </label>
              <button type="submit" className="primary-button">{editingPackageId ? 'Update Package' : 'Save Package'}</button>
            </form>
          </div>
        </div>
      )}

      {showRoomModal && (
        <div className="modal-backdrop" onClick={() => setShowRoomModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Room</h3>
              <button onClick={() => setShowRoomModal(false)}>Close</button>
            </div>
            <form onSubmit={submitRoom} className="form-grid">
              <input value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} placeholder="Room number" required />
              <input value={roomForm.type} onChange={(event) => setRoomForm({ ...roomForm, type: event.target.value })} placeholder="Room type" />
              <input value={roomForm.monthlyRent} onChange={(event) => setRoomForm({ ...roomForm, monthlyRent: event.target.value })} placeholder="Room rent" type="number" />
              <select value={roomForm.status} onChange={(event) => setRoomForm({ ...roomForm, status: event.target.value })}>
                <option>Available</option>
                <option>Occupied</option>
                <option>Maintenance</option>
              </select>
              <button type="submit" className="primary-button">Save Room</button>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={() => setShowExpenseModal(false)}>Close</button>
            </div>
            <form onSubmit={submitExpense} className="form-grid">
              <input value={expenseForm.title} onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })} placeholder="Expense title" required />
              <input value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} placeholder="Category" />
              <input value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} placeholder="Amount" type="number" required />
              <input value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} type="date" />
              <textarea value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} placeholder="Notes" rows="3" />
              <button type="submit" className="primary-button">{editingExpenseId ? 'Update Expense' : 'Save Expense'}</button>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)}>Close</button>
            </div>
            <form onSubmit={submitPayment} className="form-grid">
              <select value={paymentForm.studentId} onChange={(event) => {
                const selected = students.find((student) => student._id === event.target.value);
                setPaymentForm({
                  ...paymentForm,
                  studentId: event.target.value,
                  studentName: selected?.name || '',
                  room: selected?.room || '',
                });
              }}>
                <option value="">Select student</option>
                {(students || []).map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}
              </select>
              <input value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} placeholder="Amount" type="number" required />
              <select value={paymentForm.paymentMode} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMode: event.target.value })}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Card</option>
              </select>
              <input value={paymentForm.receiptNumber} onChange={(event) => setPaymentForm({ ...paymentForm, receiptNumber: event.target.value })} placeholder="Receipt number" />
              <input value={paymentForm.transactionId} onChange={(event) => setPaymentForm({ ...paymentForm, transactionId: event.target.value })} placeholder="Transaction ID" />
              <input value={paymentForm.month} onChange={(event) => setPaymentForm({ ...paymentForm, month: event.target.value })} placeholder="Month" />
              <textarea value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} placeholder="Notes" rows="3" />
              <button type="submit" className="primary-button">Record Payment</button>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>PG Settings</h3>
              <button onClick={() => setShowSettingsModal(false)}>Close</button>
            </div>
            <form onSubmit={saveSettings} className="form-grid">
              <input value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} placeholder="PG name" />
              <input value={settingsForm.ownerName} onChange={(event) => setSettingsForm({ ...settingsForm, ownerName: event.target.value })} placeholder="Owner name" />
              <input value={settingsForm.address} onChange={(event) => setSettingsForm({ ...settingsForm, address: event.target.value })} placeholder="Address" />
              <input value={settingsForm.phone} onChange={(event) => setSettingsForm({ ...settingsForm, phone: event.target.value })} placeholder="Phone" />
              <input value={settingsForm.email} onChange={(event) => setSettingsForm({ ...settingsForm, email: event.target.value })} placeholder="Email" type="email" />
              <input value={settingsForm.defaultMonthlyRent} onChange={(event) => setSettingsForm({ ...settingsForm, defaultMonthlyRent: event.target.value })} placeholder="Default monthly rent" type="number" />
              <input value={settingsForm.defaultDueDate} onChange={(event) => setSettingsForm({ ...settingsForm, defaultDueDate: event.target.value })} placeholder="Default due date" type="number" />
              <input value={settingsForm.currency} onChange={(event) => setSettingsForm({ ...settingsForm, currency: event.target.value })} placeholder="Currency" />
              <input value={settingsForm.paymentMethods} onChange={(event) => setSettingsForm({ ...settingsForm, paymentMethods: event.target.value })} placeholder="Payment methods" />
              <button type="submit" className="primary-button">Save Settings</button>
            </form>
          </div>
        </div>
      )}

      {showInstallmentModal && (
        <div className="modal-backdrop" onClick={() => setShowInstallmentModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Installments</h3>
              <button onClick={() => setShowInstallmentModal(false)}>Close</button>
            </div>
            <form onSubmit={createInstallments} className="form-grid">
              <label>Number of installments</label>
              <input value={installmentForm.numberOfInstallments} onChange={(event) => setInstallmentForm({ ...installmentForm, numberOfInstallments: event.target.value })} type="number" min="2" max="12" required />
              <label>First due date</label>
              <input value={installmentForm.dueDate} onChange={(event) => setInstallmentForm({ ...installmentForm, dueDate: event.target.value })} type="date" required />
              <button type="submit" className="primary-button">Create Installments</button>
            </form>
          </div>
        </div>
      )}

      {showReceiptModal && (
        <div className="modal-backdrop" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Receipt</h3>
              <button onClick={() => setShowReceiptModal(false)}>Close</button>
            </div>
            <form onSubmit={submitReceipt} className="form-grid">
              <label>Receipt Image</label>
              <input type="file" accept="image/*" onChange={handleReceiptImageChange} required />
              {receiptForm.receiptImage && <p style={{ fontSize: '0.9rem', color: '#666' }}>{receiptForm.originalFilename} ({(receiptForm.fileSize / 1024).toFixed(2)} KB)</p>}
              <input value={receiptForm.amount} onChange={(event) => setReceiptForm({ ...receiptForm, amount: event.target.value })} placeholder="Receipt amount" type="number" step="0.01" required />
              <select value={receiptForm.paymentId} onChange={(event) => setReceiptForm({ ...receiptForm, paymentId: event.target.value })}>
                <option value="">Link to Payment (Optional)</option>
                {(payments || []).map((payment) => <option key={payment._id} value={payment._id}>{payment.studentName} - {currency(payment.amount)} ({formatDate(payment.date)})</option>)}
              </select>
              <select value={receiptForm.installmentId} onChange={(event) => setReceiptForm({ ...receiptForm, installmentId: event.target.value })}>
                <option value="">Link to Installment (Optional)</option>
                {(installments || []).filter((inst) => inst.status === 'Pending').map((inst) => <option key={inst._id} value={inst._id}>{inst.studentName} - {currency(inst.amount)} (Due {formatDate(inst.dueDate)})</option>)}
              </select>
              <button type="submit" className="primary-button">Upload Receipt</button>
            </form>
          </div>
        </div>
      )}

      {showReceiptVerifyModal && selectedReceiptForVerify && (
        <div className="modal-backdrop" onClick={() => setShowReceiptVerifyModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Verify Receipt</h3>
              <button onClick={() => setShowReceiptVerifyModal(false)}>Close</button>
            </div>
            <div className="receipt-preview">
              {selectedReceiptForVerify.receiptImage && (
                <img src={selectedReceiptForVerify.receiptImage} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginBottom: '1rem' }} />
              )}
              <p><strong>Student:</strong> {selectedReceiptForVerify.studentName}</p>
              <p><strong>Amount:</strong> {currency(selectedReceiptForVerify.amount)}</p>
              <p><strong>Uploaded:</strong> {formatDate(selectedReceiptForVerify.uploadedAt)}</p>
            </div>
            <form onSubmit={verifyReceipt} className="form-grid">
              <select value={receiptVerificationForm.verificationStatus} onChange={(event) => setReceiptVerificationForm({ ...receiptVerificationForm, verificationStatus: event.target.value })}>
                <option value="Approved">Approve</option>
                <option value="Rejected">Reject</option>
              </select>
              <textarea value={receiptVerificationForm.verificationNotes} onChange={(event) => setReceiptVerificationForm({ ...receiptVerificationForm, verificationNotes: event.target.value })} placeholder={receiptVerificationForm.verificationStatus === 'Approved' ? 'Verification notes...' : 'Reason for rejection'} rows="4" required />
              <button type="submit" className="primary-button">{receiptVerificationForm.verificationStatus === 'Approved' ? 'Approve' : 'Reject'} Receipt</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
