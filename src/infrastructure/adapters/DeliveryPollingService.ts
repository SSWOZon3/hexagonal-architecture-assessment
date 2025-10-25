import { SyncTrackingStatusesUseCase } from '../../application/useCases/syncTrackingStatusesUseCase';

export class DeliveryPollingService {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly POLLING_INTERVAL = 60 * 1000; // 1 minute in milliseconds

    constructor(
        private readonly syncTrackingStatusesUseCase: SyncTrackingStatusesUseCase
    ) { }

    start(): void {
        if (this.intervalId) {
            console.log('Polling service is already running');
            return;
        }

        console.log('Starting delivery polling service...');
        this.intervalId = setInterval(() => {
            this.syncTrackingStatusesUseCase.execute().catch((error: any) => {
                console.error('Error during delivery polling:', error);
            });
        }, this.POLLING_INTERVAL);

        // Run immediately on start
        this.syncTrackingStatusesUseCase.execute().catch((error: any) => {
            console.error('Error during initial delivery polling:', error);
        });
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Delivery polling service stopped');
        }
    }
}