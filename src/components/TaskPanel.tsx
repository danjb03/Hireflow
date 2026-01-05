import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskPanelProps {
  leadId: string;
  tasks: {
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

const TaskPanel = ({ leadId, tasks: initialTasks }: TaskPanelProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
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

      if (response.error) throw response.error;

      toast({
        title: completed ? "Task completed" : "Task unchecked",
        description: TASK_LABELS[taskNumber - 1],
      });
    } catch (error) {
      // Revert on error
      setTasks(prev => ({ ...prev, [taskKey]: !completed }));
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const completedCount = Object.values(tasks).filter(Boolean).length;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          Outreach Tasks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
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
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                isCompleted ? "bg-green-50/50" : "hover:bg-white/50"
              }`}
            >
              <div className="pt-0.5">
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={(checked) =>
                      handleTaskToggle(taskNumber, checked as boolean)
                    }
                    className="border-blue-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                )}
              </div>
              <label
                className={`text-sm cursor-pointer leading-tight ${
                  isCompleted
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
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
