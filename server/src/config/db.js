import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yahoda_living';

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully to:', mongoUri);
    console.log('Connection state:', mongoose.connection.readyState);
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('Connection error details:', error);
    // Do not return null - let the application fail if MongoDB is not available
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
