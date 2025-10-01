'use client';

import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import { ShieldCheck, BarChart3, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const logo = PlaceHolderImages.find(p => p.id === 'aviva-logo');
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cerrar sesión',
      });
    }
  };

  return (
    <header className={cn("p-4 flex justify-between items-center border-b")}>
      <Link href="/" className="flex items-center gap-3 w-fit">
        {logo && (
          <Image
            src={logo.imageUrl}
            alt={logo.description}
            data-ai-hint={logo.imageHint}
            width={120}
            height={40}
            className="object-contain"
          />
        )}
      </Link>
      
      <div className="flex items-center gap-2">
        {/* Botón Admin Stats */}
        <Button asChild variant="outline" size="sm">
          <Link href="/admin-stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </Button>

        {/* Botón Admin (Config) */}
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <ShieldCheck className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Config</span>
          </Link>
        </Button>

        {/* Menú de Usuario */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Usuario'} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user.displayName || user.email || 'Invitado'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/competition">
                  Competencia
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/practice">
                  Práctica
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!user && (
          <Button asChild size="sm">
            <Link href="/login">
              Iniciar Sesión
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;