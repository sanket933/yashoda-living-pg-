export function buildDashboardSummary({
  students = 0,
  totalMonthlyRent = 0,
  pendingRent = 0,
  expenses = 0,
  payments = 0,
  feePlans = 0,
  portalReady = 0,
}) {
  return {
    totalStudents: students,
    totalMonthlyRent,
    pendingRent,
    expenses,
    rentCollected: payments,
    feePlans,
    portalReady,
    actions: [
      'View Students',
      'View Pending',
      'View Payments',
      'View Expenses',
      'Add Student',
      'Add Room',
      'Record Payment',
      'Add Expense',
      'Generate Monthly Rent',
      'Manage Plans',
      'Portal Access',
    ],
  };
}
