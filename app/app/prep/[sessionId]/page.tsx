'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Sparkles, ListTree, Plus, Download } from 'lucide-react';
import SceneCard from '@/components/prep/SceneCard';
import DraggableSceneList from '@/components/prep/DraggableSceneList';
import SessionProgressBar from '@/components/prep/SessionProgressBar';
import BeatEditor from '@/components/prep/BeatEditor';
import AddBeatButton from '@/components/prep/AddBeatButton';

interface Session {
  id: string;
  campaign_id: string;
  title: string;
  session_date?: string;
  premise?: string;
  party_info?: { level: number; size: number };
  target_duration?: number;
  outline?: {
    title?: string;
    goals?: string[];
    beats?: Array<{
      title: string;
      description?: string;
      duration?: number;
      objectives?: string[];
      challenges?: string[];
    }>;
  };
  status: string;
  notes?: string;
}

interface Scene {
  id: string;
  session_id: string;
  index_order: number;
  title?: string;
  data?: any;
  canon_checked?: boolean;
  last_canon_score?: number;
  last_canon_checked_at?: string;
  created_at: string;
}

export default function SessionEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [converting, setConverting] = useState(false);

  const [premise, setPremise] = useState('');
  const [partyLevel, setPartyLevel] = useState(5);
  const [partySize, setPartySize] = useState(4);
  const [targetDuration, setTargetDuration] = useState(180);

  useEffect(() => {
    console.log('=== SESSION EDITOR PAGE MOUNTED ===');
    console.log('Session ID from params:', sessionId);
    fetchSession();
    fetchScenes();
  }, [sessionId]);

  function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    try {
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

  async function fetchSession() {
    console.log('=== FETCHING SESSION ===');
    console.log('Session ID:', sessionId);
    console.log('API URL:', `/api/prep/sessions/${sessionId}`);

    try {
      const token = getAuthToken();
      console.log('Auth token found:', token ? 'YES' : 'NO');
      if (token) {
        console.log('Token preview:', token.substring(0, 20) + '...');
      }

      const url = `/api/prep/sessions/${sessionId}`;
      console.log('Making fetch request to:', url);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      const data = await res.json();
      console.log('Session fetch response:', data);

      if (data.success) {
        console.log('Session loaded successfully:', data.data.title);
        setSession(data.data);
        setPremise(data.data.premise || '');
        setPartyLevel(data.data.party_info?.level || 5);
        setPartySize(data.data.party_info?.size || 4);
        setTargetDuration(data.data.target_duration || 180);
      } else {
        console.error('Session fetch failed:', data.error);
        toast({
          title: 'Error',
          description: data.error || 'Failed to load session',
          variant: 'destructive',
        });
        setSession(null);
      }
    } catch (error) {
      console.error('=== SESSION FETCH ERROR ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('Full error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to load session';
      toast({
        title: 'Error',
        description: `Failed to load session: ${errorMessage}`,
        variant: 'destructive',
      });
      setSession(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }

  async function fetchScenes() {
    console.log('Fetching scenes for session:', sessionId);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/prep/scenes?sessionId=${sessionId}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });
      const data = await res.json();

      console.log('Scenes fetch response:', data);

      if (data.success) {
        setScenes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch scenes:', error);
    }
  }

  async function savePremise() {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/prep/sessions/${sessionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          premise,
          partyInfo: { level: partyLevel, size: partySize },
          targetDuration,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Saved',
          description: 'Session premise updated',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save premise',
        variant: 'destructive',
      });
    }
  }

  async function generateOutline() {
    if (!premise.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a session premise first',
        variant: 'destructive',
      });
      return;
    }

    await savePremise();

    setGenerating(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/prep/outline', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignId: session?.campaign_id,
          sessionId,
          premise,
          partyInfo: { level: partyLevel, size: partySize },
          useCanon: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Outline generated successfully',
        });
        await fetchSession();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate outline',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate outline',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function convertToScenes() {
    if (!session?.outline?.beats || session.outline.beats.length === 0) {
      toast({
        title: 'Error',
        description: 'Generate an outline first',
        variant: 'destructive',
      });
      return;
    }

    setConverting(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/prep/convert-to-scenes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `${data.data.scenesCreated} scenes created`,
        });
        await fetchScenes();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to convert to scenes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to convert to scenes',
        variant: 'destructive',
      });
    } finally {
      setConverting(false);
    }
  }

  async function deleteScene(sceneId: string) {
    if (!confirm('Are you sure you want to delete this scene?')) return;

    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/prep/scenes/${sceneId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Scene deleted',
        });
        setScenes(scenes.filter((s) => s.id !== sceneId));
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete scene',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete scene',
        variant: 'destructive',
      });
    }
  }

  async function handleReorder(sceneIds: string[]) {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/prep/scenes/reorder', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, sceneIds }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchScenes();
        toast({
          title: 'Success',
          description: 'Scenes reordered',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reorder scenes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder scenes',
        variant: 'destructive',
      });
    }
  }

  async function exportMarkdown(mode: 'dm' | 'player') {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/prep/export/markdown?sessionId=${sessionId}&mode=${mode}`, {
        headers,
      });
      const data = await res.json();

      if (data.success) {
        const blob = new Blob([data.data.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session?.title || 'session'}-${mode}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: 'Markdown exported',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to export',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export',
        variant: 'destructive',
      });
    }
  }

  async function updateBeats(updatedBeats: any[], commentary?: string) {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/prep/sessions/${sessionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          outline: {
            ...session?.outline,
            beats: updatedBeats,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchSession();
        if (commentary) {
          toast({
            title: 'Beats updated',
            description: commentary,
          });
        }
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update beats',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update beats',
        variant: 'destructive',
      });
    }
  }

  async function deleteBeat(beatIndex: number) {
    if (!session?.outline?.beats) return;
    if (!confirm('Are you sure you want to delete this beat?')) return;

    const updatedBeats = session.outline.beats.filter((_, idx) => idx !== beatIndex);
    await updateBeats(updatedBeats);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-10">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Session not found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/app/prep')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{session.title}</h1>
          <p className="text-muted-foreground">
            Level {partyLevel} | {partySize} players | {targetDuration} min session
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Outline Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="premise">Session Premise</Label>
                <Textarea
                  id="premise"
                  placeholder="Describe what you want to happen in this session..."
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  onBlur={savePremise}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="level">Party Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="20"
                    value={partyLevel}
                    onChange={(e) => setPartyLevel(parseInt(e.target.value) || 1)}
                    onBlur={savePremise}
                  />
                </div>
                <div>
                  <Label htmlFor="size">Party Size</Label>
                  <Input
                    id="size"
                    type="number"
                    min="1"
                    max="10"
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                    onBlur={savePremise}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="30"
                    max="600"
                    step="15"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value) || 180)}
                    onBlur={savePremise}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={generateOutline}
                  disabled={generating || !premise.trim()}
                  className="flex-1"
                >
                  {generating ? 'Generating...' : 'Generate Outline'}
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  onClick={convertToScenes}
                  disabled={converting || !session.outline}
                  variant="outline"
                >
                  {converting ? 'Converting...' : 'Convert to Scenes'}
                  <ListTree className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {session.outline && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Outline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.outline.title && (
                  <div>
                    <h3 className="font-semibold text-base">{session.outline.title}</h3>
                  </div>
                )}

                {session.outline.goals && session.outline.goals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Goals</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {session.outline.goals.map((goal, idx) => (
                        <li key={idx}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.outline.beats && session.outline.beats.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Beats</h4>
                      <AddBeatButton
                        sessionTitle={session.title}
                        campaignId={session.campaign_id}
                        sessionId={sessionId}
                        allBeats={session.outline.beats}
                        token={getAuthToken() || ''}
                        onUpdate={updateBeats}
                      />
                    </div>
                    <div className="space-y-3">
                      {session.outline.beats.map((beat, idx) => (
                        <BeatEditor
                          key={idx}
                          beat={beat}
                          index={idx}
                          sessionTitle={session.title}
                          campaignId={session.campaign_id}
                          sessionId={sessionId}
                          allBeats={session.outline?.beats || []}
                          token={getAuthToken() || ''}
                          onUpdate={updateBeats}
                          onDelete={() => deleteBeat(idx)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {scenes.length > 0 && <SessionProgressBar scenes={scenes} targetMinutes={targetDuration} />}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Scenes ({scenes.length})</CardTitle>
                {scenes.length > 0 && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportMarkdown('dm')}>
                      <Download className="h-3 w-3 mr-1" />
                      DM Export
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportMarkdown('player')}>
                      <Download className="h-3 w-3 mr-1" />
                      Player Export
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scenes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No scenes yet</p>
                  <p className="text-sm mt-2">Generate an outline and convert it to scenes</p>
                </div>
              ) : (
                <DraggableSceneList
                  scenes={scenes}
                  campaignId={session.campaign_id}
                  sessionId={sessionId}
                  token={getAuthToken() || ''}
                  onUpdate={() => fetchScenes()}
                  onDelete={deleteScene}
                  onReorder={handleReorder}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
