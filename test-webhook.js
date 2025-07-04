// Script para testar o webhook endpoint
const fetch = require('node-fetch');

async function testWebhook() {
  try {
    console.log('🧪 Testando webhook endpoint...');
    
    const response = await fetch('https://df0b3851-aaaa-4197-a6b1-d560b7c6c6d4-00-3i6k0prixkpej.spock.replit.dev/api/whatsapp/webhook/connection-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1'
      },
      body: JSON.stringify({
        instanceName: 'test-instance',
        event: 'connection.update',
        connectionStatus: 'open',
        phoneNumber: '5511999999999',
        profileName: 'Test Profile'
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('📊 Response Body:', text);
    
    if (response.ok) {
      console.log('✅ Webhook teste passou');
    } else {
      console.log('❌ Webhook teste falhou');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testWebhook();