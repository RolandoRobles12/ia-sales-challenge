'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import type { StarRating, WordCloudEntry, GroupNumber } from "@/types";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Lock, Unlock, BarChart3, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const GROUPS: GroupNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];

interface VotingConfig {
  isOpen: boolean;
  closeTime?: any;
  openTime?: any;
}

export default function AdminStatsPage() {
  const firestore = useFirestore();
  const toast = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [closeDateTime, setCloseDateTime] = useState('');

  // Queries
  const ratingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "starRatings");
  }, [firestore]);

  const wordCloudQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "wordCloud");
  }, [firestore]);

  const { data: allRatings, isLoading: isLoadingRatings } = useCollection<StarRating>(ratingsQuery);
  const { data: allWords, isLoading: isLoadingWords } = useCollection<WordCloudEntry>(wordCloudQuery);

  // Configuración de votación
  const [votingConfig, setVotingConfig] = useState<VotingConfig | null>(null);

  // Cargar configuración de votación
  useEffect(() => {
    if (!firestore) return;
    
    const loadVotingConfig = async () => {
      const configDoc = await getDoc(doc(firestore, 'config', 'voting'));
      if (configDoc.exists()) {
        setVotingConfig(configDoc.data() as VotingConfig);
      } else {
        setVotingConfig({ isOpen: true });
      }
    };
    
    loadVotingConfig();
  }, [firestore]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const groupStats: Record<GroupNumber, {
      ratings: number[];
      averageStars: number;
      totalRatings: number;
      words: { word: string; count: number }[];
      totalWords: number;
      uniqueVoters: Set<string>;
    }> = {} as any;

    GROUPS.forEach(groupNum => {
      groupStats[groupNum] = {
        ratings: [],
        averageStars: 0,
        totalRatings: 0,
        words: [],
        totalWords: 0,
        uniqueVoters: new Set(),
      };
    });

    // Procesar calificaciones
    if (allRatings) {
      allRatings.forEach(rating => {
        const group = groupStats[rating.groupNumber];
        group.ratings.push(rating.stars);
        group.totalRatings++;
        group.uniqueVoters.add(rating.userId);
        group.averageStars += rating.stars;
      });

      GROUPS.forEach(groupNum => {
        const group = groupStats[groupNum];
        if (group.totalRatings > 0) {
          group.averageStars /= group.totalRatings;
        }
      });
    }

    // Procesar palabras
    if (allWords) {
      const wordCounts: Record<GroupNumber, Record<string, number>> = {} as any;
      
      GROUPS.forEach(groupNum => {
        wordCounts[groupNum] = {};
      });

      allWords.forEach(entry => {
        const word = entry.word.toLowerCase();
        if (!wordCounts[entry.groupNumber][word]) {
          wordCounts[entry.groupNumber][word] = 0;
        }
        wordCounts[entry.groupNumber][word]++;
        groupStats[entry.groupNumber].totalWords++;
        groupStats[entry.groupNumber].uniqueVoters.add(entry.userId);
      });

      GROUPS.forEach(groupNum => {
        groupStats[groupNum].words = Object.entries(wordCounts[groupNum])
          .map(([word, count]) => ({ word, count }))
          .sort((a, b) => b.count - a.count);
      });
    }

    return groupStats;
  }, [allRatings, allWords]);

  // Controlar votación
  const handleToggleVoting = async (open: boolean) => {
    if (!firestore) return;
    setIsUpdating(true);

    try {
      const configData: VotingConfig = {
        isOpen: open,
        ...(open ? { openTime: serverTimestamp() } : { closeTime: serverTimestamp() })
      };

      await setDoc(doc(firestore, 'config', 'voting'), configData);
      setVotingConfig(configData);

      toast.toast({
        title: open ? 'Votación Abierta' : 'Votación Cerrada',
        description: open 
          ? 'Los usuarios ahora pueden votar'
          : 'Los usuarios ya no pueden votar',
      });
    } catch (error) {
      console.error('Error updating voting config:', error);
      toast.toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScheduleClose = async () => {
    if (!firestore || !closeDateTime) return;
    setIsUpdating(true);

    try {
      const closeDate = new Date(closeDateTime);
      await setDoc(doc(firestore, 'config', 'voting'), {
        isOpen: true,
        closeTime: closeDate,
        openTime: serverTimestamp(),
      });

      toast.toast({
        title: 'Cierre Programado',
        description: `La votación se cerrará el ${closeDate.toLocaleString('es-MX')}`,
      });
    } catch (error) {
      console.error('Error scheduling close:', error);
      toast.toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo programar el cierre',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Exportar resultados
  const exportResults = () => {
    const csvData = [];
    
    // Headers
    csvData.push(['Grupo', 'Promedio Estrellas', 'Total Votos', 'Votantes Únicos', 'Palabras Más Mencionadas (Top 5)']);
    
    // Data
    GROUPS.forEach(groupNum => {
      const group = stats[groupNum];
      const topWords = group.words.slice(0, 5).map(w => `${w.word}(${w.count})`).join(', ');
      
      csvData.push([
        `Grupo ${groupNum}`,
        group.averageStars.toFixed(2),
        group.totalRatings.toString(),
        group.uniqueVoters.size.toString(),
        topWords
      ]);
    });

    // Convertir a CSV
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `resultados_competencia_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.toast({
      title: 'Exportación Exitosa',
      description: 'Los resultados se han descargado en formato CSV',
    });
  };

  if (isLoadingRatings || isLoadingWords) {
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
      <main className="flex-1 container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Dashboard Administrativo
            </h1>
            <p className="text-muted-foreground mt-1">
              Estadísticas y control de votación
            </p>
          </div>
          <Button onClick={exportResults} size="lg">
            <Download className="mr-2 h-5 w-5" />
            Exportar Resultados
          </Button>
        </div>

        {/* Control de Votación */}
        <Card>
          <CardHeader>
            <CardTitle>Control de Votación</CardTitle>
            <CardDescription>
              Administra el periodo de votación de la competencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Estado Actual:</span>
                  <Badge variant={votingConfig?.isOpen ? "default" : "secondary"}>
                    {votingConfig?.isOpen ? (
                      <>
                        <Unlock className="h-3 w-3 mr-1" />
                        Abierta
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Cerrada
                      </>
                    )}
                  </Badge>
                </div>
                {votingConfig?.closeTime && (
                  <p className="text-sm text-muted-foreground">
                    Cierre programado: {new Date(votingConfig.closeTime.toDate()).toLocaleString('es-MX')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleToggleVoting(!votingConfig?.isOpen)}
                  disabled={isUpdating}
                  variant={votingConfig?.isOpen ? "destructive" : "default"}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : votingConfig?.isOpen ? (
                    <Lock className="mr-2 h-4 w-4" />
                  ) : (
                    <Unlock className="mr-2 h-4 w-4" />
                  )}
                  {votingConfig?.isOpen ? 'Cerrar Votación' : 'Abrir Votación'}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="closeDateTime" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Programar Cierre Automático
              </Label>
              <div className="flex gap-2">
                <Input
                  id="closeDateTime"
                  type="datetime-local"
                  value={closeDateTime}
                  onChange={(e) => setCloseDateTime(e.target.value)}
                  disabled={isUpdating}
                />
                <Button
                  onClick={handleScheduleClose}
                  disabled={!closeDateTime || isUpdating}
                >
                  Programar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas por Grupo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {GROUPS.map(groupNum => {
            const group = stats[groupNum];
            
            return (
              <Card key={groupNum}>
                <CardHeader>
                  <CardTitle>Grupo {groupNum}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Promedio</p>
                    <p className="text-2xl font-bold">
                      {group.averageStars > 0 ? group.averageStars.toFixed(2) : '-'} ⭐
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Votos</p>
                      <p className="font-semibold">{group.totalRatings}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Palabras</p>
                      <p className="font-semibold">{group.totalWords}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Participantes</p>
                      <p className="font-semibold">{group.uniqueVoters.size}</p>
                    </div>
                  </div>
                  {group.words.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Top Palabras:</p>
                      <div className="flex flex-wrap gap-1">
                        {group.words.slice(0, 3).map(w => (
                          <Badge key={w.word} variant="outline" className="text-xs">
                            {w.word} ({w.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resumen Global */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {allRatings?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Votos Estrellas</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {allWords?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Palabras</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {new Set([
                    ...(allRatings?.map(r => r.userId) || []),
                    ...(allWords?.map(w => w.userId) || [])
                  ]).size}
                </p>
                <p className="text-sm text-muted-foreground">Participantes Únicos</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {(GROUPS.reduce((acc, g) => acc + stats[g].averageStars, 0) / GROUPS.length).toFixed(2) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Promedio General</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}