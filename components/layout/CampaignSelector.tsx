'use client';

import { useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Campaign } from '@/types/database';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CampaignSelectorProps {
  campaigns: Campaign[];
  currentCampaignId: string | null;
  onCampaignChange: (campaignId: string) => void;
  onCampaignsUpdate: () => void;
}

export function CampaignSelector({
  campaigns,
  currentCampaignId,
  onCampaignChange,
  onCampaignsUpdate,
}: CampaignSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSystem, setNewCampaignSystem] = useState('D&D 5e');
  const [newCampaignLevel, setNewCampaignLevel] = useState([1]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const currentCampaign = campaigns.find((c) => c.id === currentCampaignId);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: newCampaignName,
          system: newCampaignSystem,
          party_level: newCampaignLevel[0],
        })
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create campaign.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Campaign created',
        description: `${newCampaignName} is ready!`,
      });

      setNewCampaignName('');
      setNewCampaignSystem('D&D 5e');
      setNewCampaignLevel([1]);
      setIsDialogOpen(false);
      onCampaignsUpdate();
      onCampaignChange(data.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Connection lost. Check your internet.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1 md:gap-2 min-w-[100px] md:min-w-[200px] justify-between text-xs md:text-sm h-8 md:h-10 px-2 md:px-4">
            <span className="truncate">{currentCampaign?.name || 'Campaign'}</span>
            <ChevronDown className="h-3 w-3 md:h-4 md:w-4 opacity-50 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          {campaigns.map((campaign) => (
            <DropdownMenuItem
              key={campaign.id}
              onClick={() => onCampaignChange(campaign.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                {campaign.id === currentCampaignId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
                <span className="flex-1 truncate">{campaign.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent aria-describedby="campaign-dialog-description">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription id="campaign-dialog-description">
              Start a new adventure with your party
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                placeholder="The Lost Mines of Phandelver"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="system">Game System</Label>
              <Select value={newCampaignSystem} onValueChange={setNewCampaignSystem}>
                <SelectTrigger id="system">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D&D 5e">D&D 5e</SelectItem>
                  <SelectItem value="Pathfinder 2e">Pathfinder 2e</SelectItem>
                  <SelectItem value="Call of Cthulhu">Call of Cthulhu</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Party Level: {newCampaignLevel[0]}</Label>
              <Slider
                value={newCampaignLevel}
                onValueChange={setNewCampaignLevel}
                min={1}
                max={20}
                step={1}
                className="py-4"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
