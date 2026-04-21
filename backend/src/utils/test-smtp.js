import dns from 'dns';
import net from 'net';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

async function diagnoseSMTP() {
  console.log('🔍 Diagnostic SMTP Gmail...\n');
  
  // 1. Test DNS
  try {
    console.log('1️⃣ Test DNS pour smtp.gmail.com...');
    const addresses = await dns.promises.resolve4('smtp.gmail.com');
    console.log('✅ Résolution DNS réussie:', addresses);
  } catch (error) {
    console.error('❌ Échec DNS:', error.message);
    return;
  }
  
  // 2. Test connexion TCP
  console.log('\n2️⃣ Test connexion TCP sur smtp.gmail.com:587...');
  const socket = new net.Socket();
  
  socket.setTimeout(5000);
  
  socket.on('connect', () => {
    console.log('✅ Connexion TCP établie');
    socket.destroy();
  });
  
  socket.on('timeout', () => {
    console.error('❌ Timeout - Le port 587 est probablement bloqué');
    socket.destroy();
  });
  
  socket.on('error', (err) => {
    console.error('❌ Erreur connexion:', err.message);
  });
  
  socket.connect(587, 'smtp.gmail.com');
}

diagnoseSMTP();