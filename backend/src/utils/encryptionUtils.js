// utils/encryptionUtils.js
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || 'votre-cle-32-caracteres-123456789012';
const ivLength = 16;

export const encryptId = (text) => {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(ivLength);
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Erreur chiffrement:', error);
    throw new Error('Erreur lors du chiffrement de l\'ID');
  }
};

export const decryptId = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Format encrypted invalide');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Erreur déchiffrement:', error);
    throw new Error('Impossible de décrypter l\'ID');
  }
};

export const isEncryptedId = (str) => {
  if (typeof str !== 'string') return false;
  return /^[0-9a-fA-F]{32}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(str);
};