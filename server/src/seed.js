import bcrypt from 'bcryptjs';
import { AdminUser, PGSettings, Student, User, PortalAccess } from './models/index.js';

export async function seedData() {
  try {
    console.log('Starting seed data...');
    
    // Create admin user
    const adminExists = await AdminUser.countDocuments();
    console.log('Admin exists:', adminExists);
    if (!adminExists) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await AdminUser.create({
        name: 'Super Admin',
        email: 'admin@yahoda.com',
        password: passwordHash,
        role: 'admin',
      });
      console.log('Admin user created');
    }

    // Create settings
    const settings = await PGSettings.findOne();
    if (!settings) {
      var newSettings = await PGSettings.create({
        name: 'YAHODA LIVING',
        ownerName: 'Yahoda Living Admin',
        address: 'Near City Center, Pune',
        phone: '+91 98765 43210',
        email: 'admin@yahoda.com',
        defaultMonthlyRent: 8000,
        defaultDueDate: 5,
        currency: 'INR',
        paymentMethods: ['Cash', 'UPI', 'Bank Transfer'],
      });
      console.log('Settings created:', newSettings._id);
    }

    // Create sanket jadhav student if not exists
    const sanketStudent = await Student.findOne({ email: 'sanket.k.jadhav2005@gmail.com' });
    if (!sanketStudent) {
      console.log('Creating sanket jadhav student...');
      const newStudent = await Student.create({
        name: 'sanket jadhav',
        phone: '9876543210',
        email: 'sanket.k.jadhav2005@gmail.com',
        room: 'A-101',
        bed: '1',
        floor: '1',
        monthlyRent: 8000,
        securityDeposit: 16000,
        joiningDate: new Date(),
        status: 'Active',
        portalStatus: 'Invitation Sent',
        portalEnabled: true,
        portalAccessCode: 'YH-4315',
      });
      console.log('Sanket jadhav student created:', newStudent._id);

      // Create user account for sanket
      const sanketUser = await User.create({
        email: 'sanket.k.jadhav2005@gmail.com',
        passwordHash: bcrypt.hashSync('YH8481', 10),
        role: 'student',
        studentId: newStudent._id,
        accountStatus: 'active',
      });
      console.log('User account created for sanket:', sanketUser._id);

      // Create portal access for sanket
      const sanketPortal = await PortalAccess.create({
        studentId: newStudent._id,
        studentName: 'sanket jadhav',
        email: 'sanket.k.jadhav2005@gmail.com',
        portalEnabled: true,
        status: 'Active',
        accessCode: 'YH-4315',
      });
      console.log('Portal access created for sanket:', sanketPortal._id);
    } else {
      console.log('Sanket jadhav student already exists:', sanketStudent._id);
    }

    // Get all students and ensure they have user accounts
    const students = await Student.find();
    console.log('Found students:', students.length);
    
    for (const student of students) {
      // Check if user exists
      const existingUser = await User.findOne({ email: student.email });
      if (!existingUser && student.email) {
        console.log('Creating user for student:', student.email);
        await User.create({
          email: student.email,
          passwordHash: bcrypt.hashSync('YH1234', 10),
          role: 'student',
          studentId: student._id,
          accountStatus: 'active',
        });
        console.log('User account created for:', student.email);
      }

      // Check if portal access exists
      const existingPortal = await PortalAccess.findOne({ studentId: student._id });
      if (!existingPortal) {
        console.log('Creating portal access for student:', student.name);
        await PortalAccess.create({
          studentId: student._id,
          studentName: student.name,
          email: student.email,
          portalEnabled: true,
          status: 'Active',
          accessCode: `YH-${Math.floor(1000 + Math.random() * 9000)}`,
        });
        console.log('Portal access created for:', student.name);
      }
    }

    console.log('Seed data completed successfully');
  } catch (error) {
    console.error('Seed data error:', error.message);
    console.error('Stack:', error.stack);
    // Don't throw error to allow server to start
  }
}
