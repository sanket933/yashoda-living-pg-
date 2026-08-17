import { useEffect, useState } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export default function StudentPortal() {
  const [token, setToken] = useState(localStorage.getItem('yahoda-student-token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '', otp: '' });
  const [otpMode, setOtpMode] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Receipt form state
  const [receiptForm, setReceiptForm] = useState({ amount: 0, installmentId: '', receiptImage: '' });
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMode: 'Online', installmentId: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (token) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [token]);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await API.get('/student/dashboard', authHeaders);
      setDashboard(response.data);
      setUser(response.data.student);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');

      if (otpMode) {
        const response = await API.post('/student/login', { email: loginForm.email, otp: loginForm.otp });
        localStorage.setItem('yahoda-student-token', response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
      } else {
        const response = await API.post('/student/login', { email: loginForm.email, password: loginForm.password });
        localStorage.setItem('yahoda-student-token', response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  }

  async function requestOtp() {
    try {
      setError('');
      const response = await API.post('/student/request-otp', { email: loginForm.email });
      setGeneratedOtp(response.data.otp); // In production, this would be sent via email/SMS
      setOtpMode(true);
      setToast('OTP generated: ' + response.data.otp);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate OTP');
    }
  }

  function handleLogout() {
    localStorage.removeItem('yahoda-student-token');
    setToken('');
    setUser(null);
    setDashboard(null);
    setLoginForm({ email: '', password: '', otp: '' });
    setOtpMode(false);
  }

  function handleReceiptFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setReceiptForm({ ...receiptForm, receiptImage: base64 });
    };
    reader.readAsDataURL(file);
  }

  async function submitReceipt(event) {
    event.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...receiptForm,
        amount: Number(receiptForm.amount),
      };
      await API.post('/student/receipts', payload, authHeaders);
      setToast('Receipt submitted successfully');
      setShowReceiptModal(false);
      setReceiptForm({ amount: 0, installmentId: '', receiptImage: '' });
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit receipt');
      setLoading(false);
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    try {
      setLoading(true);
      const payload = {
        amount: Number(paymentForm.amount),
        paymentMode: paymentForm.paymentMode,
        installmentId: paymentForm.installmentId,
        transactionId: `TXN-${Date.now()}`,
      };
      await API.post('/student/payments', payload, authHeaders);
      setToast('Payment successful');
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', paymentMode: 'Online', installmentId: '' });
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
      setLoading(false);
    }
  }

  function currency(value) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (loading && !token) {
    return <div className="loader">Loading...</div>;
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fc' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '18px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)', width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, #60a5fa, #2563eb)', display: 'grid', placeItems: 'center', fontSize: '24px', fontWeight: '800', color: 'white', margin: '0 auto 16px' }}>Y</div>
            <h1 style={{ margin: '0', fontSize: '1.5rem', color: '#0f172a' }}>YAHODA LIVING</h1>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Student Portal</p>
          </div>

          {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          {toast && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{toast}</div>}

          <form onSubmit={handleLogin}>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="Email"
              required
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px', fontSize: '16px' }}
            />
            
            {!otpMode ? (
              <>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Password"
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px', fontSize: '16px' }}
                />
                <button
                  type="button"
                  onClick={requestOtp}
                  style={{ width: '100%', padding: '10px', border: 'none', background: '#eef4ff', color: '#1d4ed8', borderRadius: '10px', marginBottom: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Use OTP Instead
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={loginForm.otp}
                  onChange={(e) => setLoginForm({ ...loginForm, otp: e.target.value })}
                  placeholder="Enter OTP"
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px', fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
                />
                <button
                  type="button"
                  onClick={() => setOtpMode(false)}
                  style={{ width: '100%', padding: '10px', border: 'none', background: '#e2e8f0', color: '#0f172a', borderRadius: '10px', marginBottom: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Back to Password
                </button>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', border: 'none', background: '#1d4ed8', color: 'white', borderRadius: '10px', fontWeight: '700', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems = ['Dashboard', 'Fee Plans', 'Installments', 'Payments', 'Receipts', 'Notifications', 'Profile'];

  const renderDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
        <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: '600' }}>Total Package Value</span>
          <strong style={{ fontSize: '2rem', display: 'block' }}>{currency(dashboard?.feePlans?.reduce((sum, fp) => sum + fp.totalAmount, 0) || 0)}</strong>
        </div>
        <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: '600' }}>Total Paid</span>
          <strong style={{ fontSize: '2rem', display: 'block' }}>{currency(dashboard?.feePlans?.reduce((sum, fp) => sum + fp.totalPaid, 0) || 0)}</strong>
        </div>
        <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: '600' }}>Remaining</span>
          <strong style={{ fontSize: '2rem', display: 'block' }}>{currency(dashboard?.feePlans?.reduce((sum, fp) => sum + fp.totalRemaining, 0) || 0)}</strong>
        </div>
        <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
          <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: '600' }}>Pending Installments</span>
          <strong style={{ fontSize: '2rem', display: 'block' }}>{dashboard?.installments?.filter(i => i.status === 'Pending').length || 0}</strong>
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ margin: '0 0 16px' }}>Upcoming Installments</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Installment</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Due Date</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.installments?.filter(i => i.status === 'Pending').slice(0, 5) || []).map((inst) => (
              <tr key={inst._id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{inst.installmentNumber}/{inst.totalInstallments}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(inst.amountDue)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{formatDate(inst.dueDate)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8' }}>
                    {inst.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFeePlans = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ margin: '0 0 16px' }}>Your Fee Plans</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Amount</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Paid</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Remaining</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payment Plan</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.feePlans || []).map((fp) => (
              <tr key={fp._id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(fp.totalAmount)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(fp.totalPaid)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(fp.totalRemaining)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{fp.paymentPlan}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '999px', background: fp.status === 'Active' ? '#dcfce7' : '#fee2e2', color: fp.status === 'Active' ? '#166534' : '#991b1b' }}>
                    {fp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInstallments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ margin: '0 0 16px' }}>All Installments</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Installment</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount Due</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Paid</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Remaining</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Due Date</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.installments || []).map((inst) => (
              <tr key={inst._id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{inst.installmentNumber}/{inst.totalInstallments}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(inst.amountDue)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(inst.amountPaid)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(inst.remainingAmount)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{formatDate(inst.dueDate)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '999px', background: inst.status === 'Paid' ? '#dcfce7' : inst.status === 'Pending' ? '#dbeafe' : '#fee2e2', color: inst.status === 'Paid' ? '#166534' : inst.status === 'Pending' ? '#1d4ed8' : '#991b1b' }}>
                    {inst.status}
                  </span>
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  {inst.status === 'Pending' && (
                    <button
                      onClick={() => {
                        setPaymentForm({ amount: inst.remainingAmount, paymentMode: 'Online', installmentId: inst._id });
                        setShowPaymentModal(true);
                      }}
                      style={{ padding: '6px 12px', border: 'none', background: '#1d4ed8', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                    >
                      Pay Now
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ margin: '0 0 16px' }}>Payment History</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mode</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.payments || []).map((payment) => (
              <tr key={payment._id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(payment.amount)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{payment.paymentMode}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{formatDate(payment.paymentDate)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{payment.receiptNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReceipts = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: '0' }}>Receipt History</h3>
        <button
          onClick={() => setShowReceiptModal(true)}
          style={{ padding: '10px 16px', border: 'none', background: '#1d4ed8', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
        >
          Submit Receipt
        </button>
      </div>
      <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Uploaded</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.receipts || []).map((receipt) => (
              <tr key={receipt._id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{currency(receipt.amount)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{formatDate(receipt.uploadedAt)}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '999px', background: receipt.verificationStatus === 'Approved' ? '#dcfce7' : receipt.verificationStatus === 'Pending' ? '#dbeafe' : '#fee2e2', color: receipt.verificationStatus === 'Approved' ? '#166534' : receipt.verificationStatus === 'Pending' ? '#1d4ed8' : '#991b1b' }}>
                    {receipt.verificationStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showReceiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 30 }}>
          <div style={{ width: 'min(640px, 100%)', background: 'white', borderRadius: '18px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ margin: '0' }}>Submit Receipt</h3>
              <button onClick={() => setShowReceiptModal(false)} style={{ border: 'none', background: '#e2e8f0', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer' }}>Close</button>
            </div>
            <form onSubmit={submitReceipt}>
              <input
                type="number"
                value={receiptForm.amount}
                onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                placeholder="Amount"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px' }}
              />
              <select
                value={receiptForm.installmentId}
                onChange={(e) => setReceiptForm({ ...receiptForm, installmentId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px' }}
              >
                <option value="">Select Installment (Optional)</option>
                {(dashboard?.installments?.filter(i => i.status === 'Pending') || []).map((inst) => (
                  <option key={inst._id} value={inst._id}>Installment {inst.installmentNumber} - {currency(inst.amountDue)}</option>
                ))}
              </select>
              <input
                type="file"
                onChange={handleReceiptFile}
                accept="image/*"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px' }}
              />
              <button type="submit" style={{ width: '100%', padding: '14px', border: 'none', background: '#1d4ed8', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                Submit Receipt
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotifications = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ margin: '0 0 16px' }}>Notifications</h3>
        {(dashboard?.notifications || []).length === 0 ? (
          <p style={{ color: '#64748b', margin: '0' }}>No notifications</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(dashboard?.notifications || []).map((notif) => (
              <div key={notif._id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: notif.read ? '#f8fafc' : '#eff6ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '14px' }}>{notif.title}</strong>
                  <small style={{ color: '#64748b', fontSize: '12px' }}>{formatDate(notif.createdAt)}</small>
                </div>
                <p style={{ margin: '0', fontSize: '14px', color: '#0f172a' }}>{notif.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
        <h3 style={{ margin: '0 0 16px' }}>Profile Information</h3>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '14px' }}>Name</p>
            <strong style={{ fontSize: '16px' }}>{dashboard?.student?.name || '—'}</strong>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '14px' }}>Email</p>
            <strong style={{ fontSize: '16px' }}>{dashboard?.student?.email || '—'}</strong>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '14px' }}>Phone</p>
            <strong style={{ fontSize: '16px' }}>{dashboard?.student?.phone || '—'}</strong>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '14px' }}>Room</p>
            <strong style={{ fontSize: '16px' }}>{dashboard?.student?.room || '—'}</strong>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '14px' }}>Status</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '999px', background: '#dcfce7', color: '#166534' }}>
              {dashboard?.student?.status || 'Active'}
            </span>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '14px' }}>Joining Date</p>
            <strong style={{ fontSize: '16px' }}>{formatDate(dashboard?.student?.joiningDate)}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  const contentMap = {
    Dashboard: renderDashboard,
    'Fee Plans': renderFeePlans,
    Installments: renderInstallments,
    Payments: renderPayments,
    Receipts: renderReceipts,
    Notifications: renderNotifications,
    Profile: renderProfile,
  };

  const Content = contentMap[activeTab] || renderDashboard;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '290px', background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)', color: 'white', padding: '28px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #60a5fa, #2563eb)', fontWeight: '800' }}>Y</div>
          <div>
            <h1 style={{ margin: '0', fontSize: '1.1rem' }}>YAHODA LIVING</h1>
            <small style={{ color: 'rgba(255,255,255,0.72)' }}>Student Portal</small>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              style={{
                border: 'none',
                background: activeTab === item ? 'rgba(96, 165, 250, 0.22)' : 'transparent',
                width: '100%',
                textAlign: 'left',
                color: activeTab === item ? 'white' : 'rgba(255,255,255,0.82)',
                padding: '12px 14px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            marginTop: '32px',
            border: 'none',
            background: 'rgba(239, 68, 68, 0.2)',
            width: '100%',
            textAlign: 'left',
            color: '#fca5a5',
            padding: '12px 14px',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: '24px', background: '#f7f8fc' }}>
        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px' }}>{error}</div>}
        {toast && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px' }}>{toast}</div>}
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <p style={{ margin: '0', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '11px', color: '#64748b' }}>Welcome back</p>
            <h2 style={{ margin: '4px 0 0' }}>{user?.name || 'Student'}</h2>
          </div>
        </div>

        {loading ? <div className="loader">Loading...</div> : <Content />}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '18px', width: '100%', maxWidth: '400px', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.2)' }}>
            <h3 style={{ margin: '0 0 20px' }}>Make Payment</h3>
            <form onSubmit={submitPayment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Amount (₹)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                  min="1"
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Payment Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                >
                  <option value="Online">Online Payment</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#374151', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, padding: '12px', border: 'none', background: '#1d4ed8', color: 'white', borderRadius: '8px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
