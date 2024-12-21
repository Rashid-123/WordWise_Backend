const Redis = require("ioredis");
require("dotenv").config();

// Create a Redis client instance using Render's recommended setup
const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => {
  console.log("Connected to Redis! 🚀");
  console.log(typeof redisClient.set); // Should print 'function'
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});
// Export the Redis client for use in other parts of your app
module.exports = redisClient;
