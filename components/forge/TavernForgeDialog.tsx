'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Store, Sparkles, Copy, Save, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useGenerationLimit } from '@/hooks/useGenerationLimit';
import { GenerationLimitModal } from './GenerationLimitModal';
import { useGenerationCount } from '@/contexts/GenerationCountContext';

interface TavernForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
}

interface TavernResult {
  name: string;
  owner?: string;
  staff?: string | Array<{name: string, role: string}>;
  signature_item?: string;
  unique_feature?: string;
  patrons?: string | Array<{name: string, description: string}>;
  plot_hooks?: string;
  secret?: string;
  description: string;
  flair?: string;
}

const ESTABLISHMENT_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'tavern', label: 'Tavern (rough, working class)' },
  { value: 'restaurant', label: 'High-end Restaurant' },
  { value: 'dockside', label: 'Dockside Dive' },
  { value: 'nobles', label: "Noble's Club" },
  { value: 'speakeasy', label: 'Underground Speakeasy' },
];

const ATMOSPHERE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'warm', label: 'Warm & Welcoming' },
  { value: 'rough', label: 'Rough & Rowdy' },
  { value: 'mysterious', label: 'Mysterious & Shadowy' },
  { value: 'quiet', label: 'Quiet & Peaceful' },
  { value: 'lively', label: 'Lively & Festive' },
  { value: 'dangerous', label: 'Dangerous & Tense' },
  { value: 'elegant', label: 'Elegant & Refined' },
  { value: 'strange', label: 'Strange & Unusual' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small (5-10 patrons)' },
  { value: 'medium', label: 'Medium (10-20 patrons)' },
  { value: 'large', label: 'Large (20-40 patrons)' },
  { value: 'massive', label: 'Massive (40+ patrons)' },
];

export default function TavernForgeDialog({ open, onOpenChange, campaignId, prefillName }: TavernForgeDialogProps) {
  const [tavernName, setTavernName] = useState('');

  useEffect(() => {
    if (prefillName) {
      setTavernName(prefillName);
    }
  }, [prefillName]);
  const [concept, setConcept] = useState('');
  const [establishmentType, setEstablishmentType] = useState('any');
  const [atmosphere, setAtmosphere] = useState('any');
  const [size, setSize] = useState('medium');
  const [includeOwner, setIncludeOwner] = useState(true);
  const [includeStaff, setIncludeStaff] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeFeature, setIncludeFeature] = useState(true);
  const [includePatrons, setIncludePatrons] = useState(true);
  const [includePlotHooks, setIncludePlotHooks] = useState(true);
  const [includeSecret, setIncludeSecret] = useState(true);
  const [respectCodex, setRespectCodex] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TavernResult | null>(null);
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

      const response = await fetch('/api/ai/panic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'tavern',
          campaignId,
          tavernName: surpriseMe ? undefined : (tavernName || undefined),
          concept: surpriseMe ? undefined : (concept || undefined),
          establishmentType: surpriseMe ? undefined : establishmentType,
          atmosphere: surpriseMe ? undefined : atmosphere,
          size: surpriseMe ? undefined : size,
          includeDetails: {
            owner: includeOwner,
            staff: includeStaff,
            signature: includeSignature,
            feature: includeFeature,
            patrons: includePatrons,
            plotHooks: includePlotHooks,
            secret: includeSecret,
          },
          respectCodex,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Generation failed',
          description: data.error || 'Failed to generate tavern',
          variant: 'destructive',
        });
        return;
      }

      setResult(data.result);
      toast({
        title: 'Tavern generated',
        description: 'Your tavern is ready!',
      });
    } catch (error) {
      console.error('Tavern generation error:', error);
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

    let text = `**${result.name}**\n\n`;

    if (result.description) {
      text += `**Description:**\n${result.description}\n\n`;
    }

    if (result.owner) {
      text += `**Owner:** ${result.owner}\n\n`;
    }

    if (result.staff) {
      if (Array.isArray(result.staff)) {
        text += `**Notable Staff:**\n`;
        result.staff.forEach(staff => {
          text += `- ${staff.name}${staff.role ? ` - ${staff.role}` : ''}\n`;
        });
        text += '\n';
      } else {
        text += `**Notable Staff:** ${result.staff}\n\n`;
      }
    }

    if (result.signature_item) {
      text += `**Signature Item:** ${result.signature_item}\n\n`;
    }

    if (result.unique_feature) {
      text += `**Unique Feature:** ${result.unique_feature}\n\n`;
    }

    if (result.patrons) {
      if (Array.isArray(result.patrons)) {
        text += `**Current Patrons:**\n`;
        result.patrons.forEach(patron => {
          text += `- ${patron.name}${patron.description ? ` ${patron.description}` : ''}\n`;
        });
        text += '\n';
      } else {
        text += `**Current Patrons:**\n${result.patrons}\n\n`;
      }
    }

    if (result.plot_hooks) {
      text += `**Plot Hooks:**\n${result.plot_hooks}\n\n`;
    }

    if (result.secret) {
      text += `**Secret:** ${result.secret}\n\n`;
    }

    if (result.flair) {
      text += `**Flair:** ${result.flair}`;
    }

    navigator.clipboard.writeText(text.trim());
    toast({
      title: 'Copied to clipboard',
      description: 'Tavern details copied successfully',
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

      const title = result.name;
      let textContent = `${result.name}\n`;

      if (result.description) {
        textContent += `${result.description}\n\n`;
      }

      if (result.owner) {
        textContent += `Owner: ${result.owner}\n\n`;
      }

      if (result.staff) {
        if (Array.isArray(result.staff)) {
          textContent += 'Notable Staff:\n';
          result.staff.forEach(staff => {
            textContent += `${staff.name}${staff.role ? ` - ${staff.role}` : ''}\n`;
          });
          textContent += '\n';
        } else {
          textContent += `Notable Staff: ${result.staff}\n\n`;
        }
      }

      if (result.signature_item) {
        textContent += `Signature Item: ${result.signature_item}\n\n`;
      }

      if (result.unique_feature) {
        textContent += `Unique Feature: ${result.unique_feature}\n\n`;
      }

      if (result.patrons) {
        if (Array.isArray(result.patrons)) {
          textContent += 'Current Patrons:\n';
          result.patrons.forEach(patron => {
            textContent += `${patron.name}${patron.description ? ` ${patron.description}` : ''}\n`;
          });
          textContent += '\n';
        } else {
          textContent += `Current Patrons:\n${result.patrons}\n\n`;
        }
      }

      if (result.plot_hooks) {
        textContent += `Plot Hooks:\n${result.plot_hooks}\n\n`;
      }

      if (result.secret) {
        textContent += `Secret: ${result.secret}`;
      }

      const insertData = {
        campaign_id: campaignId,
        type: 'location',
        title,
        text_content: textContent.trim(),
        content: result,
        forge_type: 'tavern',
        tags: [],
      };

      console.log('[TavernForge] Saving tavern to memory_chunks:', insertData);

      const { data, error } = await supabase.from('memory_chunks').insert(insertData).select();

      if (error) {
        console.error('[TavernForge] Save error:', error);
        throw error;
      }

      console.log('[TavernForge] Saved successfully:', data);

      // Refresh the generation count after successful save (trigger auto-increments in DB)
      await refreshCount();

      toast({
        title: 'Saved to memory',
        description: 'Tavern has been saved to your campaign memory',
      });
    } catch (error: any) {
      console.error('[TavernForge] Save error:', error);
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save tavern to memory',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setTavernName('');
    setConcept('');
    setEstablishmentType('any');
    setAtmosphere('any');
    setSize('medium');
    setIncludeOwner(true);
    setIncludeStaff(true);
    setIncludeSignature(true);
    setIncludeFeature(true);
    setIncludePatrons(true);
    setIncludePlotHooks(true);
    setIncludeSecret(true);
    setRespectCodex(true);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <DialogTitle>Tavern Forge</DialogTitle>
          </div>
          <DialogDescription>
            Generate a unique establishment with atmosphere, owner, and hooks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tavern-name">Tavern Name (Optional)</Label>
            <Input
              id="tavern-name"
              placeholder="Leave empty for random name"
              value={tavernName}
              onChange={(e) => setTavernName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tavern-concept">Concept (Optional)</Label>
            <Textarea
              id="tavern-concept"
              placeholder="E.g., 'A mysterious tavern at a crossroads run by a half-orc with an ogre bodyguard' or 'Cozy roadside inn, warm atmosphere' or leave blank for random"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              disabled={loading}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Describe the type of establishment, atmosphere, or specific details you want
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="establishment-type">Establishment Type</Label>
              <Select value={establishmentType} onValueChange={setEstablishmentType} disabled={loading}>
                <SelectTrigger id="establishment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTABLISHMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="atmosphere">Atmosphere</Label>
              <Select value={atmosphere} onValueChange={setAtmosphere} disabled={loading}>
                <SelectTrigger id="atmosphere">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATMOSPHERE_OPTIONS.map((atmo) => (
                    <SelectItem key={atmo.value} value={atmo.value}>
                      {atmo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize} disabled={loading}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((sizeOpt) => (
                    <SelectItem key={sizeOpt.value} value={sizeOpt.value}>
                      {sizeOpt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-owner"
                  checked={includeOwner}
                  onCheckedChange={(checked) => setIncludeOwner(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-owner" className="text-sm font-normal cursor-pointer">
                  Owner NPC (with personality)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-staff"
                  checked={includeStaff}
                  onCheckedChange={(checked) => setIncludeStaff(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-staff" className="text-sm font-normal cursor-pointer">
                  Notable staff member
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-signature"
                  checked={includeSignature}
                  onCheckedChange={(checked) => setIncludeSignature(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-signature" className="text-sm font-normal cursor-pointer">
                  Signature drink/food
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-feature"
                  checked={includeFeature}
                  onCheckedChange={(checked) => setIncludeFeature(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-feature" className="text-sm font-normal cursor-pointer">
                  Unique feature (architecture/decor)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-patrons"
                  checked={includePatrons}
                  onCheckedChange={(checked) => setIncludePatrons(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-patrons" className="text-sm font-normal cursor-pointer">
                  Current patrons (2-3 notable)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-plot-hooks"
                  checked={includePlotHooks}
                  onCheckedChange={(checked) => setIncludePlotHooks(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-plot-hooks" className="text-sm font-normal cursor-pointer">
                  Plot hooks or rumors
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-secret"
                  checked={includeSecret}
                  onCheckedChange={(checked) => setIncludeSecret(!!checked)}
                  disabled={loading}
                />
                <Label htmlFor="include-secret" className="text-sm font-normal cursor-pointer">
                  Secret or hidden element
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="respect-codex"
              checked={respectCodex}
              onCheckedChange={(checked) => setRespectCodex(!!checked)}
              disabled={loading}
            />
            <Label htmlFor="respect-codex" className="text-sm cursor-pointer">
              Respect Campaign Codex
            </Label>
          </div>

          {!result && (
            <div className="flex gap-2 justify-end">
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
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate Tavern</>
                )}
              </Button>
            </div>
          )}

          {result && (
            <>
              <Separator />

              <div className="space-y-4 bg-secondary/30 rounded-lg p-4 border border-primary/20">
                <div>
                  <h3 className="text-xl font-bold mb-4">{result.name}</h3>
                </div>

                <div className="space-y-3">
                  {result.description && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Description</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{result.description}</p>
                    </div>
                  )}

                  {result.owner && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Owner</Label>
                      <p className="text-sm mt-1">{result.owner}</p>
                    </div>
                  )}

                  {result.staff && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Notable Staff</Label>
                      {Array.isArray(result.staff) ? (
                        <div className="text-sm mt-1 space-y-1">
                          {result.staff.map((staff, idx) => (
                            <div key={idx}>
                              <span className="font-medium">{staff.name}</span>
                              {staff.role && <span className="text-muted-foreground"> - {staff.role}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm mt-1">{result.staff}</p>
                      )}
                    </div>
                  )}

                  {result.signature_item && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Signature Item</Label>
                      <p className="text-sm mt-1">{result.signature_item}</p>
                    </div>
                  )}

                  {result.unique_feature && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Unique Feature</Label>
                      <p className="text-sm mt-1">{result.unique_feature}</p>
                    </div>
                  )}

                  {result.patrons && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Current Patrons</Label>
                      {Array.isArray(result.patrons) ? (
                        <div className="text-sm mt-1 space-y-1">
                          {result.patrons.map((patron, idx) => (
                            <div key={idx}>
                              <span className="font-medium">{patron.name}</span>
                              {patron.description && <span className="text-muted-foreground"> {patron.description}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm mt-1 whitespace-pre-wrap">{result.patrons}</p>
                      )}
                    </div>
                  )}

                  {result.plot_hooks && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Plot Hooks</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{result.plot_hooks}</p>
                    </div>
                  )}

                  {result.secret && (
                    <div>
                      <Label className="text-primary text-xs font-semibold">Secret</Label>
                      <p className="text-sm mt-1">{result.secret}</p>
                    </div>
                  )}

                  {result.flair && (
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-sm italic text-muted-foreground">{result.flair}</p>
                    </div>
                  )}
                </div>
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
