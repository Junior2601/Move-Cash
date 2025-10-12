// Forcer le fuseau horaire UTC pour toute l'application
process.env.TZ = 'UTC';
console.log('🕒 Fuseau horaire configuré:', process.env.TZ);