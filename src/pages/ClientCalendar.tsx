import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  status: string;
  callbackDateTime: string;
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

      // Filter leads that have callback dates
      const leadsWithDates = (data.leads || []).filter((lead: any) => lead.callbackDateTime);
      setLeadsWithCallbacks(leadsWithDates);
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

  const getLeadsForDate = (date: Date) => {
    return leadsWithCallbacks.filter(lead => {
      const callbackDate = new Date(lead.callbackDateTime);
      return (
        callbackDate.getDate() === date.getDate() &&
        callbackDate.getMonth() === date.getMonth() &&
        callbackDate.getFullYear() === date.getFullYear()
      );
    });
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
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">View your scheduled callbacks</p>
          </div>
          <Button onClick={goToToday}>Today</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{monthName}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
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
                        p-2 min-h-[80px] rounded-lg border text-left hover:bg-muted transition-colors
                        ${isToday ? 'border-primary bg-primary/5' : ''}
                        ${isSelected ? 'bg-muted' : ''}
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
            </CardContent>
          </Card>

          {/* Selected Day Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      <p className="text-sm text-muted-foreground mb-1">{lead.contactName}</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(lead.callbackDateTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : selectedDate ? (
                <p className="text-center text-muted-foreground py-8">
                  No callbacks scheduled for this day
                </p>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Select a date to view callbacks
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientCalendar;
