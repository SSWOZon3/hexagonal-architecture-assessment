import { FastifyReply, FastifyRequest } from 'fastify';
import {
    ProcessWebhookDeliveryStatusUseCase,
    DeliveryNotFoundError,
    InvalidDeliveryStatusError,
    NoStatusChangeError,
    InvalidSignatureError
} from '../../../application/useCases/processWebhookDeliveryStatus.useCase';

export interface WebhookDeliveryStatusInput {
    trackingNumber: string;
    status: string;
    timestamp: string;
    signature?: string;
}

export class WebhooksController {
    constructor(
        private readonly processWebhookDeliveryStatusUseCase: ProcessWebhookDeliveryStatusUseCase
    ) {
        this.handleDeliveryStatus = this.handleDeliveryStatus.bind(this);
    }

    async handleDeliveryStatus(req: FastifyRequest, reply: FastifyReply) {
        try {
            const input = req.body as WebhookDeliveryStatusInput;

            if (!input.trackingNumber || !input.status) {
                return reply.code(400).send({
                    error: 'BAD_REQUEST',
                    message: 'Missing required fields: trackingNumber, status'
                });
            }

            const result = await this.processWebhookDeliveryStatusUseCase.execute({
                trackingNumber: input.trackingNumber,
                status: input.status,
                timestamp: input.timestamp,
                signature: input.signature
            });

            return reply.code(200).send({
                success: true,
                message: 'Webhook processed successfully',
                deliveryId: result.deliveryId,
                orderId: result.orderId,
                trackingNumber: result.trackingNumber,
                provider: result.provider,
                previousStatus: result.previousStatus,
                updatedStatus: result.newStatus
            });

        } catch (err: any) {
            console.error('Error processing webhook:', err);

            // TODO: Add this to a centralized error handling middleware
            // Map domain/application errors to HTTP responses
            if (err instanceof DeliveryNotFoundError) {
                return reply.code(404).send({
                    error: 'DELIVERY_NOT_FOUND',
                    message: err.message
                });
            }

            if (err instanceof InvalidDeliveryStatusError) {
                return reply.code(400).send({
                    error: 'INVALID_STATUS',
                    message: err.message
                });
            }

            if (err instanceof NoStatusChangeError) {
                return reply.code(200).send({
                    success: true,
                    message: err.message,
                    noChange: true
                });
            }

            if (err instanceof InvalidSignatureError) {
                return reply.code(401).send({
                    error: 'INVALID_SIGNATURE',
                    message: err.message
                });
            }

            // Generic error for unexpected issues
            return reply.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred'
            });
        }
    }
}