'use client';

import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: 'premise', label: 'Premise & Themes' },
  { id: 'pillars', label: 'Pillars' },
  { id: 'factions', label: 'Factions' },
  { id: 'arcs', label: 'Major Arcs' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'house-rules', label: 'House Rules' },
  { id: 'style', label: 'Style & Voice' },
  { id: 'foreshadowing', label: 'Foreshadowing' },
  { id: 'open-questions', label: 'Open Questions' },
];

interface CodexShellProps {
  children: ReactNode;
  activeSection?: string;
}

export function CodexShell({ children, activeSection }: CodexShellProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      <aside className="w-64 border-r bg-muted/30">
        <ScrollArea className="h-full">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Campaign Codex</h2>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    activeSection === section.id && 'bg-accent text-accent-foreground font-medium'
                  )}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
