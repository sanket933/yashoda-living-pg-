import jwt from 'jsonwebtoken';

export default function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yahoda-living-secret');
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access required.' });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

export function requireStudentAccess(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access required.' });
  }
  
  // Ensure student can only access their own data
  const requestedStudentId = req.params.studentId || req.body.studentId || req.query.studentId;
  if (requestedStudentId && requestedStudentId !== req.user.studentId.toString()) {
    return res.status(403).json({ message: 'Access denied. You can only access your own data.' });
  }
  
  return next();
}
