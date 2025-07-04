#!/usr/bin/env tsx

import { db } from './server/db.js';
import * as schema from './shared/schema.js';
import { MaraAIService } from './server/mara-ai-service.js';
import { storage } from './server/storage.js';

async function testMaraAPI() {
  console.log('🧪 Testando API da Mara AI...');
  
  try {
    // Testar se o storage está funcionando
    console.log('1. Testando storage...');
    const contacts = await storage.getContacts(1); // clinic_id 1
    console.log(`Contatos encontrados: ${contacts.length}`);
    
    if (contacts.length > 0) {
      const contactId = contacts[0].id;
      console.log(`\n2. Testando contato ID: ${contactId}`);
      
      const contact = await storage.getContact(contactId);
      console.log(`Contato: ${contact?.name}`);
      
      const appointments = await storage.getContactAppointments(contactId);
      console.log(`Consultas: ${appointments.length}`);
      
      const medicalRecords = await storage.getContactMedicalRecords(contactId);
      console.log(`Prontuários: ${medicalRecords.length}`);
      
      // Testar Mara AI Service
      console.log('\n3. Testando Mara AI Service...');
      const maraService = new MaraAIService(storage);
      
      try {
        const result = await maraService.analyzeContact(contactId, 'Faça um resumo geral deste paciente');
        console.log('✅ Mara AI funcionando:');
        console.log(`Resposta: ${result.response.substring(0, 100)}...`);
        console.log(`Confiança: ${result.confidence}`);
        console.log(`Fontes: ${result.sources.length}`);
      } catch (maraError) {
        console.error('❌ Erro na Mara AI:', maraError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testMaraAPI();