import { 
  findAllGains, 
  findGainsByAgent, 
  // createGain, 
  // deleteGain,
  findGainsByAgentGroupedByCurrencyAndMonth,
  findGainsByAgentWithCurrencyDetails,
  findMonthlyGainsByAgentAndCurrency,
  findCurrentMonthGainsSummary,
  findLast12MonthsGains,
  getCurrentMonthTotalByAgentAndCurrency
} from '../models/gain.repository.js';

// Admin : voir tous les gains
export const getAllGains = async (req, res) => {
  try {
    const gains = await findAllGains();
    res.json(gains);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des gains", error: error.message });
  }
};

// Agent : voir ses propres gains
export const getGainsByAgent = async (req, res) => {
  const { agent_id } = req.params;
  try {
    const gains = await findGainsByAgent(agent_id);
    res.json(gains);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des gains", error: error.message });
  }
};

// Agent : voir ses gains groupés par devise et par mois (avec filtres optionnels)
export const getGainsByAgentGroupedByCurrency = async (req, res) => {
  const { agent_id } = req.params;
  const { year, month } = req.query; // Récupération des paramètres de requête
  
  try {
    // Conversion des paramètres en nombres si présents
    const yearNum = year ? parseInt(year) : null;
    const monthNum = month ? parseInt(month) : null;
    
    const gainsByCurrency = await findGainsByAgentGroupedByCurrencyAndMonth(
      agent_id, 
      yearNum, 
      monthNum
    );
    res.json(gainsByCurrency);
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération des gains par devise", 
      error: error.message 
    });
  }
};

// Agent : voir ses gains mensuels par devise (avec devise optionnelle)
export const getMonthlyGainsByAgentAndCurrency = async (req, res) => {
  const { agent_id } = req.params;
  const { currency_id } = req.query;
  
  try {
    const monthlyGains = await findMonthlyGainsByAgentAndCurrency(
      agent_id, 
      currency_id || null
    );
    res.json(monthlyGains);
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération des gains mensuels", 
      error: error.message 
    });
  }
};

// Agent : voir ses gains groupés par devise avec détails
export const getGainsByAgentWithCurrencyDetails = async (req, res) => {
  const { agent_id } = req.params;
  try {
    const gainsByCurrency = await findGainsByAgentWithCurrencyDetails(agent_id);
    res.json(gainsByCurrency);
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération des gains détaillés par devise", 
      error: error.message 
    });
  }
};

// Résumé des gains du mois en cours (pour admin ou agent spécifique)
export const getCurrentMonthGainsSummary = async (req, res) => {
  const { agent_id } = req.query; // Optionnel
  
  try {
    const summary = await findCurrentMonthGainsSummary(agent_id || null);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération du résumé mensuel", 
      error: error.message 
    });
  }
};

// Historique des gains sur 12 mois (pour admin ou agent spécifique)
export const getLast12MonthsGains = async (req, res) => {
  const { agent_id } = req.query; // Optionnel
  
  try {
    const history = await findLast12MonthsGains(agent_id || null);
    res.json(history);
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération de l'historique", 
      error: error.message 
    });
  }
};

// Total du mois en cours pour un agent et une devise spécifique
export const getCurrentMonthTotal = async (req, res) => {
  const { agent_id, currency_id } = req.params;
  
  try {
    const total = await getCurrentMonthTotalByAgentAndCurrency(agent_id, currency_id);
    res.json({ 
      agent_id, 
      currency_id, 
      current_month_total: total 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération du total mensuel", 
      error: error.message 
    });
  }
};

// Admin : enregistrer un gain
// export const addGain = async (req, res) => {
//   try {
//     const newGain = await createGain(req.body);
//     res.status(201).json({ message: "Gain enregistré avec succès", gain: newGain });
//   } catch (error) {
//     res.status(500).json({ message: "Erreur lors de l'enregistrement du gain", error: error.message });
//   }
// };

// Admin : supprimer un gain
// export const removeGain = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const deletedGain = await deleteGain(id);
//     if (!deletedGain) {
//       return res.status(404).json({ message: "Gain non trouvé" });
//     }
//     res.json({ message: "Gain supprimé avec succès", gain: deletedGain });
//   } catch (error) {
//     res.status(500).json({ message: "Erreur lors de la suppression du gain", error: error.message });
//   }
// };