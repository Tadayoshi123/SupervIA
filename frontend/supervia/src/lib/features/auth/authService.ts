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

// Register user
const register = async (userData: RegisterData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

// Login user
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

// Logout user
const logout = () => {
  localStorage.removeItem('token');
};

const authService = {
  register,
  login,
  logout,
};

export default authService;
