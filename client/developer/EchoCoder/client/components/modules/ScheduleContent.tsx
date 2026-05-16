import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  assignee: string;
  startDate: string;
  duration: number;
  status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[];
}

const defaultTasks: Task[] = [
  {
    id: '1',
    name: 'Prep ingredients',
    assignee: 'Chef John',
    startDate: '2025-01-15',
    duration: 120,
    status: 'completed',
    dependencies: [],
  },
  {
    id: '2',
    name: 'Prepare sauces',
    assignee: 'Chef Maria',
    startDate: '2025-01-15',
    duration: 90,
    status: 'in-progress',
    dependencies: ['1'],
  },
  {
    id: '3',
    name: 'Cook main courses',
    assignee: 'Chef Alex',
    startDate: '2025-01-15',
    duration: 180,
    status: 'pending',
    dependencies: ['1', '2'],
  },
  {
    id: '4',
    name: 'Plating & garnish',
    assignee: 'Chef Emma',
    startDate: '2025-01-15',
    duration: 60,
    status: 'pending',
    dependencies: ['3'],
  },
];

export default function ScheduleContent() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline and staff assignments</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedTask?.id === task.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border/30 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{task.name}</div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <span>👤 {task.assignee}</span>
                        <span>⏱ {task.duration} min</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Task Details */}
        <div className="lg:col-span-1">
          {selectedTask ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Name</div>
                  <div className="font-semibold">{selectedTask.name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Assignee</div>
                  <div className="font-semibold">{selectedTask.assignee}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div className="font-semibold">{selectedTask.duration} minutes</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Start Date</div>
                  <div className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedTask.startDate).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Status</div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      selectedTask.status
                    )}`}
                  >
                    {getStatusLabel(selectedTask.status)}
                  </span>
                </div>

                {selectedTask.dependencies.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Dependencies</div>
                    <div className="space-y-1">
                      {selectedTask.dependencies.map((depId) => {
                        const depTask = tasks.find((t) => t.id === depId);
                        return (
                          <div key={depId} className="text-sm text-muted-foreground">
                            • {depTask?.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button size="sm" variant="outline" className="flex-1">
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-muted-foreground">Select a task to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {tasks.filter((t) => t.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {tasks.filter((t) => t.status === 'in-progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(tasks.reduce((sum, t) => sum + t.duration, 0) / 60)}h
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
