import mongoose from "mongoose"

// Reads server/.env if it exists. That's where your MongoDB connection string goes.
try {
  process.loadEnvFile()
} catch {
  // No .env file, so we use the local default below.
}

// MongoDB Atlas (in the cloud) gives you a string like
//   mongodb+srv://user:password@cluster0.abcde.mongodb.net
// MongoDB installed on your own laptop is at mongodb://127.0.0.1:27017
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017"

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(uri, { dbName: "alarm-app", serverSelectionTimeoutMS: 8000 })
  console.log("Connected to MongoDB")
}
