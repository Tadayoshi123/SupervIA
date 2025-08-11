'use client';

import { useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectItemsForHost } from '@/lib/features/metrics/metricsSlice';
import { ZabbixHost } from '@/lib/features/metrics/metricsService';
import { WidgetType } from '@/types/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { BarChart3, Activity, AlertCircle, Gauge, FileText } from 'lucide-react';

interface WidgetSelectorProps {
  hosts: ZabbixHost[];
  onAddWidget: (type: WidgetType, title: string, hostId?: string, itemId?: string) => void;
}

export default function WidgetSelector({ hosts, onAddWidget }: WidgetSelectorProps) {
  const [selectedType, setSelectedType] = useState<WidgetType>('metric');
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [widgetTitle, setWidgetTitle] = useState<string>('');
  
  const items = useAppSelector(selectItemsForHost(selectedHostId));
  
  // Cette fonction est utilisée dans les boutons ci-dessous
  
  // Fonction pour gérer l'ajout d'un widget
  const handleAddWidget = () => {
    let title = widgetTitle;
    
    // Si aucun titre n'est spécifié, on utilise un titre par défaut
    if (!title) {
      if (selectedType === 'metric' && selectedHostId && selectedItemId) {
        const host = hosts.find(h => h.hostid === selectedHostId);
        const item = items.find(i => i.itemid === selectedItemId);
        title = `${host?.name || 'Hôte'} - ${item?.name || 'Métrique'}`;
      } else {
        title = `Widget ${selectedType}`;
      }
    }
    
    // Ne pas passer hostId si c'est "all-hosts"
    const finalHostId = selectedHostId === "all-hosts" ? undefined : selectedHostId;
    onAddWidget(selectedType, title, finalHostId, selectedItemId);
    
    // Réinitialiser les champs après l'ajout
    setWidgetTitle('');
  };
  
  return (
    <div className="space-y-4">
      {/* Sélection du type de widget */}
      <div>
        <label className="block text-sm font-medium mb-1">Type de widget</label>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant={selectedType === 'metric' ? 'default' : 'outline'} 
            className="justify-start"
            onClick={() => setSelectedType('metric')}
          >
            <Gauge className="mr-2 h-4 w-4" />
            Métrique
          </Button>
          <Button 
            variant={selectedType === 'chart' ? 'default' : 'outline'} 
            className="justify-start"
            onClick={() => setSelectedType('chart')}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Graphique
          </Button>
          <Button 
            variant={selectedType === 'status' ? 'default' : 'outline'} 
            className="justify-start"
            onClick={() => setSelectedType('status')}
          >
            <Activity className="mr-2 h-4 w-4" />
            Statut
          </Button>
          <Button 
            variant={selectedType === 'problems' ? 'default' : 'outline'} 
            className="justify-start"
            onClick={() => setSelectedType('problems')}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Problèmes
          </Button>
          <Button 
            variant={selectedType === 'text' ? 'default' : 'outline'} 
            className="justify-start col-span-2"
            onClick={() => setSelectedType('text')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Texte
          </Button>
        </div>
      </div>
      
      {/* Configuration spécifique au type de widget */}
      <Card>
        <CardContent className="pt-4">
          {/* Titre du widget */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Titre (optionnel)</label>
            <Input 
              placeholder="Titre du widget" 
              value={widgetTitle} 
              onChange={(e) => setWidgetTitle(e.target.value)} 
            />
          </div>
          
          {/* Configuration pour les widgets nécessitant un hôte et une métrique */}
          {(selectedType === 'metric' || selectedType === 'chart') && (
            <>
              {/* Sélection de l'hôte */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Hôte</label>
                <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un hôte" />
                  </SelectTrigger>
                  <SelectContent>
                    {hosts.map((host) => (
                      <SelectItem key={host.hostid} value={host.hostid}>
                        {host.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sélection de l'item (si un hôte est sélectionné) */}
              {selectedHostId && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Métrique</label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une métrique" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.itemid} value={item.itemid}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Widget Statut: seulement l'hôte, la métrique sera auto‑détectée */}
          {selectedType === 'status' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Hôte</label>
                <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un hôte" />
                  </SelectTrigger>
                  <SelectContent>
                    {hosts.map((host) => (
                      <SelectItem key={host.hostid} value={host.hostid}>
                        {host.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">La métrique de disponibilité sera détectée automatiquement (icmp ping / agent ping).</p>
            </>
          )}
          
          {/* Configuration pour le widget problems */}
          {selectedType === 'problems' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Hôte (optionnel)</label>
              <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les hôtes ou sélectionner un hôte spécifique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-hosts">Tous les hôtes</SelectItem>
                  {hosts.map((host) => (
                    <SelectItem key={host.hostid} value={host.hostid}>
                      {host.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Bouton d'ajout */}
      <Button 
        onClick={handleAddWidget} 
        className="w-full"
        disabled={
          (selectedType === 'metric' || selectedType === 'chart') && (!selectedHostId || !selectedItemId) ||
          (selectedType === 'status' && !selectedHostId)
        }
      >
        Ajouter le widget
      </Button>
    </div>
  );
}