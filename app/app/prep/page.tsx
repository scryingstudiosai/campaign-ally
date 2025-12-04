'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Trash2, Copy, ArrowRight, Scroll, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import SummaryGenerationModal from '@/components/prep/SummaryGenerationModal';
import EnhancedSummaryViewModal from '@/components/prep/EnhancedSummaryViewModal';

interface Session {
  id: string;
  campaign_id: string;
  title: string;
  session_number?: number;
  session_date?: string;
  premise?: string;
  party_info?: { level: number; size: number };
  outline?: any;
  status: 'draft' | 'ready' | 'completed';
  created_at: string;
  summary_generated_at?: string;
  summary_player_view?: string;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // Find the Supabase auth token key dynamically
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const authData = localStorage.getItem(key);
        if (authData) {
          const parsed = JSON.parse(authData);
          return parsed.access_token || null;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export default function PrepPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [sceneCountMap, setSceneCountMap] = useState<Record<string, number>>({});
  const [summaryGenModalOpen, setSummaryGenModalOpen] = useState(false);
  const [summaryViewModalOpen, setSummaryViewModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [currentSummary, setCurrentSummary] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    sessionDate: '',
    partyLevel: 5,
    partySize: 4,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedCampaignId = localStorage.getItem('currentCampaignId');
      if (storedCampaignId) {
        setCampaignId(storedCampaignId);
        fetchSessions(storedCampaignId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      setLoading(false);
    }
  }, []);

  async function fetchSessions(campId: string) {
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/prep/sessions?campaignId=${campId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setSessions(data.data || []);
        await fetchSceneCounts(data.data || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load sessions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchSceneCounts(sessionList: Session[]) {
    const counts: Record<string, number> = {};
    const token = getAuthToken();
    if (!token) return;

    await Promise.all(
      sessionList.map(async (session) => {
        try {
          const res = await fetch(`/api/prep/scenes?sessionId=${session.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (data.success) {
            counts[session.id] = data.data.length;
          }
        } catch (error) {
          counts[session.id] = 0;
        }
      })
    );
    setSceneCountMap(counts);
  }

  async function createSession() {
    if (!campaignId) {
      toast({
        title: 'Error',
        description: 'No campaign selected',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title) {
      toast({
        title: 'Error',
        description: 'Session title is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Getting auth token...');
      const token = getAuthToken();
      console.log('Token found:', token ? 'YES' : 'NO');

      if (!token) {
        console.error('No auth token found in localStorage');
        // List all localStorage keys for debugging
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          keys.push(localStorage.key(i));
        }
        console.log('Available localStorage keys:', keys);

        toast({
          title: 'Error',
          description: 'Not authenticated - please refresh and try again',
          variant: 'destructive',
        });
        return;
      }

      const payload: any = {
        campaignId,
        title: formData.title,
        partyInfo: {
          level: formData.partyLevel,
          size: formData.partySize,
        },
        status: 'draft',
      };

      if (formData.sessionDate) {
        payload.sessionDate = new Date(formData.sessionDate).toISOString();
      }

      const res = await fetch('/api/prep/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Session created successfully',
        });
        setSessions([data.data, ...sessions]);
        setDialogOpen(false);
        setFormData({ title: '', sessionDate: '', partyLevel: 5, partySize: 4 });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive',
      });
    }
  }

  async function deleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        return;
      }

      const res = await fetch(`/api/prep/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Session deleted',
        });
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
    }
  }

  async function duplicateSession(session: Session) {
    if (!campaignId) return;

    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        campaignId,
        title: `${session.title} (Copy)`,
        premise: session.premise,
        partyInfo: session.party_info,
        outline: session.outline,
        status: 'draft',
      };

      const res = await fetch('/api/prep/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Session duplicated',
        });
        setSessions([data.data, ...sessions]);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to duplicate session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate session',
        variant: 'destructive',
      });
    }
  }

  async function openSummaryGenerator(session: Session) {
    setSelectedSession(session);

    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/prep/sessions/${session.id}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.hasSummary) {
        setCurrentSummary(data.data);
      } else {
        setCurrentSummary(null);
      }
    } catch (error) {
      setCurrentSummary(null);
    }

    setSummaryGenModalOpen(true);
  }

  async function openSummaryViewer(session: Session) {
    setSelectedSession(session);

    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/prep/sessions/${session.id}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.hasSummary) {
        setCurrentSummary(data.data);
        setSummaryViewModalOpen(true);
      } else {
        toast({
          title: 'No Summary',
          description: 'This session does not have a summary yet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load summary',
        variant: 'destructive',
      });
    }
  }

  function handleSummaryGenerated() {
    if (campaignId) {
      fetchSessions(campaignId);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'ready':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  }

  if (!campaignId) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-10">
        <Card className="bg-card border border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <Scroll className="h-6 w-6 text-primary" />
              Session Prep
            </CardTitle>
            <CardDescription>No campaign selected. Please select a campaign to continue.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scroll className="h-8 w-8 text-primary" />
            Session Prep
          </h1>
          <p className="text-muted-foreground mt-2">Plan and prepare your D&D sessions</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
              <DialogDescription>Set up a new session for your campaign</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Session Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., The Dragon's Lair"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="date">Session Date (Optional)</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="level">Party Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.partyLevel}
                    onChange={(e) => setFormData({ ...formData, partyLevel: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="size">Party Size</Label>
                  <Input
                    id="size"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.partySize}
                    onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createSession}>Create Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-center text-muted-foreground">No Sessions Yet</CardTitle>
            <CardDescription className="text-center">
              Create your first session to start planning your adventure
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{session.title}</CardTitle>
                  <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                </div>
                {session.session_date && (
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(session.session_date), 'MMM d, yyyy')}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Level {session.party_info?.level || '?'} | {session.party_info?.size || '?'} players
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{sceneCountMap[session.id] || 0} scenes</span>
                    {session.outline && <Badge variant="outline">Outlined</Badge>}
                    {session.summary_generated_at && (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" />
                        Summary
                      </Badge>
                    )}
                  </div>

                  {session.summary_generated_at && session.summary_player_view && (
                    <p className="text-xs text-muted-foreground line-clamp-2 border-l-2 border-primary/30 pl-2">
                      {session.summary_player_view.slice(0, 100)}...
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        console.log('=== OPEN BUTTON CLICKED ===');
                        console.log('Session ID:', session.id);
                        console.log('Target URL:', `/app/prep/${session.id}`);
                        console.log('Session object:', session);
                        router.push(`/app/prep/${session.id}`);
                      }}
                    >
                      Open
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateSession(session)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSession(session.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {session.summary_generated_at ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => openSummaryViewer(session)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Summary
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openSummaryGenerator(session)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Generate Summary
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSession && (
        <>
          <SummaryGenerationModal
            open={summaryGenModalOpen}
            onOpenChange={setSummaryGenModalOpen}
            sessionId={selectedSession.id}
            sessionTitle={selectedSession.title}
            sessionNumber={selectedSession.session_number || null}
            onSummaryGenerated={handleSummaryGenerated}
            existingNotes={currentSummary?.raw_notes}
            existingTone={currentSummary?.tone}
          />

          <EnhancedSummaryViewModal
            open={summaryViewModalOpen}
            onOpenChange={setSummaryViewModalOpen}
            sessionTitle={selectedSession.title}
            sessionNumber={selectedSession.session_number || null}
            summary={currentSummary}
            campaignId={campaignId || ''}
            onEditSummary={() => {
              setSummaryViewModalOpen(false);
              setSummaryGenModalOpen(true);
            }}
          />
        </>
      )}
    </div>
  );
}
