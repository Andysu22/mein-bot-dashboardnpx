import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Bitte MONGODB_URI in der .env.local definieren');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      // NEU: Verhindert, dass Requests ewig warten, wenn DB offline ist.
      // Stattdessen gibt es sofort einen Fehler, was für Webseiten besser ist.
      bufferCommands: false,
      // NEU: Begrenzt die Verbindungen (gut für Serverless/Vercel Deployments)
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("❌ MongoDB Connection Error:", e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;