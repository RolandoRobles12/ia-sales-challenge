'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/layout/header";
import PracticeContainer from "@/components/practice/practice-container";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

export default function PracticePage() {
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

  // Usuario autenticado - mostrar página de práctica
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <PracticeContainer />
      </main>
    </div>
  );
}