'use client';

import { Search, Eye, EyeOff, Save, PanelRight, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type Props = {
  dashboardName: string;
  onNameChange: (v: string) => void;
  isPreview: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  density: 'compact' | 'spacious';
  onToggleDensity: () => void;
  hosts: { hostid: string; name: string }[];
  onSearch: (q: string) => void;
  onFilterHost: (hostId: string | '') => void;
  onToggleRightPanel?: () => void;
};

export default function EditorToolbar({ dashboardName, onNameChange, isPreview, onTogglePreview, onSave, density, onToggleDensity, hosts, onSearch, onFilterHost, onToggleRightPanel }: Props) {
  const [q, setQ] = useState('');
  const [host, setHost] = useState<string | ''>('');
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        {!isPreview && (
          <Input className="w-56" placeholder="Nom du dashboard" value={dashboardName} onChange={(e) => onNameChange(e.target.value)} />
        )}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Input className="w-56" placeholder="Rechercher un widget / métrique" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSearch(q.trim()); }} />
            <Button variant="outline" size="sm" onClick={() => onSearch(q.trim())}><Search className="h-4 w-4 mr-2" />Rechercher</Button>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrer par hôte"
              className="h-9 min-w-[220px] border rounded-md px-3 bg-background text-foreground"
              value={host}
              onChange={(e) => { const v = e.target.value; setHost(v as any); onFilterHost(v as any); }}
            >
              <option value="">Tous les hôtes</option>
              {hosts.map(h => (<option key={h.hostid} value={h.hostid}>{h.name}</option>))}
            </select>
          </div>
          {/* Bouton IA Copilot retiré */}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToggleDensity} title={density === 'spacious' ? 'Passer en compact' : 'Passer en large'}>
          <LayoutGrid className="h-4 w-4 mr-2" />{density === 'spacious' ? 'Large' : 'Compact'}
        </Button>
        <Button variant="outline" size="sm" onClick={onTogglePreview}>
          {isPreview ? <><EyeOff className="h-4 w-4 mr-2" />Éditer</> : <><Eye className="h-4 w-4 mr-2" />Aperçu</>}
        </Button>
        {!isPreview && (
          <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-2" />Sauvegarder</Button>
        )}
        <Button
          variant="outline"
          size="sm"
          title="Panneau droit"
          aria-pressed={undefined}
          aria-controls="editor-right-panel"
          onClick={onToggleRightPanel}
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


