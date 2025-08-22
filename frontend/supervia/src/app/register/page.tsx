// src/app/register/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { register, selectAuthError, selectAuthLoading } from '@/lib/features/auth/authSlice';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }),
  email: z.string().email({ message: 'Adresse email invalide.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const [isRegistrationSuccessful, setIsRegistrationSuccessful] = useState(false);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  const {
    register: registerForm,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormValues) => {
    dispatch(register(data))
      .unwrap()
      .then(() => {
        setIsRegistrationSuccessful(true);
      })
      .catch(() => {
        // L'erreur est déjà gérée par le `useEffect` qui écoute `selectAuthError`,
        // donc nous n'avons pas besoin de la traiter ici à nouveau.
      });
  };
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Si l'inscription est réussie, on affiche un message de confirmation
  if (isRegistrationSuccessful) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"></div>
        
        <div className="max-w-md w-full space-y-8 relative z-10">
          {/* Logo et titre */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center shadow-lg">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Inscription Réussie !
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Votre compte SupervIA a été créé avec succès
            </p>
          </div>

          {/* Carte de succès */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-2xl">
            <CardContent className="p-8 space-y-6">
              {/* Notification email */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <svg className="h-5 w-5 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                    </svg>
                  </div>
                  <div className="ml-3 text-left">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Email de bienvenue envoyé !
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Consultez votre boîte de réception pour découvrir les fonctionnalités de SupervIA.
                    </p>
                  </div>
                </div>
              </div>

              {/* Prochaines étapes */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Prochaines étapes :</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                    Connectez-vous à votre compte
                  </li>
                  <li className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                    Configurez votre premier dashboard
                  </li>
                  <li className="flex items-center">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                    Commencez votre supervision
                  </li>
                </ul>
              </div>

              {/* Bouton d'action */}
              <Link href="/login">
                <Button className="w-full py-3 bg-tech-gradient text-white hover:opacity-90 transition-all duration-200 transform hover:scale-[1.02]">
                  Se connecter maintenant
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Sinon, on affiche le formulaire d'inscription
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo et titre */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-tech-gradient rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Rejoignez SupervIA et commencez à superviser votre infrastructure
          </p>
        </div>

        {/* Formulaire */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom complet
                  </Label>
                  <Input 
                    id="name" 
                    type="text"
                    placeholder="Votre nom"
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-gray-700/50 transition-all duration-200"
                    {...registerForm('name')} 
                  />
                  {errors.name && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse email
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nom@exemple.com"
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-gray-700/50 transition-all duration-200"
                    {...registerForm('email')} 
                  />
                  {errors.email && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mot de passe
                  </Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="••••••••"
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-gray-700/50 transition-all duration-200"
                    {...registerForm('password')} 
                  />
                  {errors.password && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}
                </div>
              </div>

              <div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-tech-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création du compte...
                    </div>
                  ) : (
                    'Créer un compte'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Déjà un compte ?{' '}
                <Link href="/login" className="font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors duration-200">
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
