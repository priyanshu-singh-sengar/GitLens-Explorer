const mongoose = require("mongoose");

async function connectDB() {

  // Skip DB in tests
  if (process.env.NODE_ENV === "test") {
    console.log("🧪 Skipping DB connection in test mode");
    return;
  }

  try {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

  } catch (error) {

    console.error("MongoDB connection failed:", error.message);
    process.exit(1);

  }
}

module.exports = connectDB;