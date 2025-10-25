import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/dogfy";
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 500;

mongoose.set("strictQuery", false);

let connected = false;
let currentRetries = 0;

export async function initMongoose(uri?: string): Promise<mongoose.Connection> {
    // TODO: Add this to env variables
    const mongoUri = uri || process.env.MONGO_URI || DEFAULT_URI;
    if (connected) return mongoose.connection;

    const opts: mongoose.ConnectOptions = {
        connectTimeoutMS: 10000,
    };

    const tryConnect = async (): Promise<mongoose.Connection> => {
        try {
            await mongoose.connect(mongoUri, opts);
            connected = true;
            currentRetries = 0;
            bindConnectionEvents();
            return mongoose.connection;
        } catch (err) {
            currentRetries += 1;
            if (currentRetries > MAX_RETRIES) throw err;
            await new Promise((res) => setTimeout(res, RETRY_BASE_MS));
            return tryConnect();
        }
    };

    return tryConnect();
}

function bindConnectionEvents() {
    const c = mongoose.connection;
    c.on("connected", () => {
        console.info("MongoDB connected");
    });
    c.on("reconnected", () => console.info("MongoDB reconnected"));
    c.on("disconnected", () => {
        connected = false;
        console.warn("MongoDB disconnected");
    });
    c.on("error", (err) => console.error("MongoDB error", err));
}

export async function closeMongoose(): Promise<void> {
    if (!connected) return;
    await mongoose.connection.close(false);
    connected = false;
}

export default initMongoose;