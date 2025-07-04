import { Router } from 'express';
import { z } from 'zod';
import { getStorage } from './storage';
import { evolutionApi } from './whatsapp-evolution-service';
import { insertWhatsAppNumberSchema } from '@shared/schema';
import { systemLogsService } from './services/system-logs.service';
import { isAuthenticated } from './auth';

const router = Router();

// Get all WhatsApp numbers for current clinic (tenant-aware)
router.get('/api/whatsapp/numbers', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // For now, assume clinic ID 1 (could be enhanced with user.clinic_id)
    const clinicId = 1;
    
    const storage = await getStorage();
    const allNumbers = await storage.getWhatsAppNumbers(clinicId);
    
    // Return all numbers except those still connecting (to avoid showing incomplete instances)
    const activeNumbers = allNumbers.filter(number => 
      number.status === 'open' || number.status === 'disconnected'
    );
    
    console.log(`📱 WhatsApp numbers for clinic ${clinicId}: ${allNumbers.length} total, ${activeNumbers.filter(n => n.status === 'open').length} connected, ${activeNumbers.filter(n => n.status === 'disconnected').length} disconnected`);
    res.json(activeNumbers);
  } catch (error) {
    console.error('Error fetching WhatsApp numbers:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp numbers' });
  }
});

// Get all WhatsApp numbers for a clinic
router.get('/api/whatsapp/numbers/:clinicId', async (req, res) => {
  try {
    const clinicId = parseInt(req.params.clinicId);
    if (isNaN(clinicId)) {
      return res.status(400).json({ error: 'Invalid clinic ID' });
    }

    const storage = await getStorage();
    const allNumbers = await storage.getWhatsAppNumbers(clinicId);
    
    // Return all numbers except those still connecting (to avoid showing incomplete instances)
    const activeNumbers = allNumbers.filter(number => 
      number.status === 'open' || number.status === 'disconnected'
    );
    
    console.log(`📱 WhatsApp numbers for clinic ${clinicId}: ${allNumbers.length} total, ${activeNumbers.filter(n => n.status === 'open').length} connected, ${activeNumbers.filter(n => n.status === 'disconnected').length} disconnected`);
    res.json(activeNumbers);
  } catch (error) {
    console.error('Error fetching WhatsApp numbers:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp numbers' });
  }
});

// Start WhatsApp connection process
router.post('/api/whatsapp/connect', async (req, res) => {
  try {
    const { clinicId, userId } = req.body;
    
    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID and User ID are required' });
    }

    // Convert userId to integer if it's a string (for compatibility)
    const parsedUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }

    // Start the connection process with Evolution API
    const result = await evolutionApi.startConnection(clinicId, parsedUserId);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Create a temporary record in database with connecting status
    const storage = await getStorage();
    const whatsappNumber = await storage.createWhatsAppNumber({
      clinic_id: clinicId,
      user_id: parsedUserId,
      phone_number: '', // Will be updated when connection is confirmed
      instance_name: result.instanceName!,
      status: 'connecting'
    });

    // Log WhatsApp number creation
    await systemLogsService.logWhatsAppAction(
      'created',
      whatsappNumber.id,
      clinicId,
      parsedUserId?.toString(),
      'professional',
      null,
      whatsappNumber,
      {
        source: 'web',
        instance_name: result.instanceName,
        professional_id: parsedUserId
      }
    );

    res.json({
      id: whatsappNumber.id,
      instanceName: result.instanceName,
      qrCode: result.qrCode,
      status: 'connecting'
    });
  } catch (error) {
    console.error('Error starting WhatsApp connection:', error);
    res.status(500).json({ error: 'Failed to start WhatsApp connection' });
  }
});

// Get QR code for instance connection
router.get('/api/whatsapp/qr/:instanceName', async (req, res) => {
  try {
    const instanceName = req.params.instanceName;
    
    // Get QR code from Evolution API
    const qrResult = await evolutionApi.getQRCode(instanceName);
    
    if (!qrResult.success) {
      return res.status(404).json({ error: qrResult.error });
    }

    // Update database status to connecting
    const storage = await getStorage();
    const whatsappNumber = await storage.getWhatsAppNumberByInstance(instanceName);
    if (whatsappNumber) {
      await storage.updateWhatsAppNumberStatus(whatsappNumber.id, 'connecting');
    }

    // Extract QR code from different possible response structures
    const qrCode = qrResult.data?.base64 || qrResult.data?.qrCode || qrResult.data;
    res.json({ qrCode });
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

// Check connection status
router.get('/api/whatsapp/status/:instanceName', async (req, res) => {
  try {
    const instanceName = req.params.instanceName;
    
    // Check status with Evolution API
    const statusResult = await evolutionApi.checkConnection(instanceName);
    
    if (!statusResult.success) {
      return res.status(404).json({ error: statusResult.error });
    }

    // Update database if connected
    const storage = await getStorage();
    const whatsappNumber = await storage.getWhatsAppNumberByInstance(instanceName);
    if (whatsappNumber && statusResult.connected && statusResult.phoneNumber) {
      await storage.updateWhatsAppNumber(whatsappNumber.id, {
        phone_number: statusResult.phoneNumber,
        status: 'connected',
        connected_at: new Date()
      });
    }

    res.json({
      connected: statusResult.connected,
      phoneNumber: statusResult.phoneNumber,
      status: statusResult.connected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Old webhook endpoint removed - now handled by whatsapp-webhook-routes.ts

// Reconnect existing WhatsApp instance
router.post('/api/whatsapp/reconnect', async (req, res) => {
  try {
    const { instanceName } = req.body;
    
    console.log('🔄 Reconnecting WhatsApp instance:', instanceName);
    
    if (!instanceName) {
      console.log('❌ Instance name is required for reconnection');
      return res.status(400).json({ error: 'Instance name is required' });
    }

    // Validate instance exists in database and is disconnected
    const storage = await getStorage();
    const whatsappNumber = await storage.getWhatsAppNumberByInstance(instanceName);
    
    if (!whatsappNumber) {
      console.log('❌ Instance not found in database:', instanceName);
      return res.status(404).json({ error: 'Instance not found' });
    }

    if (whatsappNumber.status === 'open') {
      console.log('⚠️ Instance already connected:', instanceName);
      return res.status(400).json({ error: 'Instance is already connected' });
    }

    console.log('✅ Found disconnected instance:', {
      id: whatsappNumber.id,
      instanceName: whatsappNumber.instance_name,
      status: whatsappNumber.status,
      phoneNumber: whatsappNumber.phone_number,
      clinicId: whatsappNumber.clinic_id
    });

    // Update status to connecting before generating QR
    await storage.updateWhatsAppNumberStatus(whatsappNumber.id, 'connecting');

    // Call Evolution API to reconnect and generate new QR code
    // If instance doesn't exist, create it first
    let qrResult = await evolutionApi.getQRCode(instanceName);
    
    const errorMessage = qrResult.error || '';
    const isInstanceNotFound = errorMessage.includes('does not exist') || errorMessage.includes('Not Found');
    
    if (!qrResult.success && isInstanceNotFound) {
      console.log('🔧 Instance does not exist, creating new instance for reconnection...');
      console.log('🔍 Original error:', qrResult.error);
      
      // Create new instance in Evolution API
      const createResult = await evolutionApi.createInstance(instanceName);
      if (!createResult.success) {
        console.log('❌ Failed to create instance for reconnection:', createResult.error);
        await storage.updateWhatsAppNumberStatus(whatsappNumber.id, 'disconnected');
        return res.status(500).json({ error: createResult.error });
      }
      
      // Now try to get QR code again
      qrResult = await evolutionApi.getQRCode(instanceName);
    }
    
    if (!qrResult.success) {
      console.log('❌ Evolution API failed to generate QR for reconnection:', qrResult.error);
      // Revert status back to disconnected on failure
      await storage.updateWhatsAppNumberStatus(whatsappNumber.id, 'disconnected');
      return res.status(500).json({ error: qrResult.error });
    }

    console.log('✅ Reconnection QR code generated successfully for instance:', instanceName);

    // Log the reconnection attempt
    await systemLogsService.logWhatsAppAction(
      'reconnection_initiated',
      whatsappNumber.id,
      whatsappNumber.clinic_id,
      whatsappNumber.user_id,
      'system',
      null,
      {
        instance_name: instanceName,
        previous_phone: whatsappNumber.phone_number,
        status: 'connecting'
      },
      {
        source: 'whatsapp',
        action: 'reconnect',
        instance_name: instanceName
      }
    );

    res.json({ 
      qrCode: qrResult.data?.base64 || qrResult.data?.qrCode || qrResult.data,
      instanceName: instanceName,
      numberId: whatsappNumber.id,
      reconnection: true,
      previousPhone: whatsappNumber.phone_number,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error reconnecting WhatsApp instance:', error);
    res.status(500).json({ error: 'Failed to reconnect WhatsApp instance' });
  }
});

// Regenerate QR code for existing instance
router.post('/api/whatsapp/regenerate-qr', async (req, res) => {
  try {
    const { instanceName } = req.body;
    
    console.log('🔄 Regenerating QR code for instance:', instanceName);
    
    if (!instanceName) {
      console.log('❌ Instance name is required for QR regeneration');
      return res.status(400).json({ error: 'Instance name is required' });
    }

    // Validate instance exists in database
    const storage = await getStorage();
    const whatsappNumber = await storage.getWhatsAppNumberByInstance(instanceName);
    
    if (!whatsappNumber) {
      console.log('❌ Instance not found in database:', instanceName);
      return res.status(404).json({ error: 'Instance not found' });
    }

    console.log('✅ Found instance in database:', {
      id: whatsappNumber.id,
      instanceName: whatsappNumber.instance_name,
      status: whatsappNumber.status,
      clinicId: whatsappNumber.clinic_id
    });

    // Call Evolution API to generate new QR code
    const qrResult = await evolutionApi.getQRCode(instanceName);
    
    if (!qrResult.success) {
      console.log('❌ Evolution API failed to generate QR:', qrResult.error);
      return res.status(500).json({ error: qrResult.error });
    }

    console.log('✅ New QR code generated successfully for instance:', instanceName);

    // Update database status to connecting (in case it was in error state)
    await storage.updateWhatsAppNumberStatus(whatsappNumber.id, 'connecting');

    res.json({ 
      qrCode: qrResult.data?.base64 || qrResult.data?.qrCode || qrResult.data,
      instanceName: instanceName,
      regenerated: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error regenerating QR code:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

// Disconnect WhatsApp number
router.post('/api/whatsapp/disconnect/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid WhatsApp number ID' });
    }

    const storage = await getStorage();
    const whatsappNumber = await storage.getWhatsAppNumber(id);
    
    if (!whatsappNumber) {
      return res.status(404).json({ error: 'WhatsApp number not found' });
    }

    // Disconnect from Evolution API
    const disconnectResult = await evolutionApi.disconnectInstance(whatsappNumber.instance_name);
    
    if (!disconnectResult.success) {
      return res.status(500).json({ error: disconnectResult.error });
    }

    // Update status in database
    await storage.updateWhatsAppNumberStatus(id, 'disconnected');

    res.json({ success: true, message: 'WhatsApp disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
  }
});

// Get clinic professionals for WhatsApp assignment
router.get('/api/clinic/:clinicId/professionals', async (req, res) => {
  try {
    const clinicId = parseInt(req.params.clinicId);
    if (isNaN(clinicId)) {
      return res.status(400).json({ error: 'Invalid clinic ID' });
    }

    const storage = await getStorage();
    
    // Get professionals by accessing the base storage directly
    let baseStorage = storage;
    if ((storage as any).baseStorage) {
      baseStorage = (storage as any).baseStorage;
    }
    if ((baseStorage as any).storage) {
      baseStorage = (baseStorage as any).storage;
    }
    
    const professionals = await baseStorage.getClinicUsers(clinicId);
    
    // Filter and format for professionals only
    const formattedProfessionals = professionals
      .filter((user: any) => user.is_professional === true)
      .map((user: any) => ({
        id: user.user?.id || user.user_id || user.id,
        name: user.user?.name || user.name || user.user?.email || user.email || 'Professional',
        email: user.user?.email || user.email || '',
        role: user.role || 'professional'
      }));

    res.json(formattedProfessionals);
  } catch (error) {
    console.error('Error fetching clinic professionals:', error);
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
});

// Update WhatsApp professional assignment
router.put('/api/whatsapp/numbers/:id/professional', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_id } = req.body;
    
    console.log('🔍 Professional assignment request:', { id, user_id, body: req.body });
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid WhatsApp number ID' });
    }

    const storage = await getStorage();
    const whatsappNumber = await storage.getWhatsAppNumber(id);
    
    if (!whatsappNumber) {
      return res.status(404).json({ error: 'WhatsApp number not found' });
    }

    // Update professional assignment
    const updated = await storage.updateWhatsAppNumber(id, { 
      user_id: user_id 
    });
    
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update professional assignment' });
    }

    console.log(`✅ WhatsApp number ${id} assigned to professional ${user_id || 'none'}`);
    res.json({ success: true, whatsappNumber: updated });
  } catch (error) {
    console.error('Error updating WhatsApp professional assignment:', error);
    res.status(500).json({ error: 'Failed to update professional assignment' });
  }
});

// Delete WhatsApp number
router.delete('/api/whatsapp/numbers/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid WhatsApp number ID' });
    }

    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const storage = await getStorage();
    const whatsappNumber = await storage.getWhatsAppNumber(id);
    
    if (!whatsappNumber) {
      return res.status(404).json({ error: 'WhatsApp number not found' });
    }

    // Verify user has permission to delete (same clinic)
    if (whatsappNumber.clinic_id !== user.clinic_id) {
      return res.status(403).json({ error: 'Unauthorized: Cannot delete WhatsApp number from different clinic' });
    }

    console.log(`🗑️ Soft deleting WhatsApp number ${id} with instance: ${whatsappNumber.instance_name} by user ${user.id}`);

    // Try to delete instance from Evolution API (don't fail if instance doesn't exist)
    try {
      await evolutionApi.deleteInstance(whatsappNumber.instance_name);
      console.log(`✅ Evolution API instance deleted: ${whatsappNumber.instance_name}`);
    } catch (apiError: any) {
      console.log(`⚠️ Evolution API deletion failed (continuing): ${apiError.message}`);
      // Continue with soft delete even if API deletion fails
    }

    // Soft delete from database with user tracking
    const deleted = await storage.deleteWhatsAppNumber(id, user.id);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete from database' });
    }

    console.log(`✅ WhatsApp number ${id} soft deleted from database by user ${user.id}`);
    
    // Check if instance was linked to Livia for user feedback
    const liviaConfig = await storage.getLiviaConfiguration(user.clinic_id);
    const wasLinkedToLivia = liviaConfig && liviaConfig.whatsapp_number_id === id;
    
    res.json({ 
      success: true, 
      message: 'WhatsApp number deleted successfully',
      type: 'soft_delete',
      deletedBy: user.id,
      warnings: wasLinkedToLivia ? [
        'Esta instância estava vinculada à Lívia',
        'Lívia foi desvinculada automaticamente',
        'Configure um novo número WhatsApp para a Lívia nas configurações'
      ] : []
    });
  } catch (error) {
    console.error('Error deleting WhatsApp number:', error);
    res.status(500).json({ error: 'Failed to delete WhatsApp number' });
  }
});

// Cleanup unclaimed instance
router.delete('/api/whatsapp/cleanup/:instanceName', async (req, res) => {
  try {
    const instanceName = req.params.instanceName;
    
    const storage = await getStorage();
    
    console.log(`🧹 Attempting to cleanup unclaimed instance: ${instanceName}`);
    
    // Find the unclaimed instance (status should be 'connecting' or 'disconnected')
    const whatsappNumbers = await storage.getWhatsAppNumbers(1); // Get numbers for clinic 1
    const unclaimedInstance = whatsappNumbers.find(num => 
      num.instance_name === instanceName && 
      (num.status === 'connecting' || num.status === 'disconnected')
    );
    
    if (!unclaimedInstance) {
      console.log(`⚠️ No unclaimed instance found with name: ${instanceName}`);
      return res.status(404).json({ error: 'Instance not found or already claimed' });
    }

    console.log(`🗑️ Cleaning up unclaimed instance ID ${unclaimedInstance.id} (${instanceName})`);

    // Try to delete instance from Evolution API (don't fail if instance doesn't exist)
    try {
      await evolutionApi.deleteInstance(instanceName);
      console.log(`✅ Evolution API instance deleted: ${instanceName}`);
    } catch (apiError: any) {
      console.log(`⚠️ Evolution API deletion failed (continuing): ${apiError.message}`);
    }

    // Delete from database
    const deleted = await storage.deleteWhatsAppNumber(unclaimedInstance.id);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete from database' });
    }

    console.log(`✅ Unclaimed instance ${instanceName} cleaned up successfully`);
    res.json({ success: true, message: 'Unclaimed instance cleaned up successfully' });
  } catch (error) {
    console.error('Error cleaning up unclaimed instance:', error);
    res.status(500).json({ error: 'Failed to cleanup unclaimed instance' });
  }
});

export default router;