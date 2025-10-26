import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { fastify, FastifyInstance } from 'fastify';
import { buildTestContainer } from './testContainer';
import { AppContainer } from '../../src/infrastructure/config/container';

declare module 'fastify' {
    interface FastifyInstance {
        container: AppContainer;
    }
}

let mongod: MongoMemoryServer;
let app: FastifyInstance;

export async function setupTestServer(): Promise<FastifyInstance> {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    await mongoose.connect(mongoUri);

    app = fastify({
        logger: false
    });

    const container = buildTestContainer();
    app.decorate('container', container);

    await app.register(import('../../src/infrastructure/http/deliveries/deliveries.routes'), {
        prefix: '/deliveries'
    });

    await app.register(import('../../src/infrastructure/http/webhooks/webhooks.routes'), {
        prefix: '/webhooks'
    });

    return app;
}

export async function teardownTestServer(): Promise<void> {
    if (app) {
        await app.close();
    }

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }

    if (mongod) {
        await mongod.stop();
    }
}

export async function cleanupTestData(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
}