import { addHistory } from "../models/history.model.js";

/**
 * Enregistre une action dans l'historique
 */
export const logHistory = async ({
  action_type,
  actor_type,
  actor_id,
  entity_type,
  entity_id,
  description,
  metadata
}) => {
  try {
    await addHistory({
      action_type,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      description,
      metadata
    });
  } catch (error) {
    console.error("Erreur logHistory:", error);
  }
};
