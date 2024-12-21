const Redis = require("ioredis");
require("dotenv").config();

// Create a Redis client instance using Render's recommended setup
const redisClient = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

// Handle connection events
redisClient.on("connect", () => {
  console.log("Connected to Redis! 🚀");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

(async () => {
  try {
    // Example operations
    await redisClient.set("testKey", "testValue");
    console.log("Key set successfully");

    const value = await redisClient.get("testKey");
    console.log("Retrieved value:", value);

    // Clean up example data
    await redisClient.del("testKey");
  } catch (error) {
    console.error("Error interacting with Redis:", error);
  }
})();

// Export the Redis client for use in other parts of your app
module.exports = redisClient;
