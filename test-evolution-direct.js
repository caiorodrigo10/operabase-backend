/**
 * Teste direto da Evolution API para identificar o formato correto
 */

import https from 'https';

const testEvolutionAPI = async () => {
  console.log('🧪 Testando Evolution API diretamente...');
  
  // Teste 1: mediaType (T maiúsculo)
  const payload1 = {
    number: "5511965860124",
    mediaMessage: {
      mediaType: "image",
      fileName: "test.png", 
      media: "https://via.placeholder.com/300.png"
    },
    options: {
      delay: 1000,
      presence: "composing"
    }
  };
  
  // Teste 2: mediatype (t minúsculo)
  const payload2 = {
    number: "5511965860124",
    mediaMessage: {
      mediatype: "image",
      fileName: "test.png",
      media: "https://via.placeholder.com/300.png"
    },
    options: {
      delay: 1000,
      presence: "composing"
    }
  };

  const testPayload = async (payload, testName) => {
    return new Promise((resolve) => {
      const data = JSON.stringify(payload);
      
      const options = {
        hostname: 'n8n-evolution-api.4gmy9o.easypanel.host',
        port: 443,
        path: '/message/sendMedia/clinic_1_user_3_1750800791143',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY,
          'Content-Length': data.length
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          console.log(`\n📊 ${testName}:`);
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response: ${responseData}`);
          resolve({ status: res.statusCode, body: responseData });
        });
      });

      req.on('error', (error) => {
        console.log(`❌ ${testName} Error:`, error.message);
        resolve({ error: error.message });
      });

      req.write(data);
      req.end();
    });
  };

  // Executar testes
  await testPayload(payload1, 'Teste mediaType (T maiúsculo)');
  await testPayload(payload2, 'Teste mediatype (t minúsculo)');
  
  console.log('\n✅ Testes concluídos');
};

testEvolutionAPI().catch(console.error);