'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const sidebarNavItems = [
  {
    title: "Profil",
    href: "/settings",
  },
  {
    title: "Sicherheit",
    href: "/settings/security",
  },
  {
    title: "Benachrichtigungen",
    href: "/settings/notifications",
  },
  {
    title: "Abrechnung",
    href: "/settings/billing",
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>
        <p className="text-muted-foreground">
          Verwalte deine Account-Einstellungen und Profil-Informationen.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {sidebarNavItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  pathname === item.href && "bg-muted hover:bg-muted"
                )}
              >
                <Link href={item.href}>{item.title}</Link>
              </Button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  )
}
