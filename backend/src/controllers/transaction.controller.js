import {
  createTransaction,
  validateTransaction,
  cancelTransaction,
  findTransactionById,
  findTransactionByTrackingCode
} from '../models/transaction.repository.js';

// Créer une transaction (publique)
export const createTransactionController = async (req, res) => {
  try {
    const trx = await createTransaction(req.body);
    res.status(201).json(trx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Valider une transaction (admin ou agent)
export const validateTransactionController = async (req, res) => {
  try {
    const result = await validateTransaction(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Annuler une transaction (admin ou agent)
export const cancelTransactionController = async (req, res) => {
  try {
    const result = await cancelTransaction(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Récupérer transaction par ID
export const getTransactionByIdController = async (req, res) => {
  try {
    const trx = await findTransactionById(req.params.id);
    if (!trx) return res.status(404).json({ message: 'Transaction introuvable' });
    res.json(trx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Récupérer transaction par tracking code
export const getTransactionByTrackingCodeController = async (req, res) => {
  try {
    const trx = await findTransactionByTrackingCode(req.params.code);
    if (!trx) return res.status(404).json({ message: 'Transaction introuvable' });
    res.json(trx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
