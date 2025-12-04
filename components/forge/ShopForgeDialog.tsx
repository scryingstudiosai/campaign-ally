'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Store, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

interface ShopForgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  prefillName?: string;
}

export default function ShopForgeDialog({ open, onOpenChange, campaignId, prefillName }: ShopForgeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [shopName, setShopName] = useState('');

  useEffect(() => {
    if (prefillName) {
      setShopName(prefillName);
    }
  }, [prefillName]);
  const [concept, setConcept] = useState('');
  const [shopType, setShopType] = useState('general');
  const [quality, setQuality] = useState('standard');
  const [size, setSize] = useState('medium');
  const [location, setLocation] = useState('any');
  const [priceRange, setPriceRange] = useState('fair');
  const [inventoryStyle, setInventoryStyle] = useState('any');
  const [ownerPersonality, setOwnerPersonality] = useState('any');
  const [specialFeature, setSpecialFeature] = useState('none');
  const [respectCodex, setRespectCodex] = useState(true);

  const [includePhysical, setIncludePhysical] = useState(true);
  const [includeOwner, setIncludeOwner] = useState(true);
  const [includeStaff, setIncludeStaff] = useState(true);
  const [includeInventory, setIncludeInventory] = useState(true);
  const [includeUnique, setIncludeUnique] = useState(true);
  const [includePrices, setIncludePrices] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeSecurity, setIncludeSecurity] = useState(true);
  const [includeHooks, setIncludeHooks] = useState(true);
  const [includeCustomers, setIncludeCustomers] = useState(true);

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
        if (shopType !== 'general') detailParts.push(`${shopType} shop`);
        if (quality !== 'standard') detailParts.push(`${quality} quality`);
        if (size !== 'medium') detailParts.push(`${size} size`);
        if (location !== 'any') detailParts.push(`located in ${location}`);
        if (priceRange !== 'fair') detailParts.push(`${priceRange} prices`);
        if (inventoryStyle !== 'any') detailParts.push(`${inventoryStyle} inventory`);
        if (ownerPersonality !== 'any') detailParts.push(`${ownerPersonality} owner`);
        if (specialFeature !== 'none') detailParts.push(`special feature: ${specialFeature}`);

        if (detailParts.length > 0) {
          if (conceptText) {
            conceptText += `. Details: ${detailParts.join(', ')}`;
          } else {
            conceptText = detailParts.join(', ');
          }
        }
      }

      if (!conceptText || conceptText.length < 3) {
        conceptText = 'Create an interesting and memorable shop for my campaign';
      }

      const payload: any = {
        campaignId,
        concept: conceptText,
      };

      const response = await fetch('/api/ai/forge/shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate shop');
      }

      toast({
        title: 'Shop generated',
        description: 'Your shop has been saved to Memory.',
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Shop generation error:', error);
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
    setShopName('');
    setConcept('');
    setShopType('general');
    setQuality('standard');
    setSize('medium');
    setLocation('any');
    setPriceRange('fair');
    setInventoryStyle('any');
    setOwnerPersonality('any');
    setSpecialFeature('none');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-cyan-500" />
            <div>
              <DialogTitle>Shop Forge</DialogTitle>
              <DialogDescription>
                Create memorable shops with unique owners and inventory
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="shopName">Shop Name (Optional)</Label>
            <Input
              id="shopName"
              placeholder="Leave empty for random name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="concept">Concept (Optional)</Label>
            <Textarea
              id="concept"
              placeholder="E.g., 'Eccentric wizard's curio shop with talking cat' or 'Dwarven weaponsmith with family secrets' or leave blank for random"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe the shop's specialty, owner, or unique features
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shopType">Shop Type</Label>
              <Select value={shopType} onValueChange={setShopType}>
                <SelectTrigger id="shopType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Store</SelectItem>
                  <SelectItem value="blacksmith">Blacksmith/Weaponsmith</SelectItem>
                  <SelectItem value="armorer">Armorer</SelectItem>
                  <SelectItem value="alchemist">Alchemist/Apothecary</SelectItem>
                  <SelectItem value="magic">Magic Shop/Arcana</SelectItem>
                  <SelectItem value="bookshop">Bookshop/Library</SelectItem>
                  <SelectItem value="jewelry">Jewelry/Gems</SelectItem>
                  <SelectItem value="clothing">Clothing/Tailor</SelectItem>
                  <SelectItem value="stables">Stables</SelectItem>
                  <SelectItem value="pawnshop">Pawnshop</SelectItem>
                  <SelectItem value="herbalist">Herbalist</SelectItem>
                  <SelectItem value="adventuring">Adventuring Supplies</SelectItem>
                  <SelectItem value="exotic">Exotic Imports</SelectItem>
                  <SelectItem value="black-market">Black Market</SelectItem>
                  <SelectItem value="curiosities">Curiosities/Oddities</SelectItem>
                  <SelectItem value="instrument">Instrument Shop</SelectItem>
                  <SelectItem value="bakery">Bakery/Food</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quality">Quality/Reputation</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shabby">Shabby</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="renowned">Renowned</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiny">Tiny (stall/cart)</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="massive">Massive (emporium)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="market">Market Square</SelectItem>
                  <SelectItem value="main-street">Main Street</SelectItem>
                  <SelectItem value="side-street">Side Street</SelectItem>
                  <SelectItem value="wealthy">Wealthy District</SelectItem>
                  <SelectItem value="poor">Poor District</SelectItem>
                  <SelectItem value="docks">Near Docks</SelectItem>
                  <SelectItem value="gates">Near Gates</SelectItem>
                  <SelectItem value="residential">Residential Area</SelectItem>
                  <SelectItem value="underground">Underground</SelectItem>
                  <SelectItem value="hidden">Hidden/Secret</SelectItem>
                  <SelectItem value="temple-district">Temple District</SelectItem>
                  <SelectItem value="academic">Academic Quarter</SelectItem>
                  <SelectItem value="entertainment">Entertainment District</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceRange">Price Range</Label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger id="priceRange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheap">Cheap (50-75% normal)</SelectItem>
                  <SelectItem value="fair">Fair (normal prices)</SelectItem>
                  <SelectItem value="expensive">Expensive (125-150% normal)</SelectItem>
                  <SelectItem value="very-expensive">Very Expensive (200%+ normal)</SelectItem>
                  <SelectItem value="negotiable">Negotiable/Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="inventoryStyle">Inventory Style</Label>
              <Select value={inventoryStyle} onValueChange={setInventoryStyle}>
                <SelectTrigger id="inventoryStyle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="common">Common Items Only</SelectItem>
                  <SelectItem value="rare">Rare Finds</SelectItem>
                  <SelectItem value="magical">Magical Items</SelectItem>
                  <SelectItem value="custom">Custom Crafted</SelectItem>
                  <SelectItem value="mundane-quality">Mundane But Quality</SelectItem>
                  <SelectItem value="eclectic">Eclectic Mix</SelectItem>
                  <SelectItem value="specialized">Specialized Niche</SelectItem>
                  <SelectItem value="illegal">Illegal Goods</SelectItem>
                  <SelectItem value="enchanting">Enchanting Services</SelectItem>
                  <SelectItem value="repair">Repair Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ownerPersonality">Owner Personality (Optional)</Label>
            <Select value={ownerPersonality} onValueChange={setOwnerPersonality}>
              <SelectTrigger id="ownerPersonality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="friendly">Friendly/Welcoming</SelectItem>
                <SelectItem value="gruff">Gruff/Business-only</SelectItem>
                <SelectItem value="eccentric">Eccentric/Quirky</SelectItem>
                <SelectItem value="suspicious">Suspicious/Paranoid</SelectItem>
                <SelectItem value="chatty">Chatty/Gossip</SelectItem>
                <SelectItem value="mysterious">Mysterious</SelectItem>
                <SelectItem value="greedy">Greedy</SelectItem>
                <SelectItem value="honest">Fair/Honest</SelectItem>
                <SelectItem value="proud">Proud/Boastful</SelectItem>
                <SelectItem value="wise">Wise/Mentorlike</SelectItem>
                <SelectItem value="desperate">Desperate</SelectItem>
                <SelectItem value="secretive">Secretive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="specialFeature">Special Feature (Optional)</Label>
            <Select value={specialFeature} onValueChange={setSpecialFeature}>
              <SelectTrigger id="specialFeature">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="back-room">Hidden Back Room</SelectItem>
                <SelectItem value="magical-security">Magical Security</SelectItem>
                <SelectItem value="talking-pet">Talking Pet/Familiar</SelectItem>
                <SelectItem value="enchanted-items">Enchanted Items</SelectItem>
                <SelectItem value="artifacts">Historical Artifacts</SelectItem>
                <SelectItem value="curse">Curse/Blessing</SelectItem>
                <SelectItem value="secret-society">Secret Society Connection</SelectItem>
                <SelectItem value="underground-access">Underground Access</SelectItem>
                <SelectItem value="portal">Portal to Other Location</SelectItem>
                <SelectItem value="sentient">Sentient Building</SelectItem>
                <SelectItem value="ghost">Previous Owner's Ghost</SelectItem>
                <SelectItem value="unique-craft">Unique Crafting Technique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Include Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePhysical"
                  checked={includePhysical}
                  onCheckedChange={(checked) => setIncludePhysical(!!checked)}
                />
                <label htmlFor="includePhysical" className="text-sm cursor-pointer">
                  Physical description & atmosphere
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeOwner"
                  checked={includeOwner}
                  onCheckedChange={(checked) => setIncludeOwner(!!checked)}
                />
                <label htmlFor="includeOwner" className="text-sm cursor-pointer">
                  Owner NPC (full personality)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeStaff"
                  checked={includeStaff}
                  onCheckedChange={(checked) => setIncludeStaff(!!checked)}
                />
                <label htmlFor="includeStaff" className="text-sm cursor-pointer">
                  Staff/assistants (if applicable)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeInventory"
                  checked={includeInventory}
                  onCheckedChange={(checked) => setIncludeInventory(!!checked)}
                />
                <label htmlFor="includeInventory" className="text-sm cursor-pointer">
                  Sample inventory (10-15 items)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeUnique"
                  checked={includeUnique}
                  onCheckedChange={(checked) => setIncludeUnique(!!checked)}
                />
                <label htmlFor="includeUnique" className="text-sm cursor-pointer">
                  Unique/signature items
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePrices"
                  checked={includePrices}
                  onCheckedChange={(checked) => setIncludePrices(!!checked)}
                />
                <label htmlFor="includePrices" className="text-sm cursor-pointer">
                  Prices and special offers
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHistory"
                  checked={includeHistory}
                  onCheckedChange={(checked) => setIncludeHistory(!!checked)}
                />
                <label htmlFor="includeHistory" className="text-sm cursor-pointer">
                  Shop history & reputation
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSecurity"
                  checked={includeSecurity}
                  onCheckedChange={(checked) => setIncludeSecurity(!!checked)}
                />
                <label htmlFor="includeSecurity" className="text-sm cursor-pointer">
                  Security measures
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHooks"
                  checked={includeHooks}
                  onCheckedChange={(checked) => setIncludeHooks(!!checked)}
                />
                <label htmlFor="includeHooks" className="text-sm cursor-pointer">
                  Plot hooks or secrets
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCustomers"
                  checked={includeCustomers}
                  onCheckedChange={(checked) => setIncludeCustomers(!!checked)}
                />
                <label htmlFor="includeCustomers" className="text-sm cursor-pointer">
                  Customer base & regulars
                </label>
              </div>
            </div>
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
              Generate Shop
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
