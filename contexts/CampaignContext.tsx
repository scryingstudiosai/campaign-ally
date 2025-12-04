'use client';

import { createContext, useContext, ReactNode } from 'react';

interface CampaignContextType {
  refreshCampaigns: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({
  children,
  refreshCampaigns,
}: {
  children: ReactNode;
  refreshCampaigns: () => void;
}) {
  return (
    <CampaignContext.Provider value={{ refreshCampaigns }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaignContext() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaignContext must be used within a CampaignProvider');
  }
  return context;
}
