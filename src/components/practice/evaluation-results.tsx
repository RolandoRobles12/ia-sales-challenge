import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  TrendingUp, 
  Lightbulb, 
  Target, 
  Heart, 
  MessageSquare, 
  CheckCircle, 
  Star 
} from 'lucide-react';

interface PitchEvaluation {
  greeting: number;
  needIdentification: number;
  productPresentation: number;
  benefitsCommunication: number;
  objectionHandling: number;
  closing: number;
  empathy: number;
  clarity: number;
  overallScore: number;
  feedback: string;
}

interface EvaluationResultsProps {
  evaluation: PitchEvaluation;
  customerName: string;
  product: string;
}

export default function EvaluationResults({ evaluation, customerName, product }: EvaluationResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return 'Excelente';
    if (score >= 8) return 'Muy Bueno';
    if (score >= 7) return 'Bueno';
    if (score >= 6) return 'Aceptable';
    if (score >= 5) return 'Regular';
    return 'Necesita Mejorar';
  };

  const criteria = [
    { key: 'greeting', label: 'Saludo', icon: MessageSquare, value: evaluation.greeting },
    { key: 'needIdentification', label: 'Identificación de Necesidades', icon: Target, value: evaluation.needIdentification },
    { key: 'productPresentation', label: 'Presentación del Producto', icon: Star, value: evaluation.productPresentation },
    { key: 'benefitsCommunication', label: 'Comunicación de Beneficios', icon: TrendingUp, value: evaluation.benefitsCommunication },
    { key: 'objectionHandling', label: 'Manejo de Objeciones', icon: CheckCircle, value: evaluation.objectionHandling },
    { key: 'closing', label: 'Cierre', icon: Trophy, value: evaluation.closing },
    { key: 'empathy', label: 'Empatía', icon: Heart, value: evaluation.empathy },
    { key: 'clarity', label: 'Claridad', icon: Lightbulb, value: evaluation.clarity },
  ];

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Puntuación General */}
      <Card className="border-2 border-primary">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-headline">Resultados de tu Pitch</CardTitle>
          <CardDescription>
            Cliente: {customerName} • Producto: {product}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${(evaluation.overallScore / 10) * 351.86} 351.86`}
                  className={getScoreColor(evaluation.overallScore)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{evaluation.overallScore.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">/ 10</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {getScoreLabel(evaluation.overallScore)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Desglose por Criterios */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose Detallado</CardTitle>
          <CardDescription>Evaluación por criterio (1-10)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {criteria.map(({ key, label, icon: Icon, value }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <span className={`font-bold ${getScoreColor(value)}`}>
                  {value.toFixed(1)}
                </span>
              </div>
              <Progress value={value * 10} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Retroalimentación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Retroalimentación del Experto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {evaluation.feedback}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Pasos */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">¿Qué sigue?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ Revisa las áreas donde obtuviste menor puntuación</p>
          <p>✅ Practica nuevamente con un nivel de dificultad mayor</p>
          <p>✅ Compara tu pitch con los mejores en la competencia</p>
          <p>✅ ¡Sigue mejorando tus habilidades de venta!</p>
        </CardContent>
      </Card>
    </div>
  );
}