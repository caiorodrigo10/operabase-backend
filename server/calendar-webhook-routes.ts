import { Response } from 'express';
import { CalendarSyncManager } from './calendar-sync-manager';
import { IStorage } from './storage';

export function setupCalendarWebhookRoutes(app: any, storage: IStorage) {
  const syncManager = new CalendarSyncManager(storage);

  // Google Calendar webhook endpoint
  app.post('/api/calendar/webhook', async (req: any, res: Response) => {
    try {
      const channelId = req.headers['x-goog-channel-id'];
      const resourceId = req.headers['x-goog-resource-id'];
      const resourceState = req.headers['x-goog-resource-state'];
      const messageNumber = req.headers['x-goog-message-number'];

      console.log('📡 Webhook received:', {
        channelId,
        resourceId,
        resourceState,
        messageNumber,
        headers: req.headers
      });

      if (!channelId || !resourceId) {
        console.log('❌ Missing required webhook headers');
        return res.status(400).json({ error: 'Missing required headers' });
      }

      // Handle different webhook states
      if (resourceState === 'sync') {
        console.log('🔄 Initial sync notification, ignoring');
        return res.status(200).json({ message: 'Sync notification acknowledged' });
      }

      if (resourceState === 'exists') {
        console.log('🔔 Calendar change notification received');
        await syncManager.onWebhookNotification(channelId, resourceId);
      }

      res.status(200).json({ message: 'Webhook processed successfully' });

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Manual sync trigger endpoint
  app.post('/api/calendar/sync/manual', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      console.log('🔄 Manual sync triggered for user:', userId);
      const success = await syncManager.triggerSync(userId, 'manual', true);

      res.json({ 
        success, 
        message: success ? 'Sync completed successfully' : 'Sync failed or already in progress' 
      });

    } catch (error) {
      console.error('❌ Error in manual sync:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Setup webhook for integration
  app.post('/api/calendar/integrations/:id/webhook', async (req: any, res: Response) => {
    try {
      const integrationId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.user_id !== userId) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      console.log('📡 Setting up webhook for integration:', integrationId);
      const success = await syncManager.setupWebhookForIntegration(integration);

      res.json({ 
        success, 
        message: success ? 'Webhook setup successfully' : 'Failed to setup webhook' 
      });

    } catch (error) {
      console.error('❌ Error setting up webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get sync status
  app.get('/api/calendar/sync/status', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const integrations = await storage.getCalendarIntegrations(userId);
      const activeIntegrations = integrations.filter(i => i.provider === 'google' && i.is_active);

      const status = activeIntegrations.map(integration => ({
        id: integration.id,
        email: integration.email,
        lastSync: integration.last_sync_at,
        lastTrigger: integration.last_sync_trigger,
        syncInProgress: integration.sync_in_progress,
        webhookActive: !!(integration.watch_channel_id && integration.watch_resource_id),
        webhookExpires: integration.watch_expires_at,
        errors: integration.sync_errors
      }));

      res.json({ integrations: status });

    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return syncManager;
}