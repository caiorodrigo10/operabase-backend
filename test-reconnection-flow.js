/**
 * Test script to verify the complete reconnection flow
 */

const baseUrl = 'https://df0b3851-aaaa-4197-a6b1-d560b7c6c6d4-00-3i6k0prixkpej.spock.replit.dev';
const cookies = 'connect.sid=s%3A-t-9z6RLBu-_sZ93q4lE0x6PGo3l2bU3.GqhLJJRKOD41BKoQD7yfJqgGM8E3UYJuGATFf9lK%2BDo';

async function testReconnectionFlow() {
  console.log('🔧 Testing WhatsApp reconnection flow...');
  
  try {
    // Step 1: Get current WhatsApp numbers
    console.log('\n📋 Step 1: Getting current WhatsApp numbers...');
    const numbersResponse = await fetch(`${baseUrl}/api/whatsapp/numbers/1`, {
      headers: { 'Cookie': cookies }
    });
    
    const numbers = await numbersResponse.json();
    console.log('📱 Current numbers:', numbers.length);
    
    numbers.forEach(num => {
      console.log(`  - ID: ${num.id}, Status: ${num.status}, Phone: ${num.phone_number}, Instance: ${num.instance_name}`);
    });
    
    // Step 2: Find disconnected instance
    const disconnectedInstance = numbers.find(n => n.status === 'disconnected');
    
    if (!disconnectedInstance) {
      console.log('❌ No disconnected instances found. Test cannot proceed.');
      return;
    }
    
    console.log('\n🔌 Step 2: Found disconnected instance:', disconnectedInstance.instance_name);
    
    // Step 3: Test reconnection
    console.log('\n🔄 Step 3: Testing reconnection...');
    
    const reconnectResponse = await fetch(`${baseUrl}/api/whatsapp/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        instanceName: disconnectedInstance.instance_name
      })
    });
    
    if (reconnectResponse.ok) {
      const reconnectData = await reconnectResponse.json();
      console.log('✅ Reconnection initiated successfully:');
      console.log('  - Instance:', reconnectData.instanceName);
      console.log('  - Previous Phone:', reconnectData.previousPhone);
      console.log('  - QR Code Generated:', !!reconnectData.qrCode);
      console.log('  - Is Reconnection:', reconnectData.reconnection);
      
      // Step 4: Verify status changed to connecting
      console.log('\n🔍 Step 4: Verifying status update...');
      
      // Wait a moment for the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedNumbersResponse = await fetch(`${baseUrl}/api/whatsapp/numbers/1`, {
        headers: { 'Cookie': cookies }
      });
      
      const updatedNumbers = await updatedNumbersResponse.json();
      const updatedInstance = updatedNumbers.find(n => n.instance_name === disconnectedInstance.instance_name);
      
      if (updatedInstance) {
        console.log('✅ Instance status updated:');
        console.log('  - Previous Status:', disconnectedInstance.status);
        console.log('  - Current Status:', updatedInstance.status);
        
        if (updatedInstance.status === 'connecting') {
          console.log('🎉 Reconnection flow working correctly!');
        } else {
          console.log('⚠️ Status not updated to connecting as expected');
        }
      } else {
        console.log('❌ Could not find updated instance');
      }
      
    } else {
      const error = await reconnectResponse.text();
      console.log('❌ Reconnection failed:', reconnectResponse.status, error);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testReconnectionFlow();