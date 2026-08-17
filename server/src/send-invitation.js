import dotenv from 'dotenv';
import { sendStudentInvitation } from './config/email.js';
import bcrypt from 'bcryptjs';
import { User, Student } from './models/index.js';
import { connectDB } from './config/db.js';

dotenv.config();

async function sendInvitation() {
  await connectDB();
  
  const studentEmail = 'sanket.k.jadhav2005@gmail.com';
  const student = await Student.findOne({ email: studentEmail });
  
  if (!student) {
    console.log('Student not found');
    return;
  }
  
  console.log('Found student:', student.name);
  
  // Check if user exists
  let user = await User.findOne({ email: studentEmail });
  let tempPassword;
  
  if (!user) {
    // Create user account
    tempPassword = `YH${Math.floor(1000 + Math.random() * 9000)}`;
    user = await User.create({
      email: studentEmail,
      passwordHash: bcrypt.hashSync(tempPassword, 10),
      role: 'student',
      studentId: student._id,
      accountStatus: 'active',
    });
    console.log('Created user account');
  } else {
    // Generate new password
    tempPassword = `YH${Math.floor(1000 + Math.random() * 9000)}`;
    user.passwordHash = bcrypt.hashSync(tempPassword, 10);
    await user.save();
    console.log('Updated user password');
  }
  
  const accessCode = student.portalAccessCode || `YH-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Send invitation email
  console.log('Sending invitation email...');
  const result = await sendStudentInvitation(studentEmail, student.name, accessCode, tempPassword);
  
  if (result.success) {
    console.log('Email sent successfully!');
  } else {
    console.log('Email sending failed:', result.error);
  }
  
  console.log('Login details:');
  console.log('Email:', studentEmail);
  console.log('Password:', tempPassword);
  console.log('Access Code:', accessCode);
  
  process.exit(0);
}

sendInvitation().catch(console.error);
