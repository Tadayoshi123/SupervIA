// backend/auth-service/src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const logger = require('./logger');

const DB_SERVICE_URL = process.env.DB_SERVICE_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!DB_SERVICE_URL || !INTERNAL_API_KEY) {
  logger.fatal('DB_SERVICE_URL or INTERNAL_API_KEY is not defined in auth-service. Exiting.');
  process.exit(1);
}

const internalApiConfig = {
  headers: {
    'X-Internal-Api-Key': INTERNAL_API_KEY,
  },
};

const findOrCreateUser = async (profile) => {
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  if (!email) {
    throw new Error("Impossible d'obtenir l'adresse email du fournisseur OAuth.");
  }

  try {
    // 1. Essayer de trouver l'utilisateur par email
    const response = await axios.get(`${DB_SERVICE_URL}/api/users/email/${email}`, internalApiConfig);
    logger.info(`Utilisateur trouvé via OAuth: ${email}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // 2. Si l'utilisateur n'existe pas, le créer
      logger.info(`Utilisateur non trouvé, création d'un nouveau compte pour: ${email}`);
      const newUserPayload = {
        email,
        name: profile.displayName || profile.username,
        // On n'envoie pas de mot de passe
      };
      
      try {
        const createResponse = await axios.post(`${DB_SERVICE_URL}/api/users`, newUserPayload, internalApiConfig);
        logger.info(`Nouvel utilisateur créé avec succès via OAuth: ${email}`);
        return createResponse.data;
      } catch (creationError) {
         logger.error({ err: creationError }, `Erreur lors de la création de l'utilisateur OAuth: ${email}`);
         if (creationError.response && creationError.response.status === 409) {
            // Cette erreur est maintenant plus descriptive grâce au db-service
            throw new Error(creationError.response.data.message || 'Un compte avec cet email existe déjà.');
         }
         throw new Error("Erreur lors de la création de l'utilisateur.");
      }
    }
    
    // Gérer d'autres erreurs possibles venant du db-service
    const errorMessage = error.response?.data?.message || "Erreur lors de la communication avec le service de base de données.";
    logger.error({ err: error }, `Erreur lors de la recherche de l'utilisateur OAuth: ${email}. Message: ${errorMessage}`);
    throw new Error(errorMessage);
  }
};


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3002'}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser(profile);
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3002'}/auth/github/callback`,
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser(profile);
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  // On ne stocke que l'ID dans la session
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    // Cette fonction est surtout utile pour les sessions traditionnelles.
    // Dans notre cas avec JWT, on peut la garder simple.
    // Le plus important est que l'objet `user` soit disponible après le callback OAuth.
    done(null, { id: id });
});
