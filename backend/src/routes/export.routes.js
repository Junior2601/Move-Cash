import express from 'express';
import { pool } from '../config/db.js';
import ExcelJS from 'exceljs';

const router = express.Router();

router.get('/transactions/export', async (req, res) => {
  const { filter = 'day' } = req.query;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Entêtes du tableau
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Code Tracking', key: 'tracking_code', width: 20 },
      { header: 'Montant', key: 'send_amount', width: 15 },
      { header: 'Devise', key: 'currency', width: 10 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Date', key: 'created_at', width: 20 },
      { header: 'Pays Origine', key: 'from_country', width: 15 },
      { header: 'Pays Destination', key: 'to_country', width: 15 }
    ];

    // Récupérer les données selon le filtre
    let query = `
      SELECT 
        t.id,
        t.tracking_code,
        t.send_amount,
        c.code as currency,
        t.status,
        t.created_at,
        fc.name as from_country,
        tc.name as to_country
      FROM transactions t
      LEFT JOIN countries fc ON t.from_country_id = fc.id
      LEFT JOIN countries tc ON t.to_country_id = tc.id
      LEFT JOIN currencies c ON fc.currency_id = c.id
    `;

    if (filter === 'day') {
      query += " WHERE t.created_at >= CURRENT_DATE - INTERVAL '1 day'";
    } else if (filter === 'week') {
      query += " WHERE t.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (filter === 'month') {
      query += " WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    query += " ORDER BY t.created_at DESC";

    const result = await pool.query(query);
    
    // Ajouter les données
    result.rows.forEach(transaction => {
      worksheet.addRow(transaction);
    });

    // Style du header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Envoyer le fichier
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

export default router;