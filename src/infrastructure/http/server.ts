import Fastify from 'fastify';
import fp from 'fastify-plugin';
import deliveriesRoutes from './deliveries/deliveries.routes';
import webhooksRoutes from './webhooks/webhooks.routes';
import { buildContainer, AppContainer } from '../config/container';

export async function createServer() {
    const app = Fastify({ logger: true });

    const container = buildContainer();
    app.decorate('container', container);

    // NOTE: In production, this should be moved to a separate service/cron job
    // or use a task queue like Bull/BullMQ for better scalability
    container.services.deliveryPollingService.start();

    // Graceful shutdown
    app.addHook('onClose', async () => {
        container.services.deliveryPollingService.stop();
    });

    const v1 = fp(async (instance) => {
        await instance.register(deliveriesRoutes, { prefix: '/deliveries' });
        await instance.register(webhooksRoutes, { prefix: '/webhooks' });
    });

    await app.register(v1, { prefix: '/v1' });
    return app;
}

declare module 'fastify' {
    interface FastifyInstance {
        container: AppContainer;
    }
}
