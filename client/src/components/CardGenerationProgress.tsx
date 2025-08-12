import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';

interface CardGenerationProgressProps {
  progress: number;
  processedCards: number;
  totalCards: number;
  isGenerating: boolean;
}

export function CardGenerationProgress({
  progress,
  processedCards,
  totalCards,
  isGenerating
}: CardGenerationProgressProps) {
  if (!isGenerating && progress === 0) {
    return null;
  }

  return (
    <Card className="w-full bg-purple-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Cards...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              Generation Complete
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-gray-600">
          <span>{processedCards} of {totalCards} cards generated</span>
          <span>{progress}%</span>
        </div>
        {isGenerating && totalCards >= 500 && (
          <div className="text-xs text-purple-600 mt-2">
            Using Web Worker for optimal performance
          </div>
        )}
      </CardContent>
    </Card>
  );
}
