import { pool } from '../config/db.js';

export const debugDatabase = async (req, res, next) => {
  console.log('🔍 Debug middleware called for:', req.path);
  
  try {
    // Test de connexion basique
    const client = await pool.connect();
    console.log('✅ Database connection OK');
    
    // Test de requête simple
    const testQuery = await client.query('SELECT COUNT(*) FROM transactions');
    console.log('✅ Transactions table exists, count:', testQuery.rows[0].count);
    
    client.release();
    next();
  } catch (error) {
    console.error('❌ Database debug error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};