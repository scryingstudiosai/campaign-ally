'use client';

import { createPortal } from 'react-dom';
import { Sparkles, User, MapPin, Package, Swords, X } from 'lucide-react';

interface HighlightConjureMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  sourceMemoryId: string;
  sourceMemoryName: string;
  sourceMemoryType: string;
  campaignId: string;
  onClose: () => void;
  onConjure: (type: string, text: string) => void;
}

export function HighlightConjureMenu({
  selectedText,
  position,
  onClose,
  onConjure
}: HighlightConjureMenuProps) {

  const entityTypes = [
    { type: 'NPC', label: 'NPC', icon: User },
    { type: 'Location', label: 'Location', icon: MapPin },
    { type: 'Item', label: 'Item', icon: Package },
    { type: 'Monster', label: 'Monster', icon: Swords }
  ];

  function handleButtonClick(type: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    console.log('🎯 Menu button clicked:', type, selectedText);

    // Call the conjure handler
    onConjure(type, selectedText);

    // Close the menu
    onClose();
  }

  const menu = (
    <div
      className="fixed z-[9999] bg-gray-800 border border-cyan-500/50 rounded-lg shadow-2xl p-2 min-w-[160px]"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        pointerEvents: 'all'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Conjure as...
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('❌ Close button clicked');
            onClose();
          }}
          className="text-gray-400 hover:text-white p-1"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1">
        {entityTypes.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={(e) => handleButtonClick(type, e)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-cyan-600/20 rounded transition-colors"
          >
            <Icon className="w-4 h-4 text-cyan-400" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(menu, document.body) : null;
}
