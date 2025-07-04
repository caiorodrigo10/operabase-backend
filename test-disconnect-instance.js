/**
 * Test script to disconnect a WhatsApp instance
 * This simulates what happens when WhatsApp disconnects
 */

const baseUrl = 'https://df0b3851-aaaa-4197-a6b1-d560b7c6c6d4-00-3i6k0prixkpej.spock.replit.dev';

async function disconnectInstance() {
  console.log('🔧 Testing WhatsApp disconnect functionality...');
  
  try {
    // Get the connected instance first
    const numbersResponse = await fetch(`${baseUrl}/api/whatsapp/numbers/1`, {
      headers: {
        'Cookie': 'connect.sid=s%3A-t-9z6RLBu-_sZ93q4lE0x6PGo3l2bU3.GqhLJJRKOD41BKoQD7yfJqgGM8E3UYJuGATFf9lK%2BDo'
      }
    });
    
    const numbers = await numbersResponse.json();
    console.log('📱 Current numbers:', numbers);
    
    if (numbers.length === 0) {
      console.log('❌ No numbers to disconnect');
      return;
    }
    
    const connectedNumber = numbers.find(n => n.status === 'open');
    if (!connectedNumber) {
      console.log('❌ No connected numbers found');
      return;
    }
    
    console.log('🔌 Disconnecting instance:', connectedNumber.id, connectedNumber.instance_name);
    
    // Disconnect the instance
    const disconnectResponse = await fetch(`${baseUrl}/api/whatsapp/disconnect/${connectedNumber.id}`, {
      method: 'POST',
      headers: {
        'Cookie': 'connect.sid=s%3A-t-9z6RLBu-_sZ93q4lE0x6PGo3l2bU3.GqhLJJRKOD41BKoQD7yfJqgGM8E3UYJuGATFf9lK%2BDo'
      }
    });
    
    if (disconnectResponse.ok) {
      const result = await disconnectResponse.json();
      console.log('✅ Instance disconnected:', result);
    } else {
      console.log('❌ Failed to disconnect:', disconnectResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

disconnectInstance();