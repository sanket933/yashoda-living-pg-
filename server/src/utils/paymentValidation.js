export function normalizePaymentPayload(payload = {}, studentLookup = []) {
  const studentId = String(payload.studentId || '').trim();
  const student = studentLookup.find((item) => item._id === studentId) || null;

  if (!studentId || !student) {
    const error = new Error('A valid student is required to record a payment.');
    error.statusCode = 400;
    throw error;
  }

  return {
    ...payload,
    studentId,
    studentName: payload.studentName || student.name || 'Student',
    room: payload.room || student.room || '—',
    amount: Number(payload.amount || 0),
    paymentMode: payload.paymentMode || 'Cash',
    receiptNumber: payload.receiptNumber || `RCPT-${Date.now()}`,
    transactionId: payload.transactionId || '',
    notes: payload.notes || '',
    month: payload.month || new Date().toISOString().slice(0, 7),
  };
}
