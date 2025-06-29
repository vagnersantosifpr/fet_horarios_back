const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'horarios_db' // <--- Adicione esta linha  
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;