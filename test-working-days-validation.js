/**
 * ETAPA 1: Teste da Validação de Working Days no MCP
 * Testa se a API MCP está respeitando os dias de trabalho configurados da clínica
 */

async function testWorkingDaysValidation() {
  const baseUrl = 'http://localhost:5000/api';
  
  console.log('🧪 ETAPA 1: Testando Validação de Working Days');
  console.log('===============================================');
  
  try {
    // Teste 1: Verificar configuração atual da clínica
    console.log('\n1. Verificando configuração da clínica...');
    const configResponse = await fetch(`${baseUrl}/clinic/1/config`);
    const clinicConfig = await configResponse.json();
    
    console.log('📋 Working days configurados:', clinicConfig.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    
    // Teste 2: Consultar disponibilidade para uma quinta-feira (deve ter slots)
    console.log('\n2. Testando disponibilidade para quinta-feira (2025-07-03)...');
    const thursdayResponse = await fetch(`${baseUrl}/mcp/appointments/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinic_id: 1,
        user_id: 4,
        date: '2025-07-03', // Quinta-feira
        duration_minutes: 60,
        working_hours_start: '08:00',
        working_hours_end: '18:00'
      })
    });
    
    const thursdayData = await thursdayResponse.json();
    console.log('✅ Quinta-feira - Slots disponíveis:', thursdayData.data?.length || 0);
    
    // Teste 3: Consultar disponibilidade para um sábado (NÃO deve ter slots)
    console.log('\n3. Testando disponibilidade para sábado (2025-07-05)...');
    const saturdayResponse = await fetch(`${baseUrl}/mcp/appointments/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinic_id: 1,
        user_id: 4,
        date: '2025-07-05', // Sábado
        duration_minutes: 60,
        working_hours_start: '08:00',
        working_hours_end: '18:00'
      })
    });
    
    const saturdayData = await saturdayResponse.json();
    console.log('❌ Sábado - Slots disponíveis:', saturdayData.data?.length || 0);
    
    // Teste 4: Consultar disponibilidade para um domingo (NÃO deve ter slots)
    console.log('\n4. Testando disponibilidade para domingo (2025-07-06)...');
    const sundayResponse = await fetch(`${baseUrl}/mcp/appointments/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinic_id: 1,
        user_id: 4,
        date: '2025-07-06', // Domingo
        duration_minutes: 60,
        working_hours_start: '08:00',
        working_hours_end: '18:00'
      })
    });
    
    const sundayData = await sundayResponse.json();
    console.log('❌ Domingo - Slots disponíveis:', sundayData.data?.length || 0);
    
    // Resultado do teste
    console.log('\n📊 RESULTADO DO TESTE ETAPA 1:');
    console.log('==============================');
    
    const thursdayHasSlots = (thursdayData.data?.length || 0) > 0;
    const saturdayHasSlots = (saturdayData.data?.length || 0) > 0;
    const sundayHasSlots = (sundayData.data?.length || 0) > 0;
    
    console.log(`✅ Quinta-feira (dia útil): ${thursdayHasSlots ? 'TEM slots disponíveis' : 'NÃO tem slots'}`);
    console.log(`❌ Sábado (não útil): ${saturdayHasSlots ? 'TEM slots (ERRO!)' : 'NÃO tem slots (CORRETO)'}`);
    console.log(`❌ Domingo (não útil): ${sundayHasSlots ? 'TEM slots (ERRO!)' : 'NÃO tem slots (CORRETO)'}`);
    
    if (!saturdayHasSlots && !sundayHasSlots && thursdayHasSlots) {
      console.log('\n🎉 TESTE PASSOU: Sistema está respeitando working days!');
      console.log('✅ ETAPA 1 implementada com sucesso!');
      return true;
    } else {
      console.log('\n❌ TESTE FALHOU: Sistema NÃO está respeitando working days');
      if (saturdayHasSlots) console.log('   - Sábado deveria ter 0 slots mas tem', saturdayData.data?.length);
      if (sundayHasSlots) console.log('   - Domingo deveria ter 0 slots mas tem', sundayData.data?.length);
      if (!thursdayHasSlots) console.log('   - Quinta-feira deveria ter slots mas não tem');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    return false;
  }
}

// Executar teste
testWorkingDaysValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });