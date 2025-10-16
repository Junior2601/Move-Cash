// middlewares/idTransformer.js
import { encryptId, decryptId, isEncryptedId } from '../utils/encryptionUtils.js';

// Liste des mots-clés réservés qui ne doivent pas être transformés
const RESERVED_KEYWORDS = [
  'all-transactions', 'stats', 'dashboard', 'agent', 'admin', 
  'tracking', 'redirect', 'redirections', 'validate', 'cancel',
  'gains', 'history'
];

// Middleware pour transformer les IDs dans les requêtes
export const transformRequestIds = (req, res, next) => {
  // Éviter de transformer les routes spécifiques
  if (req.params.transaction_id && 
      isEncryptedId(req.params.transaction_id) && 
      !RESERVED_KEYWORDS.includes(req.params.transaction_id)) {
    try {
      req.params.original_transaction_id = req.params.transaction_id;
      req.params.transaction_id = decryptId(req.params.transaction_id);
      console.log('🔐 ID transaction déchiffré:', { 
        encrypted: req.params.original_transaction_id, 
        decrypted: req.params.transaction_id 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: 'ID de transaction invalide' 
      });
    }
  }

  // Transformer redirection_id si présent
  if (req.params.redirection_id && 
      isEncryptedId(req.params.redirection_id) && 
      !RESERVED_KEYWORDS.includes(req.params.redirection_id)) {
    try {
      req.params.original_redirection_id = req.params.redirection_id;
      req.params.redirection_id = decryptId(req.params.redirection_id);
      console.log('🔐 ID redirection déchiffré:', { 
        encrypted: req.params.original_redirection_id, 
        decrypted: req.params.redirection_id 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: 'ID de redirection invalide' 
      });
    }
  }

  // Transformer agent_id si présent dans les params
  if (req.params.agent_id && 
      isEncryptedId(req.params.agent_id) && 
      !RESERVED_KEYWORDS.includes(req.params.agent_id)) {
    try {
      req.params.original_agent_id = req.params.agent_id;
      req.params.agent_id = decryptId(req.params.agent_id);
      console.log('🔐 ID agent déchiffré:', { 
        encrypted: req.params.original_agent_id, 
        decrypted: req.params.agent_id 
      });
    } catch (error) {
      console.warn('Agent ID invalide, continuation sans transformation');
    }
  }

  next();
};

// Middleware pour transformer les IDs dans les réponses
export const transformResponseIds = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && typeof data === 'object') {
      try {
        data = transformObjectIds(data, 'encrypt');
        // Transformer aussi les URLs si elles existent
        data = transformUrls(data, 'encrypt');
      } catch (error) {
        console.error('Erreur transformation réponse:', error);
      }
    }
    originalJson.call(this, data);
  };
  
  next();
};

// Fonction récursive pour transformer les IDs dans les objets
function transformObjectIds(obj, operation) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformObjectIds(item, operation));
  }
  
  // Créer une copie pour éviter la mutation directe
  const transformed = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (let key in transformed) {
    if (transformed.hasOwnProperty(key)) {
      // Transformer les champs _id, transaction_id, etc.
      if ((key === '_id' || 
          key === 'id' || 
          key === 'transaction_id' || 
          key === 'redirection_id' ||
          key === 'agent_id' ||
          key === 'from_agent_id' ||
          key === 'to_agent_id' ||
          key === 'assigned_agent_id' ||
          key === 'authorized_number_id' ||
          key === 'from_country_id' ||
          key === 'to_country_id' ||
          key === 'sender_method_id' ||
          key === 'receiver_method_id' ||
          key.endsWith('_id') ||
          key.endsWith('Id')) && transformed[key]) {
        
        if (operation === 'encrypt') {
          try {
            // Ne pas chiffrer les IDs qui sont déjà chiffrés ou qui sont des mots-clés
            if (typeof transformed[key] === 'string' && 
                !isEncryptedId(transformed[key]) && 
                !RESERVED_KEYWORDS.includes(transformed[key]) &&
                !isNaN(transformed[key])) {
              transformed[key] = encryptId(transformed[key].toString());
            }
          } catch (error) {
            console.warn(`Impossible de chiffrer ${key}:`, error.message);
          }
        } else if (operation === 'decrypt' && isEncryptedId(transformed[key])) {
          try {
            transformed[key] = decryptId(transformed[key]);
          } catch (error) {
            console.warn(`Impossible de déchiffrer ${key}:`, error.message);
          }
        }
      } else if (typeof transformed[key] === 'object' && transformed[key] !== null) {
        transformed[key] = transformObjectIds(transformed[key], operation);
      }
    }
  }
  
  return transformed;
}

// Fonction pour transformer les URLs dans les réponses
function transformUrls(obj, operation) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformUrls(item, operation));
  }
  
  const transformed = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (let key in transformed) {
    if (transformed.hasOwnProperty(key)) {
      // Transformer les URLs qui contiennent des IDs
      if ((key === 'url' || key === 'link' || key.endsWith('_url') || key.endsWith('Url') || key === 'links') && 
          transformed[key] !== null) {
        try {
          if (typeof transformed[key] === 'string') {
            transformed[key] = transformUrlIds(transformed[key], operation);
          } else if (typeof transformed[key] === 'object') {
            transformed[key] = transformUrls(transformed[key], operation);
          }
        } catch (error) {
          console.warn(`Impossible de transformer l'URL ${key}:`, error.message);
        }
      } else if (typeof transformed[key] === 'object' && transformed[key] !== null) {
        transformed[key] = transformUrls(transformed[key], operation);
      }
    }
  }
  
  return transformed;
}

// Fonction pour transformer les IDs dans les URLs
function transformUrlIds(url, operation) {
  if (!url || typeof url !== 'string') return url;
  
  // Détecter les patterns d'URL avec des IDs
  const urlPatterns = [
    /\/transactions\/(\d+)/g,
    /\/redirections\/(\d+)/g,
    /\/agents\/(\d+)/g,
    /transaction_id=(\d+)/g,
    /redirection_id=(\d+)/g,
    /agent_id=(\d+)/g
  ];
  
  let transformedUrl = url;
  
  for (const pattern of urlPatterns) {
    transformedUrl = transformedUrl.replace(pattern, (match, id) => {
      if (operation === 'encrypt') {
        try {
          return match.replace(id, encryptId(id));
        } catch (error) {
          console.warn(`Impossible de chiffrer l'ID dans l'URL: ${id}`);
          return match;
        }
      } else if (operation === 'decrypt' && isEncryptedId(id)) {
        try {
          return match.replace(id, decryptId(id));
        } catch (error) {
          console.warn(`Impossible de déchiffrer l'ID dans l'URL: ${id}`);
          return match;
        }
      }
      return match;
    });
  }
  
  return transformedUrl;
}

// Middleware pour valider les IDs avant transformation
export const validateIds = (req, res, next) => {
  const reservedKeywords = ['all-transactions', 'stats', 'dashboard', 'agent', 'admin', 'tracking'];
  
  if (req.params.transaction_id && reservedKeywords.includes(req.params.transaction_id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de transaction invalide'
    });
  }
  
  if (req.params.redirection_id && reservedKeywords.includes(req.params.redirection_id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de redirection invalide'
    });
  }
  
  next();
};