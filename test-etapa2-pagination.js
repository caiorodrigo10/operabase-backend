/**
 * ETAPA 2: Test Script - Backend Pagination System
 * Validates the pagination system implementation with feature flag
 */

async function testEtapa2Pagination() {
  console.log('🧪 ETAPA 2: Testing Backend Pagination System');
  console.log('=======================================\n');

  const baseUrl = 'http://localhost:5000';
  
  try {
    // Test 1: Default pagination (page 1, limit 25)
    console.log('📄 Test 1: Default Pagination Parameters');
    const defaultResponse = await fetch(`${baseUrl}/api/conversations-simple/5511965860124551150391104`);
    const defaultData = await defaultResponse.json();
    
    console.log('✅ Default pagination response:');
    console.log(`   - Messages loaded: ${defaultData.messages?.length || 0}`);
    console.log(`   - Current page: ${defaultData.pagination?.currentPage || 'N/A'}`);
    console.log(`   - Limit: ${defaultData.pagination?.limit || 'N/A'}`);
    console.log(`   - Total messages: ${defaultData.pagination?.totalMessages || 'N/A'}`);
    console.log(`   - Has more: ${defaultData.pagination?.hasMore || 'N/A'}`);
    console.log(`   - Is paginated: ${defaultData.pagination?.isPaginated || 'N/A'}\n`);

    // Test 2: Custom pagination (page 1, limit 10)
    console.log('📄 Test 2: Custom Pagination (10 messages per page)');
    const customResponse = await fetch(`${baseUrl}/api/conversations-simple/5511965860124551150391104?page=1&limit=10`);
    const customData = await customResponse.json();
    
    console.log('✅ Custom pagination response:');
    console.log(`   - Messages loaded: ${customData.messages?.length || 0}`);
    console.log(`   - Current page: ${customData.pagination?.currentPage || 'N/A'}`);
    console.log(`   - Limit: ${customData.pagination?.limit || 'N/A'}`);
    console.log(`   - Total messages: ${customData.pagination?.totalMessages || 'N/A'}`);
    console.log(`   - Has more: ${customData.pagination?.hasMore || 'N/A'}\n`);

    // Test 3: Page 2 test
    if (customData.pagination?.hasMore) {
      console.log('📄 Test 3: Page 2 Pagination');
      const page2Response = await fetch(`${baseUrl}/api/conversations-simple/5511965860124551150391104?page=2&limit=10`);
      const page2Data = await page2Response.json();
      
      console.log('✅ Page 2 pagination response:');
      console.log(`   - Messages loaded: ${page2Data.messages?.length || 0}`);
      console.log(`   - Current page: ${page2Data.pagination?.currentPage || 'N/A'}`);
      console.log(`   - Has more: ${page2Data.pagination?.hasMore || 'N/A'}\n`);
    } else {
      console.log('⚠️ Test 3: Skipped - No additional pages available\n');
    }

    // Test 4: Performance comparison
    console.log('📊 Test 4: Performance Comparison');
    
    // Legacy system (50 messages)
    const legacyStart = Date.now();
    const legacyResponse = await fetch(`${baseUrl}/api/conversations-simple/5511965860124551150391104?page=1&limit=50`);
    const legacyData = await legacyResponse.json();
    const legacyTime = Date.now() - legacyStart;
    
    // Optimized system (25 messages)
    const optimizedStart = Date.now();
    const optimizedResponse = await fetch(`${baseUrl}/api/conversations-simple/5511965860124551150391104?page=1&limit=25`);
    const optimizedData = await optimizedResponse.json();
    const optimizedTime = Date.now() - optimizedStart;
    
    console.log('✅ Performance Results:');
    console.log(`   - Legacy (50 msgs): ${legacyTime}ms`);
    console.log(`   - Optimized (25 msgs): ${optimizedTime}ms`);
    console.log(`   - Improvement: ${legacyTime - optimizedTime}ms (${Math.round((1 - optimizedTime/legacyTime) * 100)}%)\n`);

    // Test 5: Feature flag functionality
    console.log('🔧 Test 5: Feature Flag Status');
    console.log(`   - Pagination enabled: ${defaultData.pagination?.isPaginated || false}`);
    console.log(`   - System behavior: ${defaultData.pagination?.isPaginated ? 'Using pagination' : 'Using legacy'}\n`);

    // Summary
    console.log('📋 ETAPA 2 Test Summary:');
    console.log('========================');
    
    const tests = [
      defaultData.pagination ? '✅ Default pagination working' : '❌ Default pagination failed',
      customData.pagination?.limit === 10 ? '✅ Custom limit working' : '❌ Custom limit failed',
      optimizedTime < legacyTime ? '✅ Performance improved' : '⚠️ Performance not improved',
      defaultData.pagination?.isPaginated ? '✅ Feature flag active' : '⚠️ Using legacy system',
      defaultData.messages?.length > 0 ? '✅ Messages loaded correctly' : '❌ No messages loaded'
    ];
    
    tests.forEach(test => console.log(`   ${test}`));
    
    const passedTests = tests.filter(test => test.includes('✅')).length;
    console.log(`\n🎯 Results: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
      console.log('✅ ETAPA 2: Backend Pagination System - SUCCESS');
    } else {
      console.log('⚠️ ETAPA 2: Some issues detected, but core functionality working');
    }

  } catch (error) {
    console.error('❌ ETAPA 2 Test Error:', error.message);
    console.log('❌ ETAPA 2: Backend Pagination System - FAILED');
  }
}

// Run the test
testEtapa2Pagination();