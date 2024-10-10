// redisClient.js
const redis = require("redis");
require("dotenv").config(); // Ensure environment variables are loaded

// Initialize Redis client with URL from environment or default to localhost
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Handle connection errors
redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis");
  } catch (error) {
    console.error("Error connecting to Redis:", error);
  }
})();

module.exports = redisClient; // Export the connected client
