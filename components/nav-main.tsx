"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Component for collapsed menu items with submenus
function CollapsedMenuItem({
  item,
  itemDisabled,
}: {
  item: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  };
  itemDisabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <PopoverTrigger asChild>
          <SidebarMenuButton tooltip={item.title} disabled={itemDisabled} isActive={item.isActive}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-56 p-1">
          <div className="space-y-1">
            {item.items?.map((subItem) => (
              <div key={subItem.title}>
                {itemDisabled ? (
                  <div className="px-3 py-2 text-sm rounded-md cursor-not-allowed opacity-50">{subItem.title}</div>
                ) : (
                  <Link
                    href={subItem.url}
                    className="block px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => {
                      setOpen(false);
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                    }}
                  >
                    {subItem.title}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </SidebarMenuItem>
    </Popover>
  );
}

export function NavMain({
  items,
  disabled = false,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    disabled?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  disabled?: boolean;
}) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarGroup>
      {/* <SidebarGroupLabel>Menu</SidebarGroupLabel> */}
      <SidebarMenu>
        {items.map((item) => {
          const itemDisabled = item.disabled !== undefined ? item.disabled : disabled;

          // If item has sub-items, render as collapsible or popover based on sidebar state
          if (item.items && item.items.length > 0) {
            // When collapsed, show popover on click
            if (isCollapsed) {
              // Use a sub-component to manage popover state per item
              return <CollapsedMenuItem key={item.title} item={item} itemDisabled={itemDisabled} />;
            }

            // When expanded, use collapsible as before
            return (
              <Collapsible key={item.title} asChild defaultOpen={item.isActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} disabled={itemDisabled} isActive={item.isActive}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          {itemDisabled ? (
                            <SidebarMenuSubButton className="cursor-not-allowed opacity-50" aria-disabled="true">
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          ) : (
                            <SidebarMenuSubButton asChild>
                              <Link href={subItem.url} onClick={() => isMobile && setOpenMobile(false)}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          )}
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          // Otherwise, render as simple link
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild={!itemDisabled}
                tooltip={item.title}
                isActive={item.isActive}
                disabled={itemDisabled}
              >
                {itemDisabled ? (
                  <>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </>
                ) : (
                  <Link href={item.url} onClick={() => isMobile && setOpenMobile(false)}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
