'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Swords, Loader2 } from "lucide-react";
import Link from "next/link";
import Header from "@/components/layout/header";
import { useUser } from "@/firebase";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirigir a login si no hay usuario
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Mostrar loader mientras verifica autenticación
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

  // Si no hay usuario, mostrar loader mientras redirige
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // Usuario autenticado - mostrar página principal
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
          <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-0">
            <CardHeader>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight">
                Véndele a la IA – Aviva
              </h1>
              <CardDescription className="text-lg md:text-xl text-foreground/80 pt-2">
                Compite y perfecciona tu discurso de venta interactuando con nuestro avatar de IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="font-bold text-lg w-full sm:w-auto">
                <Link href="/practice">
                  <Mic className="mr-2 h-5 w-5" />
                  Practicar
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-bold text-lg w-full sm:w-auto">
                <Link href="/competition">
                  <Swords className="mr-2 h-5 w-5" />
                  Ir a la Competencia
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-foreground/60">
        <p>&copy; {new Date().getFullYear()} Aviva Sales Challenge. Una simulación de ventas.</p>
      </footer>
    </div>
  );
}