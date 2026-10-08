import emailDB from '@/lib/db/email';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export default async function scheduledHandler(
    controller: ScheduledController,
    env: CloudflareEnv,
): Promise<void> {
    const now = controller.scheduledTime;
    // Trash retention is independent of optional inbox auto-cleaning.
    const purged = await emailDB.purgeExpiredTrash(env, new Date(now - RETENTION_MS).toISOString());
    console.log('Expired trash purged:', purged);

    if (controller.cron !== env.AUTO_DEL_CRON) return;
    if (env.ENABLE_AUTO_DEL?.trim().toLowerCase() !== 'true') return;
    const types = (env.AUTO_DEL_TYPE || '').split(',').map(t => t.trim()).filter(Boolean);
    const seconds = Number(env.AUTO_DEL_TIME || '3600');
    if (types.length === 0 || !Number.isFinite(seconds) || seconds <= 0 ||
        !Number.isFinite(now - seconds * 1000)) {
        console.error('Invalid AUTO_DEL_TYPE or AUTO_DEL_TIME configuration');
        return;
    }
    const trashed = await emailDB.trashExpiredByType(
        env, types, new Date(now - seconds * 1000).toISOString(), new Date(now).toISOString(),
    );
    console.log('Expired inbox emails moved to trash:', trashed);
}
