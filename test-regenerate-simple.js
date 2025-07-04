console.log('🧪 Testing QR regeneration...');

const baseUrl = 'https://df0b3851-aaaa-4197-a6b1-d560b7c6c6d4-00-3i6k0prixkpej.spock.replit.dev';
const instanceName = 'clinic_1_user_3_1750963468442';

fetch(`${baseUrl}/api/whatsapp/regenerate-qr`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'connect.sid=s%3A-t-9z6RLBu-_sZ93q4lE0x6PGo3l2bU3.GqhLJJRKOD41BKoQD7yfJqgGM8E3UYJuGATFf9lK%2BDo'
  },
  body: JSON.stringify({ instanceName })
})
.then(res => res.json())
.then(result => console.log('✅ Result:', result))
.catch(error => console.error('❌ Error:', error));