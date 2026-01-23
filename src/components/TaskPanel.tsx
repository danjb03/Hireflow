import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskPanelProps {
  leadId: string;
  tasks?: {
    task1: boolean;
    task2: boolean;
    task3: boolean;
    task4: boolean;
    task5: boolean;
    task6: boolean;
    task7: boolean;
  };
}

const TASK_LABELS = [
  "Connect with prospect on LinkedIn",
  "Connect with relevant titles on LinkedIn & engage (like/comment)",
  "Call on callback date/time",
  "If no answer: call again within the hour",
  "If no answer: call again before end of day",
  "Call daily for 5 days (2-3x per day)",
  "If still no answer: reach out via SMS, email, and LinkedIn",
];

const DEFAULT_TASKS = {
  task1: false,
  task2: false,
  task3: false,
  task4: false,
  task5: false,
  task6: false,
  task7: false,
};

const TaskPanel = ({ leadId, tasks: initialTasks }: TaskPanelProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState(initialTasks || DEFAULT_TASKS);
  const [updating, setUpdating] = useState<number | null>(null);

  const handleTaskToggle = async (taskNumber: number, completed: boolean) => {
    setUpdating(taskNumber);

    // Optimistic update
    const taskKey = `task${taskNumber}` as keyof typeof tasks;
    setTasks(prev => ({ ...prev, [taskKey]: completed }));

    try {
      const response = await supabase.functions.invoke('update-lead-tasks', {
        body: { leadId, taskNumber, completed }
      });

      if (response.error) {
        console.error('Function invoke error:', response.error);
        throw response.error;
      }

      // Check if response data contains an error
      if (response.data?.error) {
        console.error('Function returned error:', response.data.error);
        throw new Error(response.data.error);
      }

      toast({
        title: completed ? "Task completed" : "Task unchecked",
        description: TASK_LABELS[taskNumber - 1],
      });
    } catch (error: any) {
      console.error('Task update failed:', error);
      // Revert on error
      setTasks(prev => ({ ...prev, [taskKey]: !completed }));
      toast({
        title: "Error",
        description: error?.message || "Failed to update task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const completedCount = Object.values(tasks).filter(Boolean).length;

  return (
    <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
            <ClipboardList className="h-5 w-5 text-[#34B192]" />
          </span>
          Outreach Tasks
        </CardTitle>
        <p className="text-sm text-[#222121]/60">
          {completedCount} of {TASK_LABELS.length} completed
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {TASK_LABELS.map((label, index) => {
          const taskNumber = index + 1;
          const taskKey = `task${taskNumber}` as keyof typeof tasks;
          const isCompleted = tasks[taskKey];
          const isUpdating = updating === taskNumber;

          return (
            <div
              key={taskNumber}
              className={`flex items-start gap-3 rounded-lg border border-transparent p-2 transition-colors ${
                isCompleted ? "bg-[#F5F5F5]" : "hover:bg-[#F7F7F7]"
              }`}
            >
              <div className="pt-0.5">
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#34B192]" />
                ) : (
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={(checked) =>
                      handleTaskToggle(taskNumber, checked as boolean)
                    }
                    className="border-[#34B192]/40 data-[state=checked]:bg-[#34B192] data-[state=checked]:border-[#34B192]"
                  />
                )}
              </div>
              <label
                className={`text-sm cursor-pointer leading-tight ${
                  isCompleted
                    ? "text-[#222121]/50 line-through"
                    : "text-[#222121]"
                }`}
              >
                {taskNumber}. {label}
              </label>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TaskPanel;
