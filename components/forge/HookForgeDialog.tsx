'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Swords, Sparkles, Copy, Save, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useGenerationLimit } from '@/hooks/useGenerationLimit';
import { GenerationLimitModal } from './GenerationLimitModal';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface HookForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface HookResult {
  hook: string;
  details?: string;
  flair?: string;
}

export default function HookForgeDialog({ open, onOpenChange, campaignId }: HookForgeDialogProps) {
  const [concept, setConcept] = useState('');
  const [hookType, setHookType] = useState('any');
  const [scope, setScope] = useState('quick');
  const [partyLevel, setPartyLevel] = useState('5');
  const [urgency, setUrgency] = useState('no-pressure');
  const [tone, setTone] = useState('any');
  const [conflict, setConflict] = useState('any');
  const [antagonist, setAntagonist] = useState('unknown');
  const [stakes, setStakes] = useState('personal');
  const [location, setLocation] = useState('any');
  const [trigger, setTrigger] = useState('any');
  const [twist, setTwist] = useState('none');
  const [rewards, setRewards] = useState('standard');
  const [consequences, setConsequences] = useState('minor');
  const [respectCodex, setRespectCodex] = useState(true);

  const [includeHook, setIncludeHook] = useState(true);
  const [includeNPCs, setIncludeNPCs] = useState(true);
  const [includeObstacles, setIncludeObstacles] = useState(true);
  const [includePlotThreads, setIncludePlotThreads] = useState(true);
  const [includeClues, setIncludeClues] = useState(true);
  const [includeTwists, setIncludeTwists] = useState(true);
  const [includeSuccess, setIncludeSuccess] = useState(true);
  const [includeFailure, setIncludeFailure] = useState(true);
  const [includeConnection, setIncludeConnection] = useState(true);
  const [includeMoral, setIncludeMoral] = useState(true);
  const [includeSetPieces, setIncludeSetPieces] = useState(true);
  const [includeSideObjectives, setIncludeSideObjectives] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HookResult | null>(null);
  const { toast } = useToast();
  const { checkLimit, limitModalOpen, setLimitModalOpen, limitInfo } = useGenerationLimit();
  const { refresh: refreshCount } = useGenerationCount();

  const handleGenerate = async (surpriseMe: boolean = false) => {
    // Check generation limit before proceeding
    const allowed = await checkLimit();
    if (!allowed) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: 'Not logged in',
          description: 'Please sign in to use forges.',
          variant: 'destructive',
        });
        return;
      }

      let conceptText = concept.trim();

      if (!surpriseMe) {
        const detailParts: string[] = [];

        if (hookType !== 'any') detailParts.push(`${hookType}`);
        if (scope !== 'quick') detailParts.push(`scope: ${scope}`);
        detailParts.push(`party level ${partyLevel}`);
        if (urgency !== 'no-pressure') detailParts.push(`urgency: ${urgency}`);
        if (tone !== 'any') detailParts.push(`tone: ${tone}`);
        if (conflict !== 'any') detailParts.push(`conflict: ${conflict}`);
        if (antagonist !== 'unknown') detailParts.push(`antagonist: ${antagonist}`);
        if (stakes !== 'personal') detailParts.push(`stakes: ${stakes}`);
        if (location !== 'any') detailParts.push(`location: ${location}`);
        if (trigger !== 'any') detailParts.push(`trigger: ${trigger}`);
        if (twist !== 'none') detailParts.push(`twist: ${twist}`);
        if (rewards !== 'standard') detailParts.push(`rewards: ${rewards}`);
        if (consequences !== 'minor') detailParts.push(`consequences: ${consequences}`);

        if (detailParts.length > 0) {
          if (conceptText) {
            conceptText += `. Details: ${detailParts.join(', ')}`;
          } else {
            conceptText = detailParts.join(', ');
          }
        }
      }

      if (!conceptText || conceptText.length < 3) {
        conceptText = 'Create an engaging plot hook for my campaign';
      }

      const includeDetails = {
        hook: includeHook,
        npcs: includeNPCs,
        obstacles: includeObstacles,
        plotThreads: includePlotThreads,
        clues: includeClues,
        twists: includeTwists,
        success: includeSuccess,
        failure: includeFailure,
        connection: includeConnection,
        moral: includeMoral,
        setPieces: includeSetPieces,
        sideObjectives: includeSideObjectives,
      };

      const payload = {
        type: 'hook',
        campaignId,
        concept: conceptText,
        respectCodex,
        includeDetails,
      };

      const response = await fetch('/api/ai/panic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Generation failed',
          description: data.error || 'Failed to generate hook',
          variant: 'destructive',
        });
        return;
      }

      setResult(data.result);
      toast({
        title: 'Hook generated',
        description: 'Your plot hook is ready!',
      });
    } catch (error) {
      console.error('Hook generation error:', error);
      toast({
        title: 'Generation failed',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;

    const text = `**Plot Hook**\n\n${result.hook}${result.details ? `\n\n**Details:**\n${result.details}` : ''}${result.flair ? `\n\n**Flair:** ${result.flair}` : ''}`;

    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Hook details copied successfully',
    });
  };

  const handleSave = async () => {
    if (!result) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Not authenticated',
          description: 'Please sign in to save',
          variant: 'destructive',
        });
        return;
      }

      const title = 'Plot Hook';
      const textContent = `${result.hook}${result.details ? `\n\n${result.details}` : ''}`;

      const insertData = {
        campaign_id: campaignId,
        type: 'hook',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'hook',
        tags: [],
      };

      console.log('[HookForge] Saving hook to memory_chunks:', insertData);

      const { data, error } = await supabase.from('memory_chunks').insert(insertData).select();

      if (error) {
        console.error('[HookForge] Save error:', error);
        throw error;
      }

      console.log('[HookForge] Saved successfully:', data);

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      toast({
        title: 'Saved to memory',
        description: 'Hook has been saved to your campaign memory',
      });
    } catch (error: any) {
      console.error('[HookForge] Save error:', error);
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save hook to memory',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setConcept('');
    setHookType('any');
    setScope('quick');
    setPartyLevel('5');
    setUrgency('no-pressure');
    setTone('any');
    setConflict('any');
    setAntagonist('unknown');
    setStakes('personal');
    setLocation('any');
    setTrigger('any');
    setTwist('none');
    setRewards('standard');
    setConsequences('minor');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <>
      <GenerationLimitModal
        open={limitModalOpen}
        onOpenChange={setLimitModalOpen}
        used={limitInfo.used}
        limit={limitInfo.limit}
      />
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-cyan-500" />
            <DialogTitle>Hook Forge</DialogTitle>
          </div>
          <DialogDescription>
            Create engaging plot hooks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="hook-concept">Concept (Optional)</Label>
            <Textarea
              id="hook-concept"
              placeholder="E.g., 'Missing caravan with strange tracks' or 'Nobleman's secret threatens city' or 'Ancient prophecy comes true' or leave blank for random"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={loading}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe the situation, theme, or type of adventure hook
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hookType">Hook Type</Label>
              <Select value={hookType} onValueChange={setHookType} disabled={loading}>
                <SelectTrigger id="hookType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="mystery">Mystery/Investigation</SelectItem>
                  <SelectItem value="combat">Combat/Battle</SelectItem>
                  <SelectItem value="social">Social/Political</SelectItem>
                  <SelectItem value="exploration">Exploration/Discovery</SelectItem>
                  <SelectItem value="rescue">Rescue Mission</SelectItem>
                  <SelectItem value="heist">Heist/Infiltration</SelectItem>
                  <SelectItem value="defense">Defense/Protection</SelectItem>
                  <SelectItem value="escort">Escort/Transport</SelectItem>
                  <SelectItem value="hunt">Monster Hunt</SelectItem>
                  <SelectItem value="artifact">Artifact Recovery</SelectItem>
                  <SelectItem value="diplomatic">Diplomatic Mission</SelectItem>
                  <SelectItem value="puzzle">Puzzle/Riddle</SelectItem>
                  <SelectItem value="horror">Horror/Survival</SelectItem>
                  <SelectItem value="competition">Competition/Contest</SelectItem>
                  <SelectItem value="betrayal">Betrayal/Conspiracy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scope">Scope</Label>
              <Select value={scope} onValueChange={setScope} disabled={loading}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick Encounter (1 session)</SelectItem>
                  <SelectItem value="short">Short Adventure (2-3 sessions)</SelectItem>
                  <SelectItem value="medium">Medium Campaign Arc (4-8 sessions)</SelectItem>
                  <SelectItem value="major">Major Campaign (9-15 sessions)</SelectItem>
                  <SelectItem value="defining">Campaign-Defining (ongoing)</SelectItem>
                  <SelectItem value="side">Side Quest</SelectItem>
                  <SelectItem value="personal">Personal Quest</SelectItem>
                  <SelectItem value="world">World-Shaking Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partyLevel">Party Level (1-20)</Label>
              <Input
                id="partyLevel"
                type="number"
                min="1"
                max="20"
                value={partyLevel}
                onChange={(e) => setPartyLevel(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency} disabled={loading}>
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-pressure">No Time Pressure</SelectItem>
                  <SelectItem value="days">Days/Weeks Available</SelectItem>
                  <SelectItem value="hours">Hours/Days Available</SelectItem>
                  <SelectItem value="immediate">Immediate/Urgent</SelectItem>
                  <SelectItem value="time-sensitive">Time-Sensitive Event</SelectItem>
                  <SelectItem value="countdown">Ticking Clock/Countdown</SelectItem>
                  <SelectItem value="escalating">Escalating If Ignored</SelectItem>
                  <SelectItem value="ongoing">Already Ongoing</SelectItem>
                  <SelectItem value="past">Past Point of No Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone">Tone/Theme</Label>
              <Select value={tone} onValueChange={setTone} disabled={loading}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="heroic">Heroic/Epic</SelectItem>
                  <SelectItem value="dark">Dark/Gritty</SelectItem>
                  <SelectItem value="mystery">Mystery/Intrigue</SelectItem>
                  <SelectItem value="horror">Horror/Dread</SelectItem>
                  <SelectItem value="comedy">Comedy/Light</SelectItem>
                  <SelectItem value="tragic">Tragic</SelectItem>
                  <SelectItem value="action">Action/Adventure</SelectItem>
                  <SelectItem value="political">Political Drama</SelectItem>
                  <SelectItem value="moral">Moral Dilemma</SelectItem>
                  <SelectItem value="revenge">Revenge</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="survival">Survival</SelectItem>
                  <SelectItem value="coming-of-age">Coming of Age</SelectItem>
                  <SelectItem value="redemption">Redemption</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="conflict">Conflict Type</Label>
              <Select value={conflict} onValueChange={setConflict} disabled={loading}>
                <SelectTrigger id="conflict">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="person">Person vs Person</SelectItem>
                  <SelectItem value="monster">Person vs Monster</SelectItem>
                  <SelectItem value="nature">Person vs Nature</SelectItem>
                  <SelectItem value="society">Person vs Society</SelectItem>
                  <SelectItem value="self">Person vs Self</SelectItem>
                  <SelectItem value="supernatural">Person vs Supernatural</SelectItem>
                  <SelectItem value="technology">Person vs Technology</SelectItem>
                  <SelectItem value="fate">Person vs Fate</SelectItem>
                  <SelectItem value="multiple">Multiple Conflicts</SelectItem>
                  <SelectItem value="internal">Internal Party Conflict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="antagonist">Primary Antagonist Type</Label>
              <Select value={antagonist} onValueChange={setAntagonist} disabled={loading}>
                <SelectTrigger id="antagonist">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="monster">Monster/Beast</SelectItem>
                  <SelectItem value="intelligent">Intelligent Creature</SelectItem>
                  <SelectItem value="humanoid">Humanoid Villain</SelectItem>
                  <SelectItem value="cult">Cult/Organization</SelectItem>
                  <SelectItem value="disaster">Natural Disaster</SelectItem>
                  <SelectItem value="magical">Magical Phenomenon</SelectItem>
                  <SelectItem value="ancient">Ancient Evil</SelectItem>
                  <SelectItem value="political">Political Figure</SelectItem>
                  <SelectItem value="betrayer">Betrayer/Traitor</SelectItem>
                  <SelectItem value="rival">Rival Adventurers</SelectItem>
                  <SelectItem value="undead">Undead</SelectItem>
                  <SelectItem value="dragon">Dragon</SelectItem>
                  <SelectItem value="demon">Demon/Devil</SelectItem>
                  <SelectItem value="aberration">Aberration</SelectItem>
                  <SelectItem value="self">Self/Internal</SelectItem>
                  <SelectItem value="environmental">Environmental Hazard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stakes">Stakes</Label>
              <Select value={stakes} onValueChange={setStakes} disabled={loading}>
                <SelectTrigger id="stakes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal (individual)</SelectItem>
                  <SelectItem value="local">Local (village/town)</SelectItem>
                  <SelectItem value="regional">Regional (multiple settlements)</SelectItem>
                  <SelectItem value="national">National (kingdom)</SelectItem>
                  <SelectItem value="global">Global (world)</SelectItem>
                  <SelectItem value="cosmic">Cosmic/Planar</SelectItem>
                  <SelectItem value="moral">Moral/Ethical</SelectItem>
                  <SelectItem value="financial">Financial/Economic</SelectItem>
                  <SelectItem value="social">Social/Reputation</SelectItem>
                  <SelectItem value="life">Life or Death</SelectItem>
                  <SelectItem value="soul">Soul/Afterlife</SelectItem>
                  <SelectItem value="knowledge">Knowledge/Secret</SelectItem>
                  <SelectItem value="relationship">Relationship/Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Primary Location</Label>
              <Select value={location} onValueChange={setLocation} disabled={loading}>
                <SelectTrigger id="location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="urban">Urban/City</SelectItem>
                  <SelectItem value="rural">Rural/Village</SelectItem>
                  <SelectItem value="wilderness">Wilderness</SelectItem>
                  <SelectItem value="dungeon">Dungeon/Ruins</SelectItem>
                  <SelectItem value="castle">Castle/Manor</SelectItem>
                  <SelectItem value="temple">Temple/Church</SelectItem>
                  <SelectItem value="underground">Underground</SelectItem>
                  <SelectItem value="mountains">Mountains</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                  <SelectItem value="swamp">Swamp</SelectItem>
                  <SelectItem value="desert">Desert</SelectItem>
                  <SelectItem value="ocean">Ocean/Ship</SelectItem>
                  <SelectItem value="planar">Planar</SelectItem>
                  <SelectItem value="multiple">Multiple Locations</SelectItem>
                  <SelectItem value="moving">Moving Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trigger">Hook Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger} disabled={loading}>
                <SelectTrigger id="trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="npc">NPC Request</SelectItem>
                  <SelectItem value="rumor">Overheard Rumor</SelectItem>
                  <SelectItem value="clue">Discovered Clue</SelectItem>
                  <SelectItem value="connection">Personal Connection</SelectItem>
                  <SelectItem value="attacked">Attacked/Ambushed</SelectItem>
                  <SelectItem value="letter">Mysterious Letter</SelectItem>
                  <SelectItem value="dream">Prophetic Dream</SelectItem>
                  <SelectItem value="bounty">Bounty/Reward Posting</SelectItem>
                  <SelectItem value="summons">Government Summons</SelectItem>
                  <SelectItem value="accident">Accident/Coincidence</SelectItem>
                  <SelectItem value="moral-obligation">Moral Obligation</SelectItem>
                  <SelectItem value="revenge-motive">Revenge Motivation</SelectItem>
                  <SelectItem value="event">Timed Event Occurs</SelectItem>
                  <SelectItem value="consequence">Previous Adventure Consequence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="twist">Twist/Complication (Optional)</Label>
            <Select value={twist} onValueChange={setTwist} disabled={loading}>
              <SelectTrigger id="twist">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None/Straightforward</SelectItem>
                <SelectItem value="not-what-seems">Not What It Seems</SelectItem>
                <SelectItem value="betrayal">Betrayal by Ally</SelectItem>
                <SelectItem value="innocent">Innocent Antagonist</SelectItem>
                <SelectItem value="double-agent">Double Agent</SelectItem>
                <SelectItem value="gray">Moral Gray Area</SelectItem>
                <SelectItem value="time-loop">Time Loop</SelectItem>
                <SelectItem value="false-flag">False Flag Operation</SelectItem>
                <SelectItem value="misunderstood">Prophecy Misunderstood</SelectItem>
                <SelectItem value="master-plan">Hidden Master Plan</SelectItem>
                <SelectItem value="being-used">Party is Being Used</SelectItem>
                <SelectItem value="cursed">Cursed/Haunted</SelectItem>
                <SelectItem value="supernatural-element">Supernatural Element</SelectItem>
                <SelectItem value="conspiracy">Political Conspiracy</SelectItem>
                <SelectItem value="personal">Personal Connection</SelectItem>
                <SelectItem value="factions">Multiple Factions</SelectItem>
                <SelectItem value="hidden-monster">Hidden Monster</SelectItem>
                <SelectItem value="reality">Reality Distortion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rewards">Potential Rewards</Label>
              <Select value={rewards} onValueChange={setRewards} disabled={loading}>
                <SelectTrigger id="rewards">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard loot</SelectItem>
                  <SelectItem value="magic-item">Magic item</SelectItem>
                  <SelectItem value="reputation">Reputation/Fame</SelectItem>
                  <SelectItem value="favor">Political favor</SelectItem>
                  <SelectItem value="ally">NPC ally</SelectItem>
                  <SelectItem value="knowledge">Knowledge/Information</SelectItem>
                  <SelectItem value="property">Property/Land</SelectItem>
                  <SelectItem value="title">Title/Position</SelectItem>
                  <SelectItem value="resource">Rare resource</SelectItem>
                  <SelectItem value="artifact">Powerful artifact</SelectItem>
                  <SelectItem value="blessing">Divine blessing</SelectItem>
                  <SelectItem value="ability">Magical ability</SelectItem>
                  <SelectItem value="restoration">Restoration/Healing</SelectItem>
                  <SelectItem value="release">Release from curse</SelectItem>
                  <SelectItem value="multiple">Multiple rewards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="consequences">If Ignored/Failed</Label>
              <Select value={consequences} onValueChange={setConsequences} disabled={loading}>
                <SelectTrigger id="consequences">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor (no major impact)</SelectItem>
                  <SelectItem value="moderate">Moderate (local problems)</SelectItem>
                  <SelectItem value="serious">Serious (regional crisis)</SelectItem>
                  <SelectItem value="catastrophic">Catastrophic (major disaster)</SelectItem>
                  <SelectItem value="growing">Ongoing threat grows</SelectItem>
                  <SelectItem value="deaths">NPC deaths</SelectItem>
                  <SelectItem value="political">Political instability</SelectItem>
                  <SelectItem value="economic">Economic collapse</SelectItem>
                  <SelectItem value="war">War begins</SelectItem>
                  <SelectItem value="evil">Evil spreads</SelectItem>
                  <SelectItem value="portal">Portal opens</SelectItem>
                  <SelectItem value="curse">Curse spreads</SelectItem>
                  <SelectItem value="prophecy">Prophecy fulfilled</SelectItem>
                  <SelectItem value="past">Past returns</SelectItem>
                  <SelectItem value="world-changed">World changed permanently</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Include Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="hook" checked={includeHook} onCheckedChange={(checked) => setIncludeHook(!!checked)} disabled={loading} />
                <label htmlFor="hook" className="text-sm cursor-pointer">Initial hook presentation</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="npcs" checked={includeNPCs} onCheckedChange={(checked) => setIncludeNPCs(!!checked)} disabled={loading} />
                <label htmlFor="npcs" className="text-sm cursor-pointer">Key NPCs involved</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="obstacles" checked={includeObstacles} onCheckedChange={(checked) => setIncludeObstacles(!!checked)} disabled={loading} />
                <label htmlFor="obstacles" className="text-sm cursor-pointer">Primary obstacles & challenges</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="plotThreads" checked={includePlotThreads} onCheckedChange={(checked) => setIncludePlotThreads(!!checked)} disabled={loading} />
                <label htmlFor="plotThreads" className="text-sm cursor-pointer">Multiple plot threads</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="clues" checked={includeClues} onCheckedChange={(checked) => setIncludeClues(!!checked)} disabled={loading} />
                <label htmlFor="clues" className="text-sm cursor-pointer">Clues & investigation paths</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="twists" checked={includeTwists} onCheckedChange={(checked) => setIncludeTwists(!!checked)} disabled={loading} />
                <label htmlFor="twists" className="text-sm cursor-pointer">Potential twists & complications</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="success" checked={includeSuccess} onCheckedChange={(checked) => setIncludeSuccess(!!checked)} disabled={loading} />
                <label htmlFor="success" className="text-sm cursor-pointer">Success conditions & rewards</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="failure" checked={includeFailure} onCheckedChange={(checked) => setIncludeFailure(!!checked)} disabled={loading} />
                <label htmlFor="failure" className="text-sm cursor-pointer">Failure consequences</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="connection" checked={includeConnection} onCheckedChange={(checked) => setIncludeConnection(!!checked)} disabled={loading} />
                <label htmlFor="connection" className="text-sm cursor-pointer">Connection to larger world</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="moral" checked={includeMoral} onCheckedChange={(checked) => setIncludeMoral(!!checked)} disabled={loading} />
                <label htmlFor="moral" className="text-sm cursor-pointer">Moral dilemmas or choices</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="setPieces" checked={includeSetPieces} onCheckedChange={(checked) => setIncludeSetPieces(!!checked)} disabled={loading} />
                <label htmlFor="setPieces" className="text-sm cursor-pointer">Memorable set pieces or encounters</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sideObjectives" checked={includeSideObjectives} onCheckedChange={(checked) => setIncludeSideObjectives(!!checked)} disabled={loading} />
                <label htmlFor="sideObjectives" className="text-sm cursor-pointer">Optional side objectives</label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="respectCodex" checked={respectCodex} onCheckedChange={(checked) => setRespectCodex(!!checked)} disabled={loading} />
            <label htmlFor="respectCodex" className="text-sm cursor-pointer">
              Respect Campaign Codex
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate content aligned with your campaign themes and style
          </p>

          {!result && (
            <div className="flex gap-2 justify-end pt-4">
              <Button
                onClick={handleClose}
                variant="ghost"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleGenerate(true)}
                variant="outline"
                disabled={loading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Surprise Me
              </Button>
              <Button
                onClick={() => handleGenerate(false)}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate Hook</>
                )}
              </Button>
            </div>
          )}

          {result && (
            <>
              <Separator />

              <div className="space-y-4 bg-secondary/30 rounded-lg p-4 border border-cyan-500/20">
                <div>
                  <Label className="text-cyan-500 text-xs font-semibold">Plot Hook</Label>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{result.hook}</p>
                </div>

                {result.details && (
                  <div>
                    <Label className="text-cyan-500 text-xs font-semibold">Details</Label>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{result.details}</p>
                  </div>
                )}

                {result.flair && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-sm italic text-muted-foreground">{result.flair}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={handleSave}
                  variant="outline"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save to Memory
                </Button>
                <Button
                  onClick={() => handleGenerate(false)}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
