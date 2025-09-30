
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/header";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, runTransaction } from "firebase/firestore";
import type { Pitch } from "@/types";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from 'next/link';

export default function CompetitionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const pitchesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; // Only query if user is logged in
    return collection(firestore, "pitches");
  }, [firestore, user]);

  const { data: pitches, isLoading: isLoadingPitches, error } = useCollection<Pitch>(pitchesQuery);

  const handleVote = async (pitchId: string, voteType: 'up' | 'down') => {
    if (!firestore || !user) return;

    const pitchRef = doc(firestore, 'pitches', pitchId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const pitchDoc = await transaction.get(pitchRef);
        if (!pitchDoc.exists()) {
          throw new Error("Pitch does not exist!");
        }

        const data = pitchDoc.data() as Pitch;
        let upvotes = data.upvotes || 0;
        let downvotes = data.downvotes || 0;
        const currentVote = data.votes?.[user.uid];

        // Revert previous vote if it exists
        if (currentVote === 'up') upvotes--;
        if (currentVote === 'down') downvotes--;

        // Apply new vote
        let newVoteState: 'up' | 'down' | null = null;
        if (currentVote !== voteType) {
            if (voteType === 'up') upvotes++;
            if (voteType === 'down') downvotes++;
            newVoteState = voteType;
        }
        
        const newVotes = { ...data.votes, [user.uid]: newVoteState };
        if(newVoteState === null) {
            delete newVotes[user.uid];
        }

        transaction.update(pitchRef, { upvotes, downvotes, votes: newVotes });
      });
    } catch (e) {
      console.error("Vote transaction failed: ", e);
    }
  };

  const renderContent = () => {
    if (isUserLoading || (user && isLoadingPitches)) {
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
                    Debes iniciar sesión para ver la competencia y votar.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/login">Ir a Iniciar Sesión</Link>
                </Button>
            </div>
        );
    }

    if (error) {
      return <p className="text-destructive">Error al cargar los pitches.</p>;
    }

    if (!pitches || pitches.length === 0) {
      return <p className="text-muted-foreground">No hay pitches para mostrar todavía.</p>;
    }

    return (
      <div className="space-y-4">
        {pitches.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)).map(pitch => (
          <Card key={pitch.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <p className="font-semibold text-primary">{pitch.product}</p>
                <p className="text-sm mt-1">{pitch.text}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant={pitch.votes?.[user.uid] === 'up' ? 'default' : 'outline'} size="sm" onClick={() => handleVote(pitch.id, 'up')}>
                  <ThumbsUp className="h-4 w-4 mr-2" /> {pitch.upvotes || 0}
                </Button>
                <Button variant={pitch.votes?.[user.uid] === 'down' ? 'destructive' : 'outline'} size="sm" onClick={() => handleVote(pitch.id, 'down')}>
                  <ThumbsDown className="h-4 w-4 mr-2" /> {pitch.downvotes || 0}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Competencia de Votos</CardTitle>
            <CardDescription>
              Aquí puedes ver los discursos de venta de otros participantes y votar por los mejores.
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
