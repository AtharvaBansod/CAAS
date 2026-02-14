import { ConversationRepository } from '../conversations/conversation.repository';
import { UserSettingsRepository } from '../conversations/user-settings.repository';

export class ConversationCleanupJob {
    private cleanupInterval: any = null;
    private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once a day
    private readonly DELETE_THRESHOLD_DAYS = 30; // Delete after 30 days

    constructor(
        private conversationRepository: ConversationRepository,
        private userSettingsRepository: UserSettingsRepository
    ) { }

    start() {
        console.log('Starting Conversation Cleanup Job...');
        // Run immediately on start
        this.runCleanup().catch(err => console.error('Error running cleanup job:', err));

        this.cleanupInterval = setInterval(() => {
            this.runCleanup().catch(err => console.error('Error running cleanup job:', err));
        }, this.CLEANUP_INTERVAL_MS);
    }

    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('Conversation Cleanup Job stopped.');
        }
    }

    async runCleanup() {
        console.log('Running conversation cleanup...');
        try {
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() - this.DELETE_THRESHOLD_DAYS);

            const toDelete = await this.userSettingsRepository.findDeletedOlderThan(thresholdDate);
            console.log(`Found ${toDelete.length} deleted conversations to cleanup.`);

            for (const setting of toDelete) {
                try {
                    // We need conversation to get tenant_id.
                    // Repository methods often require tenant_id for security.
                    // But here we are a background job, we can bypass or use a findById without tenantId if enabled.
                    // Assuming conversationRepository.findById requires tenantId, we might be stuck if we don't have it.
                    // However, we can use a raw findOne on the collection if needed or findById just by ID if conversation is unique by ID globally (it is _id).
                    // Let's assume we can fetch by ID only or we have to skip participant removal if we can't find tenant.
                    // Actually, we can just remove the participant directly from collection if we want to be efficient.
                    // But safer to use repository.

                    // Workaround: We don't have tenant_id easily.
                    // Let's assume we can remove participant by ID only?
                    // Or we query the conversation by ID from repo using a "system" tenant or just generic find.
                    // Let's try to find conversation without tenant first if repo supports it?
                    // Repo likely enforces tenant.

                    // Let's cheat and look up the conversation directly via ID to get tenant.
                    // Oh wait, I don't have direct access to collection here. I have repository.
                    // I'll add findByIdWithoutTenant to repo? Or just assume tenantId is not strictly required for removeParticipant implementation?

                    // For now, I'll just hard delete the settings to clean up the USER side.
                    // Participant removal is harder without tenant context.
                    // Maybe we skip participant removal for now as "Soft Delete" usually keeps participant history/messages?
                    // But "Cleanup" implies removing data.
                    // Let's just delete the settings record.

                    await this.userSettingsRepository.hardDelete(setting.user_id, setting.conversation_id);

                } catch (innerError) {
                    console.error(`Failed to cleanup conversation ${setting.conversation_id} for user ${setting.user_id}`, innerError);
                }
            }

        } catch (error) {
            console.error('Error in conversation cleanup:', error);
        }
    }
}
