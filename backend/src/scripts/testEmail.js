// import { pool } from "../src/config/db.js";
import { 
  notifyAgentForTransaction, 
  notifyAgentForRedirection, 
  notifyAgentRedirectionStatus 
} from "../services/email.service.js";

// Test notification transaction
async function testTransactionEmail() {
  try {
    console.log('🧪 Test email transaction...');
    
    const testTransaction = {
      send_amount: 1000,
      from_country_name: 'France',
      to_country_name: 'Côte d\'Ivoire',
      sender_phone: '+33123456789',
      receiver_phone: '+22501234567',
      tracking_code: 'TRX_TEST123',
      from_currency_code: 'EUR',
      to_currency_code: 'XOF',
      currency: 'EUR'
    };

    await notifyAgentForTransaction("pauljunioryao@yandex.com", testTransaction);
    console.log('✅ Email transaction test envoyé');
  } catch (error) {
    console.error('❌ Erreur email transaction:', error);
  }
}

// Test notification redirection
async function testRedirectionEmail() {
  try {
    console.log('🧪 Test email redirection...');
    
    const testRedirection = {
      redirected_amount: 500,
      from_agent_id: 1,
      reason: 'Test de redirection'
    };

    const testTransaction = {
      tracking_code: 'TRX_TEST123',
      send_amount: 1000,
      sender_phone: '+33123456789',
      receiver_phone: '+22501234567',
      from_country_name: 'France',
      to_country_name: 'Côte d\'Ivoire',
      currency: 'EUR'
    };

    await notifyAgentForRedirection("pauljunioryao@yandex.com", testRedirection, testTransaction);
    console.log('✅ Email redirection test envoyé');
  } catch (error) {
    console.error('❌ Erreur email redirection:', error);
  }
}

// Test statut redirection
async function testRedirectionStatusEmail() {
  try {
    console.log('🧪 Test email statut redirection...');
    
    const testRedirection = {
      redirected_amount: 500,
      to_agent_name: 'Agent Test',
      reason: 'Test de redirection'
    };

    const testTransaction = {
      tracking_code: 'TRX_TEST123',
      send_amount: 1000,
      currency: 'EUR'
    };

    await notifyAgentRedirectionStatus("pauljunioryao@yandex.com", testRedirection, testTransaction, 'accepted');
    console.log('✅ Email statut redirection test envoyé');
  } catch (error) {
    console.error('❌ Erreur email statut redirection:', error);
  }
}

// Exécuter tous les tests
(async () => {
  console.log('🚀 Démarrage des tests d\'email...\n');
  
  await testTransactionEmail();
  await testRedirectionEmail();
  await testRedirectionStatusEmail();
  
  console.log('\n🎯 Tous les tests d\'email terminés');
  process.exit(0);
})();