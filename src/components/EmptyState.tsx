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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-gradient-to-b from-muted/30 to-muted/10 border-2 border-dashed rounded-2xl">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
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
