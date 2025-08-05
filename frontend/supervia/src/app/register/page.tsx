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
import { toast } from 'sonner';
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <CardTitle className="text-2xl mt-4">Inscription Réussie !</CardTitle>
            <CardDescription>
              Votre compte a été créé avec succès.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-sm font-medium text-blue-800">
                    Un email de bienvenue vous a été envoyé !
                  </h3>
                  <p className="text-sm text-blue-700">
                    Consultez votre boîte de réception pour découvrir les fonctionnalités de SupervIA.
                  </p>
                </div>
              </div>
            </div>
            <Link href="/login">
              <Button className="w-full">
                Se connecter
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sinon, on affiche le formulaire d'inscription
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">S&apos;inscrire</CardTitle>
          <CardDescription>Entrez vos informations pour créer un compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" {...registerForm('name')} />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...registerForm('email')} />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" {...registerForm('password')} />
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Création du compte...' : 'Créer un compte'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Déjà un compte?{' '}
            <Link href="/login" className="underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
