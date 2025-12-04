'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface GuildForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
}

export default function GuildForgeDialog({ open, onOpenChange, campaignId, prefillName }: GuildForgeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [guildName, setGuildName] = useState('');

  useEffect(() => {
    if (prefillName) {
      setGuildName(prefillName);
    }
  }, [prefillName]);
  const [concept, setConcept] = useState('');
  const [guildType, setGuildType] = useState('any');
  const [influence, setInfluence] = useState('regional');
  const [alignment, setAlignment] = useState('any');
  const [membershipSize, setMembershipSize] = useState('medium');
  const [publicRep, setPublicRep] = useState('mixed');
  const [actualNature, setActualNature] = useState('same');
  const [primaryActivity, setPrimaryActivity] = useState('any');
  const [funding, setFunding] = useState('any');
  const [leadership, setLeadership] = useState('single');
  const [secrecy, setSecrecy] = useState('public');
  const [currentGoal, setCurrentGoal] = useState('routine');
  const [respectCodex, setRespectCodex] = useState(true);

  const handleGenerate = async (surpriseMe: boolean = false) => {
    setLoading(true);

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

        if (guildName.trim()) {
          detailParts.push(`name: ${guildName.trim()}`);
        }

        if (guildType !== 'any') detailParts.push(`${guildType} guild`);
        if (influence !== 'regional') detailParts.push(`${influence} influence`);
        if (alignment !== 'any') detailParts.push(`${alignment} alignment`);
        if (membershipSize !== 'medium') detailParts.push(`${membershipSize} membership`);
        if (publicRep !== 'mixed') detailParts.push(`${publicRep} reputation`);
        if (actualNature !== 'same') detailParts.push(`actually ${actualNature}`);
        if (primaryActivity !== 'any') detailParts.push(`focused on ${primaryActivity}`);
        if (funding !== 'any') detailParts.push(`funded by ${funding}`);
        if (leadership !== 'single') detailParts.push(`${leadership} leadership`);
        if (secrecy !== 'public') detailParts.push(`${secrecy} secrecy`);
        if (currentGoal !== 'routine') detailParts.push(`current goal: ${currentGoal}`);

        if (detailParts.length > 0) {
          if (conceptText) {
            conceptText += `. Details: ${detailParts.join(', ')}`;
          } else {
            conceptText = detailParts.join(', ');
          }
        }
      }

      if (!conceptText || conceptText.length < 3) {
        conceptText = 'Create an interesting guild or organization for my campaign';
      }

      const payload: any = {
        campaignId,
        concept: conceptText,
        respectCodex,
      };

      const response = await fetch('/api/ai/forge/guild', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate guild');
      }

      toast({
        title: 'Guild generated',
        description: 'Your guild has been saved to Memory.',
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Guild generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGuildName('');
    setConcept('');
    setGuildType('any');
    setInfluence('regional');
    setAlignment('any');
    setMembershipSize('medium');
    setPublicRep('mixed');
    setActualNature('same');
    setPrimaryActivity('any');
    setFunding('any');
    setLeadership('single');
    setSecrecy('public');
    setCurrentGoal('routine');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Guild Forge</DialogTitle>
              <DialogDescription>
                Create organizations, guilds, and factions with members and secrets
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="guildName">Guild Name (Optional)</Label>
            <Input
              id="guildName"
              placeholder="Leave empty for random name"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="E.g., 'Secretive assassin guild with code of honor' or 'Merchant consortium controlling trade routes' or 'Magical researchers preserving forbidden knowledge' or leave blank"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe the guild's purpose, methods, or secrets
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guildType">Guild Type</Label>
              <Select value={guildType} onValueChange={setGuildType}>
                <SelectTrigger id="guildType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="thieves">Thieves Guild</SelectItem>
                  <SelectItem value="assassins">Assassins Guild</SelectItem>
                  <SelectItem value="merchants">Merchants Guild</SelectItem>
                  <SelectItem value="crafters">Crafters Guild</SelectItem>
                  <SelectItem value="mages">Mages Guild</SelectItem>
                  <SelectItem value="adventurers">Adventurers Guild</SelectItem>
                  <SelectItem value="religious">Religious Order</SelectItem>
                  <SelectItem value="secret">Secret Society</SelectItem>
                  <SelectItem value="criminal">Criminal Syndicate</SelectItem>
                  <SelectItem value="scholars">Scholars/Library</SelectItem>
                  <SelectItem value="knights">Knightly Order</SelectItem>
                  <SelectItem value="mercenary">Mercenary Company</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="influence">Size/Influence</Label>
              <Select value={influence} onValueChange={setInfluence}>
                <SelectTrigger id="influence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (single city)</SelectItem>
                  <SelectItem value="regional">Regional (multiple cities)</SelectItem>
                  <SelectItem value="national">National (kingdom-wide)</SelectItem>
                  <SelectItem value="international">International (multiple nations)</SelectItem>
                  <SelectItem value="underground">Underground/Hidden</SelectItem>
                  <SelectItem value="declining">Declining</SelectItem>
                  <SelectItem value="rising">Rising Power</SelectItem>
                  <SelectItem value="legendary">Legendary Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="alignment">Alignment/Methods</Label>
              <Select value={alignment} onValueChange={setAlignment}>
                <SelectTrigger id="alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="lawful-good">Lawful Good</SelectItem>
                  <SelectItem value="neutral-good">Neutral Good</SelectItem>
                  <SelectItem value="chaotic-good">Chaotic Good</SelectItem>
                  <SelectItem value="lawful-neutral">Lawful Neutral</SelectItem>
                  <SelectItem value="true-neutral">True Neutral</SelectItem>
                  <SelectItem value="chaotic-neutral">Chaotic Neutral</SelectItem>
                  <SelectItem value="lawful-evil">Lawful Evil</SelectItem>
                  <SelectItem value="neutral-evil">Neutral Evil</SelectItem>
                  <SelectItem value="chaotic-evil">Chaotic Evil</SelectItem>
                  <SelectItem value="mixed">Mixed/Complex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="membershipSize">Membership Size</Label>
              <Select value={membershipSize} onValueChange={setMembershipSize}>
                <SelectTrigger id="membershipSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiny">Tiny (5-20 members)</SelectItem>
                  <SelectItem value="small">Small (20-100 members)</SelectItem>
                  <SelectItem value="medium">Medium (100-500 members)</SelectItem>
                  <SelectItem value="large">Large (500-2000 members)</SelectItem>
                  <SelectItem value="massive">Massive (2000+ members)</SelectItem>
                  <SelectItem value="cells">Cell Structure (unknown total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="publicRep">Public Reputation</Label>
              <Select value={publicRep} onValueChange={setPublicRep}>
                <SelectTrigger id="publicRep">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown/Secret</SelectItem>
                  <SelectItem value="feared">Feared</SelectItem>
                  <SelectItem value="respected">Respected</SelectItem>
                  <SelectItem value="mistrusted">Mistrusted</SelectItem>
                  <SelectItem value="admired">Admired</SelectItem>
                  <SelectItem value="necessary-evil">Necessary Evil</SelectItem>
                  <SelectItem value="controversial">Controversial</SelectItem>
                  <SelectItem value="benevolent">Benevolent</SelectItem>
                  <SelectItem value="corrupt">Corrupt</SelectItem>
                  <SelectItem value="mixed">Mixed Opinions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="actualNature">Actual Nature</Label>
              <Select value={actualNature} onValueChange={setActualNature}>
                <SelectTrigger id="actualNature">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">Same as reputation</SelectItem>
                  <SelectItem value="more-noble">More Noble</SelectItem>
                  <SelectItem value="more-corrupt">More Corrupt</SelectItem>
                  <SelectItem value="front">Front for something else</SelectItem>
                  <SelectItem value="misunderstood">Misunderstood</SelectItem>
                  <SelectItem value="infiltrated">Infiltrated/Compromised</SelectItem>
                  <SelectItem value="ancient">Ancient/Mysterious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryActivity">Primary Activity</Label>
              <Select value={primaryActivity} onValueChange={setPrimaryActivity}>
                <SelectTrigger id="primaryActivity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="trade">Trade/Commerce</SelectItem>
                  <SelectItem value="crime">Crime</SelectItem>
                  <SelectItem value="magic-research">Magic Research</SelectItem>
                  <SelectItem value="assassination">Assassination</SelectItem>
                  <SelectItem value="information">Information Gathering</SelectItem>
                  <SelectItem value="protection">Protection/Security</SelectItem>
                  <SelectItem value="artifacts">Artifact Collection</SelectItem>
                  <SelectItem value="political">Political Influence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="funding">Funding Source</Label>
              <Select value={funding} onValueChange={setFunding}>
                <SelectTrigger id="funding">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="dues">Member Dues</SelectItem>
                  <SelectItem value="trade">Trade/Commerce</SelectItem>
                  <SelectItem value="illegal">Illegal Activities</SelectItem>
                  <SelectItem value="patron">Wealthy Patron</SelectItem>
                  <SelectItem value="government">Government Support</SelectItem>
                  <SelectItem value="religious">Religious Donations</SelectItem>
                  <SelectItem value="contracts">Contract Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leadership">Leadership Structure</Label>
              <Select value={leadership} onValueChange={setLeadership}>
                <SelectTrigger id="leadership">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Leader</SelectItem>
                  <SelectItem value="council">Council of Leaders</SelectItem>
                  <SelectItem value="democratic">Democratic Vote</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical Ranks</SelectItem>
                  <SelectItem value="mysterious">Mysterious Master</SelectItem>
                  <SelectItem value="rotating">Rotating Leadership</SelectItem>
                  <SelectItem value="decentralized">Decentralized Cells</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="secrecy">Secrecy Level</Label>
              <Select value={secrecy} onValueChange={setSecrecy}>
                <SelectTrigger id="secrecy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Organization</SelectItem>
                  <SelectItem value="semi-secret">Semi-Secret</SelectItem>
                  <SelectItem value="secret">Secret Society</SelectItem>
                  <SelectItem value="hidden-masters">Hidden Masters</SelectItem>
                  <SelectItem value="multiple-layers">Multiple Layers</SelectItem>
                  <SelectItem value="false-front">False Front</SelectItem>
                  <SelectItem value="paranoid">Paranoid Security</SelectItem>
                  <SelectItem value="exclusive">Open But Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="currentGoal">Current Goal/Mission (Optional)</Label>
            <Select value={currentGoal} onValueChange={setCurrentGoal}>
              <SelectTrigger id="currentGoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">None/Routine Operations</SelectItem>
                <SelectItem value="expand">Expand Influence</SelectItem>
                <SelectItem value="eliminate">Eliminate Rival</SelectItem>
                <SelectItem value="artifact">Obtain Artifact</SelectItem>
                <SelectItem value="coup">Political Coup</SelectItem>
                <SelectItem value="rescue">Rescue Member</SelectItem>
                <SelectItem value="prevent">Prevent Catastrophe</SelectItem>
                <SelectItem value="uncover">Uncover Conspiracy</SelectItem>
                <SelectItem value="protect">Protect Secret</SelectItem>
                <SelectItem value="recruit">Recruit Specific Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="respectCodex"
              checked={respectCodex}
              onCheckedChange={(checked) => setRespectCodex(!!checked)}
            />
            <label htmlFor="respectCodex" className="text-sm cursor-pointer">
              <div>Respect Campaign Codex</div>
              <div className="text-xs text-muted-foreground">
                Generate content aligned with your campaign themes and style
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleGenerate(true)}
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
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Guild
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
