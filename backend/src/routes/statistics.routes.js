import express from 'express';
import { pool } from '../config/db.js';

const router = express.Router();

// Route pour les statistiques temporelles
router.get('/transactions/chart-data', async (req, res) => {
  const { period = 'day' } = req.query; // day, week, month
  
  try {
    let query = '';
    let params = [];

    switch (period) {
      case 'day':
        query = `
          SELECT 
            TO_CHAR(created_at, 'DD') as date,
            COUNT(*) as transactions,
            COALESCE(SUM(send_amount), 0) as amount
          FROM transactions 
          WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY TO_CHAR(created_at, 'DD')
          ORDER BY TO_CHAR(created_at, 'DD')
        `;
        break;

      case 'week':
        query = `
          SELECT 
            TO_CHAR(created_at, 'WW') as date,
            COUNT(*) as transactions,
            COALESCE(SUM(send_amount), 0) as amount
          FROM transactions 
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY TO_CHAR(created_at, 'WW')
          ORDER BY TO_CHAR(created_at, 'WW')
        `;
        break;

      case 'month':
        query = `
          SELECT 
            TO_CHAR(created_at, 'MM') as date,
            COUNT(*) as transactions,
            COALESCE(SUM(send_amount), 0) as amount
          FROM transactions 
          WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
          GROUP BY TO_CHAR(created_at, 'MM')
          ORDER BY TO_CHAR(created_at, 'MM')
        `;
        break;
    }

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      period
    });

  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur' 
    });
  }
});

// Route pour les statistiques par devise
router.get('/transactions/currency-stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        c.code as name,
        COALESCE(SUM(t.send_amount), 0) as value
      FROM currencies c
      LEFT JOIN countries co ON co.currency_id = c.id
      LEFT JOIN transactions t ON t.from_country_id = co.id
      WHERE t.status = 'effectuee'
      GROUP BY c.code
      ORDER BY value DESC
    `;

    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching currency stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur' 
    });
  }
});

export default router;