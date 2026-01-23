import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  status: string;
  callback1: string | null;
  callback2: string | null;
  callback3: string | null;
  phone: string | null;
  email: string | null;
}

const ClientCalendar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leadsWithCallbacks, setLeadsWithCallbacks] = useState<Lead[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
    await fetchCallbacks();
  };

  const fetchCallbacks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("get-client-leads");

      if (error) throw error;

      // Filter leads that have callback1 (first callback date/time)
      const leadsWithCallback = (data.leads || []).filter((lead: any) => lead.callback1);
      console.log('Leads with callbacks:', leadsWithCallback.length, leadsWithCallback);
      setLeadsWithCallbacks(leadsWithCallback);
    } catch (error: any) {
      toast.error("Failed to load callbacks: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const parseCallbackDate = (callback: string): Date | null => {
    if (!callback) return null;

    // Airtable datetime is ISO format: 2025-01-15T14:30:00.000Z
    const parsed = new Date(callback);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  const formatCallbackTime = (callback: string): string => {
    const date = parseCallbackDate(callback);
    if (!date) return '';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const getLeadsForDate = (date: Date) => {
    return leadsWithCallbacks.filter(lead => {
      if (!lead.callback1) return false;
      const callbackDate = parseCallbackDate(lead.callback1);
      if (!callbackDate) return false;
      return callbackDate.toDateString() === date.toDateString();
    });
  };

  const hasLeadsOnDate = (date: Date) => {
    return getLeadsForDate(date).length > 0;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "new":
        return "bg-blue-500";
      case "approved":
      case "booked":
        return "bg-emerald-500";
      case "needs work":
      case "in progress":
        return "bg-yellow-500";
      case "rejected":
        return "bg-red-400";
      case "contacted":
        return "bg-blue-500";
      default:
        return "bg-blue-500";
    }
  };

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </ClientLayout>
    );
  }

  const selectedDayLeads = selectedDate ? getLeadsForDate(selectedDate) : [];

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Callbacks calendar
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">Calendar</h1>
            <p className="text-sm text-[#222121]/60">View your scheduled bookings</p>
          </div>
          <Button
            onClick={goToToday}
            variant="ghost"
            className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
          >
            Today
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Calendar */}
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#222121]">{monthName}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previousMonth}
                  className="h-9 w-9 rounded-full hover:bg-[#F5F5F5]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  className="h-9 w-9 rounded-full hover:bg-[#F5F5F5]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium uppercase text-[#222121]/40">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="p-2" />
              ))}
              
              {/* Calendar days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const leads = getLeadsForDate(date);
                const isToday = new Date().toDateString() === date.toDateString();
                const isSelected = selectedDate?.toDateString() === date.toDateString();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      min-h-[90px] rounded-xl border p-2 text-left transition-colors
                      ${isToday ? 'bg-[#34B192]/10 border-[#34B192]' : ''}
                      ${isSelected && !isToday ? 'ring-2 ring-[#34B192] bg-[#34B192]/5' : ''}
                      ${leads.length > 0 ? 'bg-[#F1FBF7] border-[#34B192]/30' : 'border-[#222121]/10 hover:bg-[#F7F7F7]'}
                    `}
                  >
                    <div className={`mb-1 text-sm font-medium ${isToday ? 'text-[#34B192]' : 'text-[#222121]'}`}>{day}</div>
                    <div className="space-y-1">
                      {leads.slice(0, 2).map(lead => (
                        <div
                          key={lead.id}
                          className="truncate rounded-full bg-[#34B192] px-2 py-0.5 text-xs font-medium text-white"
                          title={`${lead.companyName} - ${formatCallbackTime(lead.callback1!)}`}
                        >
                          📞 {formatCallbackTime(lead.callback1!)}
                        </div>
                      ))}
                      {leads.length > 2 && (
                        <div className="text-xs font-medium text-[#34B192]">+{leads.length - 2} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#222121]">
              <CalendarIcon className="h-4 w-4 text-[#34B192]" />
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              }) : 'Select a date'}
            </h3>
            {selectedDate && selectedDayLeads.length > 0 ? (
              <div className="space-y-4">
                {selectedDayLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="cursor-pointer rounded-xl border border-[#222121]/10 bg-white p-4 transition-colors hover:bg-[#F7F7F7]"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-[#222121]">{lead.companyName}</p>
                      <Badge variant="outline" className={`${getStatusColor(lead.status)} border-transparent text-white`}>
                        {lead.status}
                      </Badge>
                    </div>
                    {lead.contactName && (
                      <p className="mb-2 text-xs text-[#222121]/60">{lead.contactName}</p>
                    )}
                    {lead.callback1 && (
                      <p className="mb-1 flex items-center gap-2 text-sm font-medium text-[#34B192]">
                        <Clock className="h-3 w-3 text-[#34B192]" />
                        Callback: {formatCallbackTime(lead.callback1)}
                      </p>
                    )}
                    {lead.phone && (
                      <p className="text-xs text-[#222121]/60">
                        📞 {lead.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-10 w-10 mx-auto mb-4 text-[#222121]/30" />
                <p className="text-sm text-[#222121]/60">No bookings scheduled for this day</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-10 w-10 mx-auto mb-4 text-[#222121]/30" />
                <p className="text-sm text-[#222121]/60">Select a date to view bookings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientCalendar;
