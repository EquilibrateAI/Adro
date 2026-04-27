"use client";

import { MenuItem, MenuContainer } from "@/components/ui/fluid-menu";
import {
  Menu as MenuIcon,
  X,
  LayoutDashboard,
  LineChart,
  Database,
} from "lucide-react";
import Link from "next/link";

// This renders a floating menu at the bottom right with links to main sections
export function FluidMenuContainer() {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/10 to-transparent dark:from-gray-100/10 blur-3xl -z-10 rounded-full" />
        <MenuContainer>
          <div title="Menu">
            <MenuItem
              icon={
                <div className="relative w-6 h-6">
                  <div className="absolute inset-0 transition-all duration-300 ease-in-out origin-center opacity-100 scale-100 rotate-0 [div[data-expanded=true]_&]:opacity-0 [div[data-expanded=true]_&]:scale-0 [div[data-expanded=true]_&]:rotate-180">
                    <MenuIcon size={24} strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 transition-all duration-300 ease-in-out origin-center opacity-0 scale-0 -rotate-180 [div[data-expanded=true]_&]:opacity-100 [div[data-expanded=true]_&]:scale-100 [div[data-expanded=true]_&]:rotate-0">
                    <X size={24} strokeWidth={1.5} />
                  </div>
                </div>
              }
            />
          </div>

          <Link href="/dashboard" passHref legacyBehavior>
            <div title="Dashboard">
              <MenuItem
                icon={<LayoutDashboard size={24} strokeWidth={1.5} />}
              />
            </div>
          </Link>

          <Link href="/modeling" passHref legacyBehavior>
            <div title="Modeling">
              <MenuItem
                icon={<LineChart size={24} strokeWidth={1.5} />}
              />
            </div>
          </Link>

          <Link href="/data" passHref legacyBehavior>
            <div title="Data">
              <MenuItem
                icon={<Database size={24} strokeWidth={1.5} />}
              />
            </div>
          </Link>

          {/* <Link href="/settings" passHref legacyBehavior>
            <MenuItem 
              icon={<Settings size={24} strokeWidth={1.5} title="Settings" />}
              tooltip="Settings"
            />
          </Link> */}
        </MenuContainer>
      </div>
    </div>
  );
}