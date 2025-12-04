'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Edit, FileText, Users, Sparkles, Package, MapPin, Tag, AlertCircle, Zap, Sword } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InteractiveEntityLink } from './InteractiveEntityLink';
import { CreateMemoryFromSummaryModal } from './CreateMemoryFromSummaryModal';

interface SessionSummary {
  raw_notes: string;
  tone: string;
  key_events: Array<{ description: string; importance: string }>;
  npcs: Array<{ name: string; role: string; status: string }>;
  items: Array<{ name: string; description: string; rarity: string }>;
  locations: Array<{ name: string; description: string; status: string }>;
  consequences: Array<{ hook: string; urgency: string }>;
  memorable_moments: Array<{ moment: string; context: string }>;
  session_themes: string;
  player_view: string;
  dm_view: string;
  memory_tags: string[];
  generated_at: string;
}

interface EnhancedSummaryViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionTitle: string;
  sessionNumber: number | null;
  summary: SessionSummary | null;
  campaignId: string;
  onEditSummary: () => void;
}

export default function EnhancedSummaryViewModal({
  open,
  onOpenChange,
  sessionTitle,
  sessionNumber,
  summary,
  campaignId,
  onEditSummary,
}: EnhancedSummaryViewModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [createMemoryOpen, setCreateMemoryOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{
    name: string;
    type: 'npc' | 'item' | 'location';
    context: string;
    tags: string[];
  } | null>(null);

  if (!summary) return null;

  function handleEntityClick(
    exists: boolean,
    entityName: string,
    entityType: 'npc' | 'item' | 'location',
    context: string,
    tags: string[],
    memoryId?: string
  ) {
    if (exists && memoryId) {
      router.push(`/app/memory?id=${memoryId}`);
    } else {
      setSelectedEntity({ name: entityName, type: entityType, context, tags });
      setCreateMemoryOpen(true);
    }
  }

  function handleMemoryCreated() {
    toast({
      title: 'Success',
      description: 'Memory card created successfully',
    });
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  }

  function exportAsText() {
    if (!summary) return;

    const text = `# ${sessionTitle}${sessionNumber ? ` (Session ${sessionNumber})` : ''}

## Player View
${summary.player_view}

## DM View
${summary.dm_view}

## Key Events
${summary.key_events.map((e, i) => `${i + 1}. [${e.importance.toUpperCase()}] ${e.description}`).join('\n')}

## NPCs Encountered
${summary.npcs.map(npc => `- ${npc.name} (${npc.role}) - ${npc.status}`).join('\n')}

## Items & Rewards
${summary.items.map(item => `- ${item.name} (${item.rarity}) - ${item.description}`).join('\n')}

## Locations
${summary.locations.map(loc => `- ${loc.name} (${loc.status}) - ${loc.description}`).join('\n')}

## Consequences & Hooks
${summary.consequences.map(c => `- [${c.urgency.toUpperCase()}] ${c.hook}`).join('\n')}

## Memorable Moments
${summary.memorable_moments.map(m => `- "${m.moment}" - ${m.context}`).join('\n')}

## Session Themes
${summary.session_themes}

## Tags
${summary.memory_tags.join(', ')}

---
Generated: ${new Date(summary.generated_at).toLocaleString()}
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_Summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Summary exported as text file',
    });
  }

  const importanceBadgeColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const urgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'destructive';
      case 'soon': return 'default';
      case 'eventual': return 'secondary';
      default: return 'outline';
    }
  };

  const rarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'text-orange-500 dark:text-orange-400';
      case 'rare': return 'text-blue-500 dark:text-blue-400';
      case 'uncommon': return 'text-green-500 dark:text-green-400';
      case 'common': return 'text-gray-500 dark:text-gray-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {sessionTitle}
              {sessionNumber && ` (Session ${sessionNumber})`}
            </DialogTitle>
            <DialogDescription>
              Generated {new Date(summary.generated_at).toLocaleDateString()} • {summary.tone} tone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => copyToClipboard(summary.player_view, 'Player View')} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy Player View
              </Button>
              <Button onClick={() => copyToClipboard(summary.dm_view, 'DM View')} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy DM View
              </Button>
              <Button onClick={exportAsText} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Export as Text
              </Button>
              <Button onClick={onEditSummary} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit & Regenerate
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Player View
                  </CardTitle>
                  <CardDescription>Share this with your players</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary.player_view}</p>
                </CardContent>
              </Card>

              <Card className="bg-destructive/5 border-destructive/20 hover:border-destructive/40 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-destructive" />
                    DM View
                  </CardTitle>
                  <CardDescription>Private notes for your eyes only</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary.dm_view}</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <Accordion type="multiple" defaultValue={['npcs', 'items', 'locations']} className="w-full">
              <AccordionItem value="events">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Key Events ({summary.key_events.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {summary.key_events.map((event, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Badge variant={importanceBadgeColor(event.importance)} className="mt-0.5">
                          {event.importance}
                        </Badge>
                        <span className="text-sm leading-relaxed flex-1">{event.description}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="npcs">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <Sword className="h-5 w-5 text-blue-500" />
                    NPCs Encountered ({summary.npcs.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {summary.npcs.map((npc, i) => (
                      <Card
                        key={i}
                        className="hover:shadow-md transition-all hover:border-primary/50 cursor-default"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="font-semibold text-base">
                              <InteractiveEntityLink
                                entityName={npc.name}
                                entityType="npc"
                                campaignId={campaignId}
                                onClick={(exists, memoryId) =>
                                  handleEntityClick(
                                    exists,
                                    npc.name,
                                    'npc',
                                    `${npc.role} - ${npc.status}`,
                                    ['npc', npc.status],
                                    memoryId
                                  )
                                }
                              />
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{npc.role}</p>
                            <Badge variant="outline" className="text-xs">
                              {npc.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="items">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-500" />
                    Items & Rewards ({summary.items.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {summary.items.map((item, i) => (
                      <Card
                        key={i}
                        className="hover:shadow-md transition-all hover:border-purple-500/50"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-base ${rarityColor(item.rarity)}`}>
                                <InteractiveEntityLink
                                  entityName={item.name}
                                  entityType="item"
                                  campaignId={campaignId}
                                  onClick={(exists, memoryId) =>
                                    handleEntityClick(
                                      exists,
                                      item.name,
                                      'item',
                                      item.description,
                                      ['item', item.rarity],
                                      memoryId
                                    )
                                  }
                                />
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {item.rarity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="locations">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-500" />
                    Locations ({summary.locations.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {summary.locations.map((loc, i) => (
                      <Card
                        key={i}
                        className="hover:shadow-md transition-all hover:border-green-500/50"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-base">
                                <InteractiveEntityLink
                                  entityName={loc.name}
                                  entityType="location"
                                  campaignId={campaignId}
                                  onClick={(exists, memoryId) =>
                                    handleEntityClick(
                                      exists,
                                      loc.name,
                                      'location',
                                      loc.description,
                                      ['location', loc.status],
                                      memoryId
                                    )
                                  }
                                />
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {loc.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{loc.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="consequences">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Consequences & Future Hooks ({summary.consequences.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {summary.consequences.map((cons, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Badge variant={urgencyBadgeColor(cons.urgency)} className="mt-0.5">
                          {cons.urgency}
                        </Badge>
                        <span className="text-sm leading-relaxed flex-1">{cons.hook}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="moments">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-pink-500" />
                    Memorable Moments ({summary.memorable_moments.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {summary.memorable_moments.map((moment, i) => (
                      <div key={i} className="border-l-4 border-pink-500/50 pl-4 py-3 bg-muted/30 rounded-r-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm italic font-medium leading-relaxed">"{moment.moment}"</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{moment.context}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="themes">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    Session Themes
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed pt-2 p-3 bg-muted/30 rounded-lg">{summary.session_themes}</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tags">
                <AccordionTrigger className="text-base font-semibold">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-cyan-500" />
                    Memory Tags ({summary.memory_tags.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {summary.memory_tags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="cursor-default hover:bg-secondary/80 transition-colors"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </DialogContent>
      </Dialog>

      {selectedEntity && (
        <CreateMemoryFromSummaryModal
          open={createMemoryOpen}
          onOpenChange={setCreateMemoryOpen}
          entityName={selectedEntity.name}
          entityType={selectedEntity.type}
          campaignId={campaignId}
          sessionContext={selectedEntity.context}
          suggestedTags={selectedEntity.tags}
          onMemoryCreated={handleMemoryCreated}
        />
      )}
    </>
  );
}
