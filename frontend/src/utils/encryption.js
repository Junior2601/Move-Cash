import CryptoJS from 'crypto-js';

// Clé fixe pour le développement - À CHANGER EN PRODUCTION
const SECRET_KEY = 'my-super-secure-encryption-key-2024-change-in-production';

export const encryptId = (id) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(id.toString(), SECRET_KEY).toString();
    return encodeURIComponent(encrypted);
  } catch (error) {
    console.error('Erreur chiffrement:', error);
    return null;
  }
};

export const decryptId = (encryptedId) => {
  try {
    const decoded = decodeURIComponent(encryptedId);
    const bytes = CryptoJS.AES.decrypt(decoded, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted ? parseInt(decrypted, 10) : null;
  } catch (error) {
    console.error('Erreur déchiffrement:', error);
    return null;
  }
};