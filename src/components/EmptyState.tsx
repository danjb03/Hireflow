import { Button } from "@/components/ui/button";
import { LucideIcon, FileText, Users, Calendar, Search, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#222121]/20 bg-[#F7F7F7] px-6 py-14 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <Icon className="h-8 w-8 text-[#34B192]" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#222121]">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-[#222121]/60">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant="ghost"
              className="h-10 gap-2 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Pre-configured empty states for common use cases
export const NoLeadsEmpty = ({ onAction }: { onAction?: () => void }) => (
  <EmptyState
    icon={FileText}
    title="No leads found"
    description="There are no leads matching your current filters. Try adjusting your search or filters."
    action={onAction ? { label: "Clear Filters", onClick: onAction } : undefined}
  />
);

export const NoClientsEmpty = ({ onAction }: { onAction?: () => void }) => (
  <EmptyState
    icon={Users}
    title="No clients yet"
    description="Get started by inviting your first client to the platform."
    action={onAction ? { label: "Invite Client", onClick: onAction } : undefined}
  />
);

export const NoBookingsEmpty = ({ onAction }: { onAction?: () => void }) => (
  <EmptyState
    icon={Calendar}
    title="No bookings scheduled"
    description="There are no bookings for the selected date. Check another date or view all leads."
    action={onAction ? { label: "View All Leads", onClick: onAction } : undefined}
  />
);

export const NoSearchResultsEmpty = ({ onAction }: { onAction?: () => void }) => (
  <EmptyState
    icon={Search}
    title="No results found"
    description="We couldn't find anything matching your search. Try different keywords."
    action={onAction ? { label: "Clear Search", onClick: onAction } : undefined}
  />
);

export default EmptyState;
