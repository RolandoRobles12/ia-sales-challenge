'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/header';
import { useAuth, useUser } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ALLOWED_DOMAIN = '@avivacredito.com';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/competition');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage('');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: 'avivacredito.com', // Hint para Google - dominio específico
      });
      
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      
      // Validar dominio
      if (!email || !email.endsWith(ALLOWED_DOMAIN)) {
        // Cerrar sesión si el dominio no es válido
        await auth.signOut();
        setErrorMessage(`Solo se permite acceso con correos ${ALLOWED_DOMAIN}`);
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: `Solo empleados de Aviva con correo ${ALLOWED_DOMAIN} pueden acceder.`,
        });
        setIsLoggingIn(false);
        return;
      }

      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente',
      });
      router.push('/competition');
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      
      // Manejar cancelación del usuario
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Inicio de sesión cancelado');
      } else {
        setErrorMessage(error.message || 'No se pudo iniciar sesión con Google');
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo iniciar sesión con Google',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center">
              Acceso exclusivo para empleados de Aviva Crédito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTitle>Error de Autenticación</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Alert>
                <AlertTitle>Requisitos de Acceso</AlertTitle>
                <AlertDescription>
                  Solo se permite el acceso con cuentas de Google corporativas ({ALLOWED_DOMAIN})
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                variant="default"
                size="lg"
                className="w-full"
              >
                {isLoggingIn ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continuar con Google Aviva
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Al continuar, confirmas que eres empleado de Aviva Crédito y que tu acceso está autorizado.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}