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
  contactName: string;
  status: string;
  booking: string | null;
  availability: string | null;
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

      // Filter leads that have a booking
      const leadsWithBooking = (data.leads || []).filter((lead: any) => lead.booking);
      setLeadsWithCallbacks(leadsWithBooking);
    } catch (error: any) {
      toast.error("Failed to load bookings: " + error.message);
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

  const parseBookingDate = (booking: string): Date | null => {
    // Try UK format first: DD/MM/YYYY (with optional time)
    const ukMatch = booking.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ukMatch) {
      const day = parseInt(ukMatch[1], 10);
      const month = parseInt(ukMatch[2], 10) - 1; // JS months are 0-indexed
      const year = parseInt(ukMatch[3], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try ISO format: YYYY-MM-DD
    const isoMatch = booking.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const parsed = new Date(isoMatch[0]);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try written format: January 15, 2025 or Jan 15, 2025
    const writtenMatch = booking.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i);
    if (writtenMatch) {
      const parsed = new Date(writtenMatch[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try direct parse as fallback
    const directParse = new Date(booking);
    if (!isNaN(directParse.getTime())) {
      return directParse;
    }

    return null;
  };

  const getLeadsForDate = (date: Date) => {
    return leadsWithCallbacks.filter(lead => {
      if (!lead.booking) return false;
      const bookingDate = parseBookingDate(lead.booking);
      if (!bookingDate) return false;
      return bookingDate.toDateString() === date.toDateString();
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
    switch (status.toLowerCase()) {
      case "booked":
        return "bg-success";
      case "in progress":
        return "bg-warning";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  const selectedDayLeads = selectedDate ? getLeadsForDate(selectedDate) : [];

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground mt-1">View your scheduled bookings</p>
          </div>
          <Button onClick={goToToday} className="bg-primary hover:bg-primary/90">Today</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Calendar */}
          <div className="bg-card border rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">{monthName}</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs font-medium text-muted-foreground uppercase text-center p-2">
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
                      rounded-lg hover:bg-muted/50 transition-colors p-2 min-h-[80px] text-left border
                      ${isToday ? 'bg-primary text-primary-foreground border-primary' : ''}
                      ${isSelected && !isToday ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <div className="font-medium text-sm mb-1">{day}</div>
                    <div className="space-y-1">
                      {leads.slice(0, 2).map(lead => (
                        <div key={lead.id} className={`w-2 h-2 rounded-full ${getStatusColor(lead.status)}`} />
                      ))}
                      {leads.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{leads.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5" />
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
                    className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-foreground">{lead.companyName}</p>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{lead.contactName}</p>
                    {lead.booking && (
                      <p className="text-sm font-medium text-emerald-600 flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4" />
                        {lead.booking}
                      </p>
                    )}
                    {lead.availability && (
                      <p className="text-xs text-blue-600 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Alt: {lead.availability}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No bookings scheduled for this day</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a date to view bookings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientCalendar;
