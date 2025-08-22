'use client';

import { Lightbulb, Zap, TrendingUp } from 'lucide-react';

export default function InsightsBar() {
  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-200/20 dark:border-purple-900/30 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Lightbulb className="h-4 w-4 text-purple-500" />
          <span>Insights IA</span>
        </div>
        <div className="text-muted-foreground">
          <span className="inline-flex items-center gap-1 mr-4">
            <Zap className="h-3 w-3 text-amber-500" />
            Optimisation détectée: pensez à ajouter une jauge avec seuils auto.
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-cyan-500" />
            Tendance CPU haussière sur 1h.
          </span>
        </div>
      </div>
    </div>
  );
}


