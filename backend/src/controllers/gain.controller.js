import { findAllGains, findGainsByAgent, createGain, deleteGain } from '../models/gain.repository.js';

//  Admin : voir tous les gains
export const getAllGains = async (req, res) => {
  try {
    const gains = await findAllGains();
    res.json(gains);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des gains", error: error.message });
  }
};

//  Agent : voir ses propres gains
export const getGainsByAgent = async (req, res) => {
  const { agent_id } = req.params;
  try {
    const gains = await findGainsByAgent(agent_id);
    res.json(gains);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des gains", error: error.message });
  }
};

//  Admin : enregistrer un gain
export const addGain = async (req, res) => {
  try {
    const newGain = await createGain(req.body);
    res.status(201).json({ message: "Gain enregistré avec succès", gain: newGain });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'enregistrement du gain", error: error.message });
  }
};

//  Admin : supprimer un gain
export const removeGain = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedGain = await deleteGain(id);
    if (!deletedGain) {
      return res.status(404).json({ message: "Gain non trouvé" });
    }
    res.json({ message: "Gain supprimé avec succès", gain: deletedGain });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du gain", error: error.message });
  }
};
