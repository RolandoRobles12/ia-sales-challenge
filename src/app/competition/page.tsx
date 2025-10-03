'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import type { StarRating, WordCloudEntry, GroupNumber } from "@/types";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Trophy, Lock, Clock } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { GroupRatingCard } from "@/components/competition/star-rating";
import { GroupWordCloudCard } from "@/components/competition/word-cloud";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const GROUPS: GroupNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface VotingConfig {
  isOpen: boolean;
  closeTime?: any;
}

export default function CompetitionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'ratings' | 'wordcloud'>('ratings');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [userVotes, setUserVotes] = useState<Set<GroupNumber>>(new Set());
  const [userWords, setUserWords] = useState<Set<GroupNumber>>(new Set());
  const [isCheckingVotes, setIsCheckingVotes] = useState(true);

  const votingConfigDoc = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'config', 'voting');
  }, [firestore]);

  const { data: votingConfig } = useDoc<VotingConfig>(votingConfigDoc);

  const isVotingOpen = useMemo(() => {
    if (!votingConfig) return true;
    if (!votingConfig.isOpen) return false;
    if (votingConfig.closeTime) {
      const closeDate = new Date(votingConfig.closeTime.toDate());
      return new Date() < closeDate;
    }
    return votingConfig.isOpen;
  }, [votingConfig]);

  useEffect(() => {
    if (!votingConfig?.closeTime) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const closeDate = new Date(votingConfig.closeTime.toDate());
      const now = new Date();
      const diff = closeDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Votación cerrada');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [votingConfig]);

  useEffect(() => {
    if (!firestore || !user) {
      setIsCheckingVotes(false);
      return;
    }

    const checkUserVotes = async () => {
      setIsCheckingVotes(true);
      try {
        const ratingsQuery = query(
          collection(firestore, 'starRatings'),
          where('userId', '==', user.uid)
        );
        const ratingsSnapshot = await getDocs(ratingsQuery);
        const votedGroups = new Set<GroupNumber>();
        ratingsSnapshot.forEach(doc => {
          const data = doc.data() as StarRating;
          votedGroups.add(data.groupNumber);
        });
        setUserVotes(votedGroups);

        const wordsQuery = query(
          collection(firestore, 'wordCloud'),
          where('userId', '==', user.uid)
        );
        const wordsSnapshot = await getDocs(wordsQuery);
        const wordGroups = new Set<GroupNumber>();
        wordsSnapshot.forEach(doc => {
          const data = doc.data() as WordCloudEntry;
          wordGroups.add(data.groupNumber);
        });
        setUserWords(wordGroups);
      } catch (error) {
        console.error('Error checking user votes:', error);
      } finally {
        setIsCheckingVotes(false);
      }
    };

    checkUserVotes();
  }, [firestore, user]);

  const ratingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "starRatings");
  }, [firestore]);

  const { data: allRatings, isLoading: isLoadingRatings } = useCollection<StarRating>(ratingsQuery);

  const wordCloudQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "wordCloud");
  }, [firestore]);

  const { data: allWords, isLoading: isLoadingWords } = useCollection<WordCloudEntry>(wordCloudQuery);

  const groupStats = useMemo(() => {
    const stats: Record<GroupNumber, {
      averageStars: number;
      totalRatings: number;
      userRating?: number;
      words: { word: string; count: number }[];
      hasUserWord: boolean;
    }> = {} as any;

    GROUPS.forEach(groupNum => {
      stats[groupNum] = {
        averageStars: 0,
        totalRatings: 0,
        words: [],
        hasUserWord: false
      };
    });

    if (allRatings) {
      allRatings.forEach(rating => {
        const groupStats = stats[rating.groupNumber];
        groupStats.totalRatings++;
        groupStats.averageStars += rating.stars;
        
        if (user && rating.userId === user.uid) {
          groupStats.userRating = rating.stars;
        }
      });

      GROUPS.forEach(groupNum => {
        if (stats[groupNum].totalRatings > 0) {
          stats[groupNum].averageStars /= stats[groupNum].totalRatings;
        }
      });
    }

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

        if (user && entry.userId === user.uid) {
          stats[entry.groupNumber].hasUserWord = true;
        }
      });

      GROUPS.forEach(groupNum => {
        stats[groupNum].words = Object.entries(wordCounts[groupNum])
          .map(([word, count]) => ({ word, count }))
          .sort((a, b) => b.count - a.count);
      });
    }

    return stats;
  }, [allRatings, allWords, user]);

  const handleRate = async (groupNumber: GroupNumber, stars: 1 | 2 | 3 | 4 | 5) => {
    if (!firestore || !user) return;

    if (!isVotingOpen) {
      toast({
        variant: 'destructive',
        title: 'Votación Cerrada',
        description: 'El periodo de votación ha terminado',
      });
      return;
    }

    if (userVotes.has(groupNumber)) {
      toast({
        variant: 'destructive',
        title: 'Ya votaste',
        description: `Ya has calificado al Grupo ${groupNumber}. Solo se permite un voto por grupo.`,
      });
      return;
    }

    try {
      const ratingId = `${user.uid}_${groupNumber}`;
      
      await setDoc(doc(firestore, 'starRatings', ratingId), {
        groupNumber,
        userId: user.uid,
        stars,
        createdAt: serverTimestamp(),
      });

      setUserVotes(prev => new Set(prev).add(groupNumber));

      toast({
        title: '¡Calificación enviada!',
        description: `Calificaste al Grupo ${groupNumber} con ${stars} estrellas`,
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar tu calificación',
      });
    }
  };

  const handleSubmitWord = async (groupNumber: GroupNumber, word: string) => {
    if (!firestore || !user) return;

    if (!isVotingOpen) {
      toast({
        variant: 'destructive',
        title: 'Votación Cerrada',
        description: 'El periodo de votación ha terminado',
      });
      return;
    }

    if (userWords.has(groupNumber)) {
      toast({
        variant: 'destructive',
        title: 'Ya enviaste palabra',
        description: `Ya has enviado una palabra para el Grupo ${groupNumber}. Solo se permite una palabra por grupo.`,
      });
      return;
    }

    try {
      const wordId = `${user.uid}_${groupNumber}`;
      
      await setDoc(doc(firestore, 'wordCloud', wordId), {
        groupNumber,
        userId: user.uid,
        word: word.trim(),
        createdAt: serverTimestamp(),
      });

      setUserWords(prev => new Set(prev).add(groupNumber));

      toast({
        title: '¡Palabra enviada!',
        description: `Tu palabra "${word}" fue agregada al Grupo ${groupNumber}`,
      });
    } catch (error) {
      console.error('Error submitting word:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar tu palabra',
      });
    }
  };

  const renderContent = () => {
    if (isUserLoading || (user && (isLoadingRatings || isLoadingWords || isCheckingVotes))) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!user) {
      return (
        <div className="text-center text-muted-foreground mt-8 p-8 bg-muted/50 rounded-lg">
          <LogIn className="mx-auto h-12 w-12 text-primary" />
          <h3 className="mt-4 text-lg font-semibold">Inicio de Sesión Requerido</h3>
          <p className="mt-2 text-sm">
            Debes iniciar sesión para calificar y participar en la competencia.
          </p>
          <Button asChild className="mt-4">
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        {!isVotingOpen && (
          <Alert variant="destructive" className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertTitle>Votación Cerrada</AlertTitle>
            <AlertDescription>
              El periodo de votación ha terminado. Los resultados están disponibles abajo.
            </AlertDescription>
          </Alert>
        )}

        {isVotingOpen && timeRemaining && (
          <Alert className="mb-4">
            <Clock className="h-4 w-4" />
            <AlertTitle>Tiempo Restante</AlertTitle>
            <AlertDescription>
              La votación cerrará en: <strong>{timeRemaining}</strong>
            </AlertDescription>
          </Alert>
        )}

        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ratings">Calificaciones</TabsTrigger>
          <TabsTrigger value="wordcloud">Word Cloud</TabsTrigger>
        </TabsList>

        <TabsContent value="ratings" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {GROUPS.map(groupNum => (
              <GroupRatingCard
                key={groupNum}
                groupNumber={groupNum}
                averageStars={groupStats[groupNum].averageStars}
                totalRatings={groupStats[groupNum].totalRatings}
                currentUserRating={groupStats[groupNum].userRating}
                onRate={(stars) => handleRate(groupNum, stars)}
                disabled={!isVotingOpen || userVotes.has(groupNum)}
              />
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Tabla de Clasificación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {GROUPS
                  .map(groupNum => ({
                    groupNum,
                    ...groupStats[groupNum]
                  }))
                  .sort((a, b) => b.averageStars - a.averageStars)
                  .map((group, index) => (
                    <div
                      key={group.groupNum}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground w-8">
                          #{index + 1}
                        </span>
                        <span className="font-semibold">Grupo {group.groupNum}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {group.averageStars > 0 ? group.averageStars.toFixed(2) : '-'} ⭐
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {group.totalRatings} {group.totalRatings === 1 ? 'voto' : 'votos'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wordcloud" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GROUPS.map(groupNum => (
              <GroupWordCloudCard
                key={groupNum}
                groupNumber={groupNum}
                words={groupStats[groupNum].words}
                hasUserSubmitted={userWords.has(groupNum)}
                onSubmit={(word) => handleSubmitWord(groupNum, word)}
                disabled={!isVotingOpen || userWords.has(groupNum)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <Card className="max-w-7xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Competencia de Grupos</CardTitle>
            <CardDescription>
              Califica cada presentación y comparte qué te gustó más (un voto por grupo)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}