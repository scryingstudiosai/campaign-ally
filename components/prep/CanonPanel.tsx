'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';

interface Conflict {
  type: string;
  severity: 'high' | 'medium' | 'low';
  canon: string;
  draft: string;
  suggestedFix: string;
  autoFixable: boolean;
  affectedSceneIds?: string[];
}

interface CanonCheckResult {
  conflicts: Conflict[];
  warnings: string[];
  suggestions: string[];
  overallScore: number;
}

interface CanonPanelProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  sceneId?: string;
  content: string;
  type: 'scene' | 'outline';
  onComplete?: () => void;
}

export default function CanonPanel({
  open,
  onClose,
  campaignId,
  sceneId,
  content,
  type,
  onComplete,
}: CanonPanelProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [applyingFixes, setApplyingFixes] = useState(false);
  const [result, setResult] = useState<CanonCheckResult | null>(null);

  async function runCanonCheck() {
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/prep/canon-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          content,
          type,
          sceneId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        toast({
          title: 'Canon Check Complete',
          description: `Score: ${(data.data.overallScore * 100).toFixed(0)}%`,
        });
        if (onComplete) onComplete();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to run canon check',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run canon check',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  }

  async function applyAutoFixes() {
    if (!result) return;

    const autoFixableConflicts = result.conflicts.filter((c) => c.autoFixable);
    if (autoFixableConflicts.length === 0) {
      toast({
        title: 'No Auto-Fixes',
        description: 'There are no automatically fixable conflicts',
      });
      return;
    }

    setApplyingFixes(true);
    try {
      const fixes = autoFixableConflicts.map((c) => c.suggestedFix);

      const res = await fetch('/api/ai/prep/apply-canon-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          fixes,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Fixes Applied',
          description: `${fixes.length} fixes applied successfully`,
        });

        console.log('Corrected content:', data.data.corrected);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to apply fixes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply fixes',
        variant: 'destructive',
      });
    } finally {
      setApplyingFixes(false);
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Canon Consistency Check</DialogTitle>
          <DialogDescription>
            Verify that your content aligns with campaign lore and established facts
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Click below to analyze this {type} for canon consistency
            </p>
            <Button onClick={runCanonCheck} disabled={checking || !content.trim()}>
              {checking ? 'Checking...' : 'Run Canon Check'}
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">
                  {(result.overallScore * 100).toFixed(0)}%
                </div>
                <Badge variant={result.overallScore > 0.7 ? 'default' : 'destructive'}>
                  {result.overallScore > 0.7 ? 'Passes' : 'Needs Review'}
                </Badge>
              </div>
              <Button onClick={runCanonCheck} variant="outline" size="sm">
                Recheck
              </Button>
            </div>

            {result.conflicts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Conflicts ({result.conflicts.length})
                </h3>
                <div className="space-y-3">
                  {result.conflicts.map((conflict, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(conflict.severity)}>
                            {getSeverityIcon(conflict.severity)}
                            <span className="ml-1">{conflict.severity}</span>
                          </Badge>
                          <Badge variant="outline">{conflict.type.replace('_', ' ')}</Badge>
                          {conflict.autoFixable && (
                            <Badge variant="secondary" className="text-xs">
                              Auto-fixable
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Canon: </span>
                            <span>{conflict.canon}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Draft: </span>
                            <span>{conflict.draft}</span>
                          </div>
                          <div className="pt-2 border-t">
                            <span className="font-medium text-green-600">Fix: </span>
                            <span>{conflict.suggestedFix}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Warnings ({result.warnings.length})
                </h3>
                <ul className="space-y-1 text-sm">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Suggestions ({result.suggestions.length})
                </h3>
                <ul className="space-y-1 text-sm">
                  {result.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result && result.conflicts.some((c) => c.autoFixable) && (
            <Button onClick={applyAutoFixes} disabled={applyingFixes} variant="outline">
              {applyingFixes ? 'Applying...' : 'Apply Auto-Fixes'}
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
