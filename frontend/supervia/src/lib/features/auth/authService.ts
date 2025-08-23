/**
 * Service d'authentification SupervIA Frontend
 * 
 * Gère l'authentification utilisateur avec JWT, localStorage et décodage de tokens.
 * Supporte l'inscription, connexion et gestion de session côté client.
 * 
 * @author SupervIA Team
 * @version 1.0.0
 */

// src/lib/features/auth/authService.ts
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3002/auth';

export interface RegisterData {
  name?: string;
  email: string;
  password?: string;
}

export interface LoginData {
  email: string;
  password?: string;
}

/**
 * Inscription d'un nouvel utilisateur
 * @param {RegisterData} userData - Données d'inscription
 * @returns {Promise<any>} Réponse du serveur avec utilisateur créé
 */
const register = async (userData: RegisterData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

/**
 * Connexion utilisateur avec sauvegarde du token
 * @param {LoginData} userData - Identifiants de connexion
 * @returns {Promise<{user: any, token: string}>} Utilisateur et token JWT
 */
const login = async (userData: LoginData) => {
  const response = await axios.post(`${API_URL}/login`, userData);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    
    const decoded: { id: number; email: string, name?: string } = jwtDecode(response.data.token);
    const user = { id: decoded.id, email: decoded.email, name: decoded.name };

    return { user, token: response.data.token };
  }
  return response.data;
};

/**
 * Déconnexion utilisateur avec nettoyage du localStorage
 * @returns {void}
 */
const logout = () => {
  localStorage.removeItem('token');
};

const authService = {
  register,
  login,
  logout,
};

export default authService;
