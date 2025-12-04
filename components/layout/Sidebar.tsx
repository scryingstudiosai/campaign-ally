'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, User, Hammer, Book, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { href: '/app/forge', label: 'Forge', icon: Hammer },
  { href: '/app/prep', label: 'Prep', icon: BookOpen },
  { href: '/app/memory', label: 'Memory', icon: BookOpen },
  { href: '/app/codex', label: 'Codex', icon: Book },
  { href: '/app/account', label: 'Account', icon: User },
];

const DiscordIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <nav className="p-5 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onMobileClose?.()}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150',
              isActive && 'bg-secondary text-primary',
              !isActive && 'hover:bg-secondary/50'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        );
      })}

      <div className="pt-4 space-y-3">
        <Separator />
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-2">
            Questions? Ideas? Bugs?
          </p>
          <div className="space-y-1">
            <a
              href="https://discord.gg/HgU8jKbJKR"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onMobileClose?.()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 hover:bg-secondary/50 text-sm"
            >
              <DiscordIcon />
              <span>Join Discord</span>
            </a>
            <a
              href="https://www.tiktok.com/@campaignally"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onMobileClose?.()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 hover:bg-secondary/50 text-sm"
            >
              <TikTokIcon />
              <span>@campaignally</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="w-64 bg-card border-r border-border/50 flex-col hidden lg:flex">
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
