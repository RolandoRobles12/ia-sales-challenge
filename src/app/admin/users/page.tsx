'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { Loader2, Shield, ShieldOff, Trash2, UserPlus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { isAdmin, isLoadingRole } = useUserRole();
  const { toast } = useToast();

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Query para obtener todos los perfiles de usuario
  const userProfilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'userProfiles');
  }, [firestore]);

  const { data: userProfiles, isLoading: isLoadingProfiles } = useCollection<UserProfile>(userProfilesQuery);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newAdminEmail.trim()) return;

    setIsAdding(true);
    try {
      // Crear un ID temporal basado en el email (en producción usarías Cloud Functions)
      const sanitizedEmail = newAdminEmail.toLowerCase().trim();
      const tempUserId = sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_');

      await setDoc(doc(firestore, 'userProfiles', tempUserId), {
        uid: tempUserId,
        email: sanitizedEmail,
        displayName: sanitizedEmail.split('@')[0],
        role: 'admin',
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Admin agregado',
        description: `${sanitizedEmail} ahora es administrador`,
      });

      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo agregar el administrador',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    if (!firestore) return;

    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      await setDoc(doc(firestore, 'userProfiles', userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({
        title: 'Rol actualizado',
        description: `El usuario ahora es ${newRole === 'admin' ? 'administrador' : 'usuario normal'}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el rol',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!firestore) return;

    try {
      await deleteDoc(doc(firestore, 'userProfiles', userId));
      toast({
        title: 'Usuario eliminado',
        description: 'El perfil de usuario ha sido eliminado',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
      });
    }
  };

  if (isLoadingRole) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acceso Denegado</AlertTitle>
            <AlertDescription>
              No tienes permisos para acceder a esta página. Solo los administradores pueden gestionar usuarios.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestión de Administradores
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los roles de los usuarios del sistema
          </p>
        </div>

        {/* Formulario para agregar admin */}
        <Card>
          <CardHeader>
            <CardTitle>Agregar Nuevo Administrador</CardTitle>
            <CardDescription>
              Ingresa el email del usuario que quieres convertir en administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="adminEmail" className="sr-only">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  disabled={isAdding}
                />
              </div>
              <Button type="submit" disabled={!newAdminEmail.trim() || isAdding}>
                {isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Agregar Admin
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios del Sistema</CardTitle>
            <CardDescription>
              {userProfiles?.length || 0} usuario(s) registrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProfiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !userProfiles || userProfiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay usuarios registrados aún
              </p>
            ) : (
              <div className="space-y-2">
                {userProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {profile.displayName || profile.email || 'Usuario sin nombre'}
                        </p>
                        <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                          {profile.role === 'admin' ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            'Usuario'
                          )}
                        </Badge>
                        {profile.uid === user?.uid && (
                          <Badge variant="outline">Tú</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.email || 'Sin email'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRole(profile.id, profile.role)}
                        disabled={profile.uid === user?.uid}
                      >
                        {profile.role === 'admin' ? (
                          <>
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Quitar Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Hacer Admin
                          </>
                        )}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={profile.uid === user?.uid}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el perfil de usuario de {profile.email}.
                              Esto no eliminará su cuenta de autenticación.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(profile.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nota Importante</AlertTitle>
          <AlertDescription>
            Los roles se asignan manualmente desde esta página. En producción, considera usar Cloud Functions
            para validar emails y asignar roles automáticamente cuando los usuarios se registran.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
}