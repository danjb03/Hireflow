import { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface NavMainProps {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
}

export function NavMain({ items }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end
                  activeClassName="bg-[#34B192]/10 text-[#222121] font-semibold"
                  className="rounded-full px-3 py-2 text-sm font-medium text-[#222121]/60 transition-colors duration-200 hover:bg-[#34B192]/5 hover:text-[#222121]"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
