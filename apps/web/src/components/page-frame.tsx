import type { ReactNode } from "react";
import Link from "next/link";
import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";
import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: ReactNode;
  activeHref: string | undefined;
  showSidebar?: boolean;
};

export function PageFrame({ children, activeHref, showSidebar = false }: PageFrameProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <TopNav activeHref={activeHref} />
      {showSidebar ? <SideNav activeHref={activeHref} /> : null}
      <div className="sm-glow -left-24 top-20 h-72 w-72 bg-primary-container/20" />
      <div className="sm-glow -right-24 bottom-6 h-80 w-80 bg-secondary-container/15" />
      <main className={cn("relative z-10 py-10", showSidebar ? "xl:pl-64" : "")}>{children}</main>
      <footer className={cn("relative z-10 border-t border-white/8 py-6", showSidebar ? "xl:pl-64" : "") }>
        <div className="section-wrap flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
          <span>SafeMeet - Built on Base Sepolia</span>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="hover:text-white">How It Works</Link>
            <Link href="/docs" className="hover:text-white">API Docs</Link>
            <a href="https://github.com/Chidi09/safe-meet-web-app" target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a>
            <span>Base Buildathon</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
