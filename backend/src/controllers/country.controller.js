import {
  findActiveCountries,
  findAllCountries,
  createCountry,
  updateCountryById,
  deleteCountryById
} from '../models/country.repository.js';

// 📌 Liste publique des pays actifs
export const getActiveCountries = async (req, res) => {
  try {
    const countries = await findActiveCountries();
    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des pays actifs', error: error.message });
  }
};

// 📌 Liste complète (admin)
export const getAllCountries = async (req, res) => {
  try {
    const countries = await findAllCountries();
    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des pays', error: error.message });
  }
};

// 📌 Création d’un pays (admin)
export const addCountry = async (req, res) => {
  const { name, code, phone_prefix, currency_id } = req.body;
  try {
    const newCountry = await createCountry(name, code, phone_prefix, currency_id);
    res.status(201).json({ message: 'Pays ajouté avec succès', country: newCountry });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l’ajout du pays', error: error.message });
  }
};

// 📌 Mise à jour d’un pays (admin)
export const updateCountry = async (req, res) => {
  const { id } = req.params;
  const { name, code, phone_prefix, currency_id, is_active } = req.body;
  try {
    const updatedCountry = await updateCountryById(id, name, code, phone_prefix, currency_id, is_active);
    if (!updatedCountry) {
      return res.status(404).json({ message: 'Pays non trouvé' });
    }
    res.json({ message: 'Pays mis à jour avec succès', country: updatedCountry });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du pays', error: error.message });
  }
};

// 📌 Suppression d’un pays (admin)
export const deleteCountry = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCountry = await deleteCountryById(id);
    if (!deletedCountry) {
      return res.status(404).json({ message: 'Pays non trouvé' });
    }
    res.json({ message: 'Pays supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du pays', error: error.message });
  }
};
