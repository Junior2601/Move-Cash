// src/controllers/authorizedNumber.controller.js
import {
  findAuthorizedNumbersByAgent,
  findAllAuthorizedNumbers,
  createAuthorizedNumber,
  updateAuthorizedNumberById,
  deleteAuthorizedNumberById
} from '../models/authorizedNumber.repository.js';

// Liste des numéros d'un agent
export const getAuthorizedNumbersByAgent = async (req, res) => {
  const { agent_id } = req.params;
  try {
    const numbers = await findAuthorizedNumbersByAgent(agent_id);
    res.json(numbers);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des numéros autorisés", error: error.message });
  }
};

// Liste complète (admin)
export const getAllAuthorizedNumbers = async (req, res) => {
  try {
    const numbers = await findAllAuthorizedNumbers();
    res.json(numbers);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des numéros autorisés", error: error.message });
  }
};

// Ajouter un numéro autorisé
export const addAuthorizedNumber = async (req, res) => {
  const { agent_id, country_id, payment_method_id, number, label } = req.body;
  try {
    const newNumber = await createAuthorizedNumber(agent_id, country_id, payment_method_id, number, label);
    res.status(201).json({ message: "Numéro autorisé ajouté avec succès", authorized_number: newNumber });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'ajout du numéro autorisé", error: error.message });
  }
};

// Mettre à jour un numéro autorisé
export const updateAuthorizedNumber = async (req, res) => {
  const { id } = req.params;
  const { number, label, is_active } = req.body;
  try {
    const updatedNumber = await updateAuthorizedNumberById(id, number, label, is_active);
    if (!updatedNumber) {
      return res.status(404).json({ message: "Numéro autorisé non trouvé" });
    }
    res.json({ message: "Numéro autorisé mis à jour avec succès", authorized_number: updatedNumber });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du numéro autorisé", error: error.message });
  }
};

// Supprimer un numéro autorisé
export const deleteAuthorizedNumber = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedNumber = await deleteAuthorizedNumberById(id);
    if (!deletedNumber) {
      return res.status(404).json({ message: "Numéro autorisé non trouvé" });
    }
    res.json({ message: "Numéro autorisé supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du numéro autorisé", error: error.message });
  }
};
