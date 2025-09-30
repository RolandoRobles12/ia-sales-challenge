
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, ShieldCheck } from 'lucide-react';
import Header from '@/components/layout/header';
import { Product, Mode } from '@/types';

// Tipos simples para el estado local, evitando objetos complejos de Firebase.
type EventData = {
  id: string;
  name: string;
  code: string;
};

type RoundData = {
  id: string;
  product: Product;
  mode: Mode;
  durationPitch: number;
  durationQnA: number;
};

const products: Product[] = ['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra'];
const modes: Mode[] = ['Curioso', 'Desconfiado', 'Apurado'];

function generateEventCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [eventName, setEventName] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  const [roundProduct, setRoundProduct] = useState<Product>('Aviva Contigo');
  const [roundMode, setRoundMode] = useState<Mode>('Curioso');
  const [pitchDuration, setPitchDuration] = useState(120);
  const [qnaDuration, setQnaDuration] = useState(60);
  const [isAddingRound, setIsAddingRound] = useState(false);

  // Fetch de eventos existentes
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'events');
  }, [firestore]);
  const { data: events, isLoading: isLoadingEvents } = useCollection<EventData>(eventsQuery);

  // Fetch de rondas para el evento seleccionado
  const roundsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEvent) return null;
    return collection(firestore, `events/${selectedEvent.id}/rounds`);
  }, [firestore, selectedEvent]);
  const { data: rounds, isLoading: isLoadingRounds } = useCollection<RoundData>(roundsQuery);

  const handleCreateEvent = async () => {
    if (!eventName.trim() || !firestore) return;
    setIsCreatingEvent(true);
    const newEventCode = generateEventCode();
    const newEventData = {
      name: eventName,
      code: newEventCode,
      createdBy: 'admin', // Hardcodeado porque no hay auth
      startsAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(firestore, 'events'), newEventData);
      
      // Documentos dummy para asegurar que las subcolecciones existan para las reglas
      await setDoc(doc(firestore, `events/${docRef.id}/rounds/--init--`), {});
      await setDoc(doc(firestore, `events/${docRef.id}/participants/--init--`), {});
      await setDoc(doc(firestore, `events/${docRef.id}/scores/--init--`), {});

      toast({ title: 'Evento Creado', description: `El evento "${eventName}" ha sido creado con el código: ${newEventCode}` });
      setEventName('');

      // Objeto serializable y plano para el estado de React
      const createdEventForState: EventData = {
        id: docRef.id,
        name: newEventData.name,
        code: newEventData.code,
      };
      // Establecer el evento recién creado como seleccionado para habilitar el panel derecho
      setSelectedEvent(createdEventForState);

    } catch (error) {
      console.error("Error creating event:", error);
      toast({ variant: 'destructive', title: 'Error al crear evento' });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleAddRound = async () => {
    if (!firestore || !selectedEvent) return;
    setIsAddingRound(true);
    const newRound = {
      eventId: selectedEvent.id,
      product: roundProduct,
      mode: roundMode,
      durationPitch: pitchDuration,
      durationQnA: qnaDuration,
    };
    try {
      await addDoc(collection(firestore, `events/${selectedEvent.id}/rounds`), newRound);
      toast({ title: 'Ronda Añadida', description: `Nueva ronda de ${roundProduct} añadida al evento.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error al añadir ronda' });
    } finally {
      setIsAddingRound(false);
    }
  };

  const isConfigEnabled = !!selectedEvent;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-bold">Panel de Administración</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sección de Eventos */}
          <Card>
            <CardHeader>
              <CardTitle>Eventos de Competencia</CardTitle>
              <CardDescription>Crea un nuevo evento o selecciona uno existente para gestionarlo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="event-name">Nombre del Nuevo Evento</Label>
                <div className="flex gap-2">
                  <Input
                    id="event-name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ej: Competencia Trimestral Q3"
                  />
                  <Button onClick={handleCreateEvent} disabled={isCreatingEvent || !eventName.trim()}>
                    {isCreatingEvent ? <Loader2 className="animate-spin" /> : 'Crear'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-select">Seleccionar Evento Existente</Label>
                <Select onValueChange={(eventId) => setSelectedEvent(events?.find(e => e.id === eventId) || null)} value={selectedEvent?.id ?? ''}>
                  <SelectTrigger id="event-select">
                    <SelectValue placeholder="Elige un evento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingEvents ? <Loader2 className="mx-auto my-4 animate-spin" /> :
                      events?.map(event => (
                        <SelectItem key={event.id} value={event.id}>{event.name} (Código: {event.code})</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Rondas */}
          <Card className={!isConfigEnabled ? 'bg-muted/50 pointer-events-none opacity-50' : ''}>
            <CardHeader>
              <CardTitle>Configurar Rondas</CardTitle>
              <CardDescription>
                {selectedEvent ? `Añade y gestiona las rondas para "${selectedEvent.name}"` : 'Selecciona un evento para empezar a configurar las rondas.'}
              </CardDescription>
            </CardHeader>
            {isConfigEnabled && (
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Rondas Actuales</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {isLoadingRounds ? <Loader2 className="animate-spin"/> :
                      rounds && rounds.filter(r => r.id !== '--init--').length > 0 ? (
                        rounds.filter(r => r.id !== '--init--').map(round => (
                          <div key={round.id} className="text-sm p-2 bg-secondary rounded-md">
                            Ronda de {round.product} ({round.mode}) - Pitch: {round.durationPitch}s, Q&A: {round.durationQnA}s
                          </div>
                        ))
                      ) : <p className="text-sm text-muted-foreground">No hay rondas configuradas.</p>
                    }
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold">Añadir Nueva Ronda</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Producto</Label>
                      <Select value={roundProduct} onValueChange={(v) => setRoundProduct(v as Product)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modo Cliente</Label>
                      <Select value={roundMode} onValueChange={(v) => setRoundMode(v as Mode)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duración Pitch (seg)</Label>
                      <Input type="number" value={pitchDuration} onChange={e => setPitchDuration(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duración Q&A (seg)</Label>
                      <Input type="number" value={qnaDuration} onChange={e => setQnaDuration(Number(e.target.value))} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleAddRound} disabled={isAddingRound}>
                    {isAddingRound ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                    Añadir Ronda
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
