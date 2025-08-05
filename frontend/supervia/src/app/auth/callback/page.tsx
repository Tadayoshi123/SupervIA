// frontend/supervia/src/app/auth/callback/page.tsx
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/lib/hooks';
import { setCredentials } from '@/lib/features/auth/authSlice';
import { toast } from 'sonner';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error(decodeURIComponent(error) || "L&apos;authentification a échoué. Veuillez réessayer.");
      router.push('/login');
      return;
    }

    if (token) {
      dispatch(setCredentials({ token }));
      toast.success('Vous êtes maintenant connecté !');
      router.push('/dashboard');
    } else {
      // Ce cas peut arriver si le callback est appelé sans token ni erreur, ce qui est anormal.
      toast.error('Token manquant. Impossible de finaliser la connexion.');
      router.push('/login');
    }
  }, [router, searchParams, dispatch]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg">Finalisation de la connexion...</p>
        {/* Vous pouvez ajouter un spinner ici */}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
      <AuthCallback />
    </Suspense>
  );
}
