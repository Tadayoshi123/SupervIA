// backend/db-service/src/controllers/userController.js
const prisma = require('./prisma');

// Récupérer tous les utilisateurs
const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Créer un nouvel utilisateur
const createUser = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // L'email est toujours requis
    if (!email) {
      const error = new Error('Email est requis');
      error.statusCode = 400;
      throw error;
    }

    // Le mot de passe n'est requis que pour l'inscription locale.
    // Pour OAuth, `passport.js` n'envoie pas de mot de passe.
    const dataToCreate = {
      email,
      name,
    };

    if (password) {
      dataToCreate.password = password; // Le mot de passe est déjà haché par l'auth-service
    } else {
      // Pour un utilisateur OAuth, on peut considérer l'email comme vérifié
      dataToCreate.emailVerified = new Date();
    }

    const newUser = await prisma.user.create({
      data: dataToCreate,
    });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    // Gérer le cas où l'email existe déjà (code P2002 chez Prisma)
    if (error.code === 'P2002') {
      error.statusCode = 409;
      error.message = 'Un compte avec cet email existe déjà.';
    }
    next(error);
  }
};

// Récupérer un utilisateur par son email (public: sans mot de passe)
const getUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        // Ne jamais exposer le mot de passe via endpoints publics
      }
    });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Route strictement interne: retourne aussi le hash du mot de passe
const getUserByEmailInternal = async (req, res, next) => {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email },
      // Pas de select => inclut password pour usage interne (auth-service uniquement)
    });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getUserByEmail,
  getUserByEmailInternal,
};
