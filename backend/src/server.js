import dotenv from 'dotenv';
import express from 'express';
import { pool } from './config/db.js';
import cors from 'cors';
import morgan from 'morgan';

// Routes
import adminRoutes from './routes/admin.routes.js';
import agentRoutes from './routes/agent.routes.js';
import countryRoutes from './routes/country.routes.js';
import currencyRoutes from './routes/currency.routes.js';
import rateRoutes from './routes/rate.routes.js';
import paymentMethodRoutes from "./routes/paymentMethod.routes.js";
import authorizedNumberRoutes from "./routes/authorizedNumber.routes.js";
import balanceRoutes from "./routes/balance.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import gainRoutes from "./routes/gain.routes.js";
import historyRoutes from './routes/history.routes.js';


dotenv.config();

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes sécurisées (admin / agent)
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/country', countryRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/rate', rateRoutes);
app.use('/api/payment_method',paymentMethodRoutes);
app.use('/api/numero_autorise', authorizedNumberRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/gain', gainRoutes);
app.use('/api/history', historyRoutes);


// Routes publics
app.use('/api/transactions', transactionRoutes);

// Test route pour vérifier que le backend fonctionne
app.get('/', (req, res) => {
  res.json({ message: '🚀 API Transfert d’Argent en ligne' });
});

// Test route pour vérifier la connexion PostgreSQL
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'success', time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Erreur de connexion à la base' });
  }
});

// Port d’écoute
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur le port ${PORT}`);
});
