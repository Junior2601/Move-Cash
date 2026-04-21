import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Middleware pour vérifier le token admin
export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé : réservé aux admins' });
    }

    req.user = user;
    next();
  });
};

// Middleware pour vérifier le token agent
export const verifyAgentToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });

    if (user.role !== 'agent') {
      return res.status(403).json({ message: 'Accès refusé : réservé aux agents' });
    }

    req.user = user;
    next();
  });
};

// NOUVEAU : Middleware admin OU agent
export const verifyAdminOrAgentToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && decoded.role !== 'agent') {
      return res.status(403).json({ message: 'Accès refusé. Rôle non autorisé.' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};

export const verifySemiAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });

    if (user.role !== 'semi_admin') {
      return res.status(403).json({ message: 'Accès refusé : réservé aux semi-admins' });
    }

    req.user = user;
    next();
  });
};

// Middleware pour admin OU semi-admin
export const verifyAdminOrSemiAdminToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && decoded.role !== 'semi_admin') {
      return res.status(403).json({ message: 'Accès refusé. Rôle non autorisé.' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};