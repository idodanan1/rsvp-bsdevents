/**
 * Script to create the user "בס"ד אירועים"
 * Run with: node create-user.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rsvp-system';

// User Schema (same as in server.js)
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, trim: true },
  phoneVerified: { type: Boolean, default: false },
  credits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

async function createUser() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: 'בס"ד אירועים' },
        { name: 'בס"ד אירועים' }
      ]
    });

    if (existingUser) {
      console.log('⚠️  User already exists:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Credits: ${existingUser.credits}`);
      console.log('\n❓ Do you want to update this user? (This script will not update, please use the admin panel)');
      await mongoose.disconnect();
      return;
    }

    // Create new user
    // Note: We need an email for the user. Let's use a meaningful email
    const userEmail = 'basadevents@basadevents.com';
    const userPassword = 'BasadEvents2024!'; // You can change this password
    
    // Check if email already exists
    const emailExists = await User.findOne({ email: userEmail });
    if (emailExists) {
      console.log('⚠️  Email already exists, trying with timestamp...');
      const userEmailWithTimestamp = `basadevents_${Date.now()}@basadevents.com`;
      const newUser = new User({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: userEmailWithTimestamp,
        name: 'בס"ד אירועים',
        password: userPassword,
        phoneNumber: '0500000000', // Placeholder - user should update this
        phoneVerified: false,
        credits: 100, // Starting credits
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: false
      });
      
      await newUser.save();
      
      console.log('\n✅ User created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Password: ${userPassword}`);
      console.log(`   Credits: ${newUser.credits}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n⚠️  IMPORTANT: Save these credentials!');
      console.log(`   The user can login with email: ${newUser.email}`);
      console.log(`   Password: ${userPassword}`);
      console.log('\n💡 You can change the password later through the admin panel.');
      
      await mongoose.disconnect();
      console.log('\n✅ Disconnected from MongoDB');
      return;
    }
    
    const newUser = new User({
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: userEmail,
      name: 'בס"ד אירועים',
      password: userPassword,
      phoneNumber: '0500000000', // Placeholder - user should update this
      phoneVerified: false,
      credits: 100, // Starting credits
      createdAt: new Date(),
      updatedAt: new Date(),
      isAdmin: false
    });

    await newUser.save();
    
    console.log('\n✅ User created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Password: ${userPassword}`);
    console.log(`   Credits: ${newUser.credits}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Save these credentials!');
    console.log(`   The user can login with email: ${userEmail}`);
    console.log(`   Password: ${userPassword}`);
    console.log('\n💡 You can change the password later through the admin panel.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   User with this email or name already exists');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
createUser();

