import {
  findBalancesByAgent,
  findBalanceByCurrency,
  createBalance,
  creditBalance,
  debitBalance
} from '../models/balance.repository.js';

// Liste des balances d'un agent
export const getBalancesByAgent = async (req, res) => {
  const { agent_id } = req.params;
  try {
    const balances = await findBalancesByAgent(agent_id);
    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des balances", error: error.message });
  }
};

// Récupérer une balance spécifique
export const getBalance = async (req, res) => {
  const { agent_id, currency_id } = req.params;
  try {
    const balance = await findBalanceByCurrency(agent_id, currency_id);
    if (!balance) {
      return res.status(404).json({ message: "Balance non trouvée" });
    }
    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de la balance", error: error.message });
  }
};

// Créer une balance pour un agent
export const addBalance = async (req, res) => {
  const { agent_id, currency_id } = req.body;
  try {
    const newBalance = await createBalance(agent_id, currency_id);
    res.status(201).json({ message: "Balance créée avec succès", balance: newBalance });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de la balance", error: error.message });
  }
};

// Créditer un compte
export const creditAgentBalance = async (req, res) => {
  const { agent_id, currency_id, amount } = req.body;
  try {
    const updatedBalance = await creditBalance(agent_id, currency_id, amount);
    if (!updatedBalance) {
      return res.status(404).json({ message: "Balance non trouvée" });
    }
    res.json({ message: "Balance créditée avec succès", balance: updatedBalance });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du crédit de la balance", error: error.message });
  }
};

// Débiter un compte
export const debitAgentBalance = async (req, res) => {
  const { agent_id, currency_id, amount } = req.body;
  try {
    const updatedBalance = await debitBalance(agent_id, currency_id, amount);
    if (!updatedBalance) {
      return res.status(400).json({ message: "Solde insuffisant ou balance introuvable" });
    }
    res.json({ message: "Balance débitée avec succès", balance: updatedBalance });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du débit de la balance", error: error.message });
  }
};
