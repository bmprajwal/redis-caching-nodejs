const express = require("express")
require("dotenv").config()

const {UserController} = require("./src/controllers/user");
const { initializeRedisClient, redisCacheMiddleware } = require("./src/middlewares/redis");



const initializeExpressServer = async () => {
  const app = express();
  app.use(express.json());

  await initializeRedisClient()
  app.get("/api/v1/users", redisCacheMiddleware() ,UserController.getAll);

  const port = 3000;
  app.listen(port, () => {
		console.log(`Server listening on http://localhost:${port}`);
  });
}

try {
  initializeExpressServer()
} catch (e) {
  console.error(e);
  
}