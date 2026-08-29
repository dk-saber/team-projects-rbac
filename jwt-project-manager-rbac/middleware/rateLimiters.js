const rateLimit = require('express-rate-limit');

/**
 * Limite les demandes de réinitialisation de mot de passe par IP :
 * évite le spam d'e-mails et le "user enumeration" par force brute.
 * 5 requêtes / 15 min / IP, alignée sur la durée de vie du jeton.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Trop de demandes de réinitialisation. Veuillez réessayer plus tard.'
  }
});

/**
 * Limite les tentatives de soumission du nouveau mot de passe par IP :
 * ralentit le brute-force sur le jeton lui-même (32 octets aléatoires,
 * donc déjà quasi impossible à deviner, mais on ajoute une couche).
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Trop de tentatives. Veuillez réessayer plus tard.'
  }
});

/**
 * Limite les tentatives de connexion par IP : protège contre le brute-force
 * sur les mots de passe des comptes existants.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.'
  }
});

module.exports = {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter
};
