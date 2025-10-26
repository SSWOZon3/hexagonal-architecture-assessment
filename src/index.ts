import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import deliveriesRoutes from './infrastructure/http/deliveries/deliveries.routes';
import webhooksRoutes from './infrastructure/http/webhooks/webhooks.routes';
import initMongoose, { closeMongoose } from './infrastructure/db/mongo/mongoose';
import { buildContainer, AppContainer } from './infrastructure/config/container';

declare module 'fastify' {
    interface FastifyInstance {
        container: AppContainer;
    }
}

const fastify = Fastify({
    logger: {
        level: 'info'
    }
});

async function buildApp() {
    await fastify.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    });

    await fastify.register(swagger, {
        swagger: {
            info: {
                title: 'Technical Assessment Dogfy API',
                description: 'Logistics Microservice API with Hexagonal Architecture and DDD',
                version: '1.0.0'
            },
            host: 'localhost:3003',
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json'],
            tags: [
                { name: 'Health', description: 'Health check endpoints' },
                { name: 'Deliveries', description: 'Delivery management endpoints' }
            ]
        }
    });

    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false
        },
        uiHooks: {
            onRequest: function (request, reply, next) {
                next();
            },
            preHandler: function (request, reply, next) {
                next();
            }
        },
        staticCSP: true,
        transformStaticCSP: (header) => header
    });

    // Initialize database connection
    await initMongoose();

    // Build dependency injection container
    const container = buildContainer();
    fastify.decorate('container', container);

    container.services.deliveryPollingService.start();

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
        container.services.deliveryPollingService.stop();
    });


    await fastify.register(deliveriesRoutes, { prefix: '/deliveries' });
    await fastify.register(webhooksRoutes, { prefix: '/webhooks' });


    return fastify;
}

async function start() {
    try {
        const app = await buildApp();

        const address = await app.listen({
            port: 3003,
            host: '0.0.0.0'
        });

        console.log(`🚀 Server ready at ${address}`);
        console.log(`📚 Swagger documentation available at ${address}/docs`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT. Graceful shutdown...');
    try {
        await fastify.close();
        await closeMongoose();
        console.log('✅ Server closed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
});

if (require.main === module) {
    start();
}

export { buildApp, start };