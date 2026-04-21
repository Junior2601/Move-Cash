import { expireOldTransactions } from '../models/transaction.repository.js';
import { pool } from '../config/db.js';

/**
 * Service de nettoyage des transactions expirées
 */
export class CleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Démarrer le service de nettoyage
   * @param {number} intervalMinutes - Intervalle en minutes
   */
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      console.log('Service de nettoyage déjà démarré');
      return;
    }

    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    this.intervalId = setInterval(async () => {
      try {
        console.log('🚀 Début du nettoyage des transactions expirées...');
        const result = await expireOldTransactions();
        
        if (result.expiredCount > 0) {
          console.log(`✅ Nettoyage terminé: ${result.expiredCount} transactions expirées`);
        } else {
          console.log('✅ Aucune transaction à expirer');
        }
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
      }
    }, intervalMs);

    console.log(`🔄 Service de nettoyage démarré (vérification toutes les ${intervalMinutes} minutes)`);
    
    // Exécuter immédiatement au démarrage
    this.runCleanup();
  }

  /**
   * Exécuter manuellement le nettoyage
   */
async runCleanup() {
  let retries = 3;
  
  while (retries > 0) {
    try {
      const result = await expireOldTransactions();
      console.log(`🧹 Nettoyage manuel: ${result.expiredCount} transactions expirées`);
      return result;
    } catch (error) {
      retries--;
      console.error(`❌ Erreur lors du nettoyage (tentatives restantes: ${retries}):`, error.message);
      
      if (retries === 0) {
        console.error('❌ Échec définitif du nettoyage');
        // Ne pas throw pour éviter le crash complet
        return { expiredCount: 0, error: error.message };
      }
      
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

  /**
   * Arrêter le service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('⏹️ Service de nettoyage arrêté');
    }
  }

  /**
   * Vérifier si le service est en cours d'exécution
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.intervalId ? new Date(Date.now() + (5 * 60 * 1000)) : null
    };
  }
}

// Instance singleton
export const cleanupService = new CleanupService();