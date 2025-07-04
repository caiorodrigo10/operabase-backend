const { db } = await import('./server/db.ts');
const { sql } = await import('drizzle-orm');

/**
 * Comprehensive Mara AI + RAG System Validation
 * Ensures all critical configurations are correctly set
 */
async function validateMaraRAGSystem() {
  console.log('🔍 Validating Mara AI + RAG System Configuration...\n');
  
  let allValidationsPassed = true;
  const validationResults = [];

  // 1. Validate RAG System Infrastructure
  console.log('1️⃣ Checking RAG Infrastructure...');
  try {
    // Check pgvector extension
    const vectorExt = await db.execute(sql`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);
    
    if (vectorExt.rows.length === 0) {
      validationResults.push('❌ pgvector extension not installed');
      allValidationsPassed = false;
    } else {
      validationResults.push('✅ pgvector extension installed');
    }

    // Check RAG tables existence
    const ragTables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rag_knowledge_bases', 'rag_documents', 'rag_chunks', 'rag_embeddings')
    `);
    
    if (ragTables.rows.length === 4) {
      validationResults.push('✅ All RAG tables present');
    } else {
      validationResults.push(`❌ Missing RAG tables: ${4 - ragTables.rows.length} missing`);
      allValidationsPassed = false;
    }

    // Check Mara configuration table
    const maraTables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'mara_professional_configs'
    `);
    
    if (maraTables.rows.length === 1) {
      validationResults.push('✅ Mara configuration table present');
    } else {
      validationResults.push('❌ Mara configuration table missing');
      allValidationsPassed = false;
    }

  } catch (error) {
    validationResults.push(`❌ Database connectivity error: ${error.message}`);
    allValidationsPassed = false;
  }

  // 2. Validate Critical Configuration Values
  console.log('\n2️⃣ Checking Critical Configuration Values...');
  
  // Check similarity threshold in code (read file)
  try {
    const fs = await import('fs');
    const maraServiceContent = fs.readFileSync('./server/mara-ai-service.ts', 'utf8');
    
    if (maraServiceContent.includes('result.similarity > 0.2')) {
      validationResults.push('✅ Correct similarity threshold (0.2) configured');
    } else if (maraServiceContent.includes('result.similarity > 0.7')) {
      validationResults.push('❌ CRITICAL: Similarity threshold too high (0.7) - will block valid results');
      allValidationsPassed = false;
    } else {
      validationResults.push('⚠️ WARNING: Could not verify similarity threshold');
    }

    if (maraServiceContent.includes('.slice(0, 5)')) {
      validationResults.push('✅ Correct chunk count (5) configured');
    } else {
      validationResults.push('⚠️ WARNING: Could not verify chunk count configuration');
    }

    // Check URL processor encoding
    const urlProcessorContent = fs.readFileSync('./server/rag-processors/url-processor.ts', 'utf8');
    
    if (urlProcessorContent.includes("'Accept-Encoding': 'identity'")) {
      validationResults.push('✅ Correct URL encoding (identity) configured');
    } else if (urlProcessorContent.includes("'Accept-Encoding': 'gzip")) {
      validationResults.push('❌ CRITICAL: URL processor uses gzip encoding - will corrupt data');
      allValidationsPassed = false;
    } else {
      validationResults.push('⚠️ WARNING: Could not verify URL processor encoding');
    }

  } catch (error) {
    validationResults.push(`❌ Could not read source files: ${error.message}`);
    allValidationsPassed = false;
  }

  // 3. Validate Sample Data Quality
  console.log('\n3️⃣ Checking Data Quality...');
  try {
    // Check for test knowledge base
    const testKB = await db.execute(sql`
      SELECT id, name, external_user_id 
      FROM rag_knowledge_bases 
      WHERE external_user_id = 'cr@caiorodrigo.com.br'
      LIMIT 1
    `);

    if (testKB.rows.length > 0) {
      const kbId = testKB.rows[0].id;
      validationResults.push(`✅ Test knowledge base found (ID: ${kbId})`);

      // Check document count
      const docCount = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM rag_documents 
        WHERE external_user_id = 'cr@caiorodrigo.com.br' 
        AND status = 'completed'
      `);

      const documentCount = docCount.rows[0]?.count || 0;
      if (documentCount > 0) {
        validationResults.push(`✅ ${documentCount} processed documents found`);
      } else {
        validationResults.push('⚠️ No processed documents found');
      }

      // Check embeddings count
      const embeddingCount = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM rag_embeddings re
        JOIN rag_chunks rc ON re.chunk_id = rc.id
        JOIN rag_documents rd ON rc.document_id = rd.id
        WHERE rd.external_user_id = 'cr@caiorodrigo.com.br'
      `);

      const embeddingsCount = embeddingCount.rows[0]?.count || 0;
      if (embeddingsCount > 0) {
        validationResults.push(`✅ ${embeddingsCount} embeddings generated`);
      } else {
        validationResults.push('❌ No embeddings found - RAG will not work');
        allValidationsPassed = false;
      }

      // Test sample semantic search
      if (embeddingsCount > 0) {
        const { EmbeddingService } = await import('./server/rag-processors/embedding-service.js');
        const embeddingService = new EmbeddingService();
        
        try {
          const queryEmbedding = await embeddingService.generateSingleEmbedding('Zouti');
          const embeddingVector = `[${queryEmbedding.join(',')}]`;
          
          const searchResults = await db.execute(sql`
            SELECT 
              1 - (re.embedding <=> ${embeddingVector}::vector) as similarity,
              rc.content
            FROM rag_chunks rc
            JOIN rag_documents rd ON rc.document_id = rd.id
            JOIN rag_embeddings re ON re.chunk_id = rc.id
            WHERE rd.external_user_id = 'cr@caiorodrigo.com.br'
            ORDER BY re.embedding <=> ${embeddingVector}::vector
            LIMIT 3
          `);

          if (searchResults.rows.length > 0) {
            const topSimilarity = parseFloat(searchResults.rows[0].similarity);
            if (topSimilarity > 0.3) {
              validationResults.push(`✅ Semantic search working (top similarity: ${topSimilarity.toFixed(3)})`);
            } else {
              validationResults.push(`⚠️ Low semantic search quality (top similarity: ${topSimilarity.toFixed(3)})`);
            }
          } else {
            validationResults.push('❌ Semantic search returned no results');
            allValidationsPassed = false;
          }
        } catch (error) {
          validationResults.push(`❌ Semantic search test failed: ${error.message}`);
          allValidationsPassed = false;
        }
      }

    } else {
      validationResults.push('⚠️ No test knowledge base found');
    }

  } catch (error) {
    validationResults.push(`❌ Data quality check failed: ${error.message}`);
    allValidationsPassed = false;
  }

  // 4. Validate Mara Configuration
  console.log('\n4️⃣ Checking Mara Configuration...');
  try {
    const maraConfigs = await db.execute(sql`
      SELECT 
        mpc.professional_id,
        mpc.knowledge_base_id,
        mpc.is_active,
        kb.name as knowledge_base_name
      FROM mara_professional_configs mpc
      LEFT JOIN rag_knowledge_bases kb ON mpc.knowledge_base_id = kb.id
      WHERE mpc.is_active = true
    `);

    if (maraConfigs.rows.length > 0) {
      validationResults.push(`✅ ${maraConfigs.rows.length} active Mara configuration(s) found`);
      
      maraConfigs.rows.forEach((config, index) => {
        validationResults.push(`   ${index + 1}. Professional ${config.professional_id} → KB "${config.knowledge_base_name}"`);
      });
    } else {
      validationResults.push('⚠️ No active Mara configurations found');
    }

  } catch (error) {
    validationResults.push(`❌ Mara configuration check failed: ${error.message}`);
    allValidationsPassed = false;
  }

  // 5. Environment Variables Check
  console.log('\n5️⃣ Checking Environment Variables...');
  const requiredEnvVars = ['OPENAI_API_KEY', 'DATABASE_URL'];
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      validationResults.push(`✅ ${envVar} configured`);
    } else {
      validationResults.push(`❌ ${envVar} missing`);
      allValidationsPassed = false;
    }
  });

  // Final Report
  console.log('\n📊 VALIDATION REPORT');
  console.log('='.repeat(50));
  validationResults.forEach(result => console.log(result));
  
  console.log('\n🎯 OVERALL STATUS:');
  if (allValidationsPassed) {
    console.log('✅ ALL VALIDATIONS PASSED - System is correctly configured');
  } else {
    console.log('❌ SOME VALIDATIONS FAILED - Review critical issues above');
  }

  console.log('\n📚 Next Steps:');
  console.log('1. Address any critical (❌) issues immediately');
  console.log('2. Review warnings (⚠️) for potential improvements');
  console.log('3. Test Mara AI with sample questions');
  console.log('4. Monitor system performance and logs');

  return allValidationsPassed;
}

// Run validation
validateMaraRAGSystem().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});