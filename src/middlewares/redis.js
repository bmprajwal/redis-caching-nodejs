const { createClient } = require("redis");
const hash = require("object-hash");
let redisClient = undefined;

const initializeRedisClient = async () => {
	let redisURL = process.env.REDIS_URI;
	if (redisURL) {
		try {
			redisClient = await createClient({ url: redisURL });
		} catch (e) {
			console.error("Failed to create the redis client");
		}

		try {
			await redisClient.connect();
			console.log("Connected to redis successfully");
		} catch (e) {
			console.error("Connection to Redis failed");
		}
	}
};

const requestToKey = (req) => {
	const reqDataToHash = {
		query: req.query,
		body: req.body,
	};

	return `${req.path}@${hash.sha1(reqDataToHash)}`;
};

const isRedisWorking = () => {
	return !!redisClient?.isOpen;
};

const writeData = async (key, data, options) => {
	if (isRedisWorking()) {
		try {
			await redisClient.set(key, data, options);
		} catch (e) {
			console.error(`Failed to cache data for key=${key}`, e);
		}
	}
};

const readData = async (key) => {
	let cachedValue = undefined;

	if (isRedisWorking()) {
		cachedValue = await redisClient.get(key);
		if (cachedValue) {
			return cachedValue;
		}
	}
};

const redisCacheMiddleware = (
	options = {
		EX: 21000,
	}
) => {
	return async (req, res, next) => {
		if (isRedisWorking()) {
			const key = requestToKey(req);
			const cachedValue = await readData(key);
			if (cachedValue) {
				try {
					return res.json(JSON.parse(cachedValue));
				} catch (e) {
					return res.send(cachedValue);
				}
			} else {
				const oldSend = res.send;
				res.send = async function (data) {
					res.send = oldSend;
					if (res.statusCode.toString().startsWith("2")) {
						try {
							await writeData(key, data, options);
							return res.send(data);
						} catch (error) {
							console.log(error);
						}
					}
          
				};
        next();
			}
		} else {
      next()
    }
	};
};

module.exports = { initializeRedisClient, redisCacheMiddleware };
