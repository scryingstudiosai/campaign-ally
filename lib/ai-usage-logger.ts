export interface AIUsageLog {
  timestamp: string;
  endpoint: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  userId?: string;
  campaignId?: string;
  error?: string;
}

export function logAIUsage(log: AIUsageLog) {
  console.log('[AI Usage]', JSON.stringify(log));
}

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-3.5-turbo': { input: 0.0015 / 1000, output: 0.002 / 1000 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
  return (promptTokens * modelPricing.input) + (completionTokens * modelPricing.output);
}
