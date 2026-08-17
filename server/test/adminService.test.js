import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDashboardSummary } from '../src/services/adminService.js';
import { normalizePaymentPayload } from '../src/utils/paymentValidation.js';

test('buildDashboardSummary calculates key admin totals', () => {
  const summary = buildDashboardSummary({
    students: 30,
    totalMonthlyRent: 185000,
    pendingRent: 55000,
    expenses: 65000,
    payments: 185000,
  });

  assert.equal(summary.totalStudents, 30);
  assert.equal(summary.rentCollected, 185000);
  assert.equal(summary.pendingRent, 55000);
  assert.equal(summary.expenses, 65000);
  assert.ok(summary.actions.includes('View Students'));
});

test('normalizePaymentPayload rejects missing student selection', () => {
  assert.throws(() => normalizePaymentPayload({ studentId: '', amount: 5000 }, []), /valid student/i);
});

test('buildDashboardSummary includes fee plan and portal readiness metrics', () => {
  const summary = buildDashboardSummary({
    students: 18,
    totalMonthlyRent: 140000,
    pendingRent: 26000,
    expenses: 42000,
    payments: 150000,
    feePlans: 5,
    portalReady: 12,
  });

  assert.equal(summary.feePlans, 5);
  assert.equal(summary.portalReady, 12);
  assert.ok(summary.actions.includes('Manage Plans'));
});
