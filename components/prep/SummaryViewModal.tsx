'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Edit, FileText, Users, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface SummaryViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionTitle: string;
  sessionNumber: number | null;
  summary: SessionSummary | null;
  onEditSummary: () => void;
}

export default function SummaryViewModal({
  open,
  onOpenChange,
  sessionTitle,
  sessionNumber,
  summary,
  onEditSummary,
}: SummaryViewModalProps) {
  const { toast } = useToast();

  if (!summary) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sessionTitle}
            {sessionNumber && ` (Session ${sessionNumber})`}
          </DialogTitle>
          <DialogDescription>
            Generated {new Date(summary.generated_at).toLocaleDateString()} • {summary.tone} tone
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Player View
                </CardTitle>
                <CardDescription>Share this with your players</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{summary.player_view}</p>
              </CardContent>
            </Card>

            <Card className="bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5" />
                  DM View
                </CardTitle>
                <CardDescription>Private notes for your eyes only</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{summary.dm_view}</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Accordion type="multiple" className="w-full">
            <AccordionItem value="events">
              <AccordionTrigger>
                Key Events ({summary.key_events.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {summary.key_events.map((event, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant={importanceBadgeColor(event.importance)}>
                        {event.importance}
                      </Badge>
                      <span>{event.description}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="npcs">
              <AccordionTrigger>
                NPCs Encountered ({summary.npcs.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.npcs.map((npc, i) => (
                    <div key={i} className="border rounded-lg p-3 text-sm">
                      <div className="font-semibold">{npc.name}</div>
                      <div className="text-muted-foreground">{npc.role}</div>
                      <Badge variant="outline" className="mt-1">{npc.status}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="items">
              <AccordionTrigger>
                Items & Rewards ({summary.items.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {summary.items.map((item, i) => (
                    <div key={i} className="border-l-2 border-primary pl-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.name}</span>
                        <Badge variant="secondary">{item.rarity}</Badge>
                      </div>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="locations">
              <AccordionTrigger>
                Locations ({summary.locations.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {summary.locations.map((loc, i) => (
                    <div key={i} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{loc.name}</span>
                        <Badge variant="outline">{loc.status}</Badge>
                      </div>
                      <p className="text-muted-foreground">{loc.description}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="consequences">
              <AccordionTrigger>
                Consequences & Future Hooks ({summary.consequences.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {summary.consequences.map((cons, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant={urgencyBadgeColor(cons.urgency)}>
                        {cons.urgency}
                      </Badge>
                      <span>{cons.hook}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="moments">
              <AccordionTrigger>
                Memorable Moments ({summary.memorable_moments.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {summary.memorable_moments.map((moment, i) => (
                    <div key={i} className="border-l-4 border-primary/30 pl-4 py-2">
                      <p className="text-sm italic">"{moment.moment}"</p>
                      <p className="text-xs text-muted-foreground mt-1">{moment.context}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="themes">
              <AccordionTrigger>Session Themes</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">{summary.session_themes}</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tags">
              <AccordionTrigger>
                Memory Tags ({summary.memory_tags.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {summary.memory_tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
