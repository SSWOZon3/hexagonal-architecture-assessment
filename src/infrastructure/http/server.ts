import Fastify from 'fastify';
import fp from 'fastify-plugin';
import deliveriesRoutes from './deliveries/deliveries.routes';
import webhooksRoutes from './webhooks/webhooks.routes';
import { buildContainer, AppContainer } from '../config/container';

export async function createServer() {
    const app = Fastify({ logger: true });

    // DI: container disponible en fastify
    const container = buildContainer();
    app.decorate('container', container);

    // Start polling scheduler - Hexagonal Architecture: Infrastructure scheduler manages Application service
    // NOTE: In production, this should be moved to a separate service/cron job
    // or use a task queue like Bull/BullMQ for better scalability
    container.schedulers.pollingScheduler.start();

    // Graceful shutdown
    app.addHook('onClose', async () => {
        container.schedulers.pollingScheduler.stop();
    });

    const v1 = fp(async (instance) => {
        await instance.register(deliveriesRoutes, { prefix: '/deliveries' });
        await instance.register(webhooksRoutes, { prefix: '/webhooks' });
    });

    await app.register(v1, { prefix: '/v1' });
    return app;
}

// Para TypeScript (decoración)
declare module 'fastify' {
    interface FastifyInstance {
        container: AppContainer;
    }
}
