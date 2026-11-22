import Link from "next/link";
import { Brand } from "@/components/brand";
import { BottomTabs, RailNav } from "@/components/layout/nav-items";
import { UserMenu } from "@/components/layout/user-menu";
import { WhoToFollow } from "@/components/social/who-to-follow";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
      {/* Desktop left rail */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r px-4 py-6 lg:flex">
        <Brand href="/feed" className="px-2" />
        <RailNav />
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
            <span>Theme</span>
            <ThemeToggle />
          </div>
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-2.5 backdrop-blur-xl lg:hidden">
          <Brand href="/feed" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu compact />
          </div>
        </header>

        <div className="flex flex-1 gap-8 px-4 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-8">
          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>

          {/* Desktop right rail */}
          <aside className="sticky top-8 hidden h-fit w-80 shrink-0 space-y-4 xl:block">
            <WhoToFollow />
            <footer className="px-2 text-xs text-muted-foreground">
              <p>
                TalentHub · made for creators ·{" "}
                <Link href="/" className="hover:text-foreground hover:underline">
                  About
                </Link>
              </p>
            </footer>
          </aside>
        </div>
      </div>

      <BottomTabs />
    </div>
  );
}
