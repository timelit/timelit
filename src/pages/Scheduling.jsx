import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Settings, Plus, Play, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const Scheduling = () => {
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    duration: 60,
    priority: 5,
    due_date: '',
    requiredResources: [],
    optionalResources: []
  });

  const [newResource, setNewResource] = useState({
    name: '',
    type: 'person',
    capacity: 1
  });

  const [newConstraint, setNewConstraint] = useState({
    name: '',
    type: 'soft',
    category: 'time_preferences',
    weight: 0.5
  });

  const [scheduleOptions, setScheduleOptions] = useState({
    algorithm: 'greedy',
    timeRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  // Integration with existing system
  const importExistingTasks = async () => {
    try {
      // Import tasks from the existing task system
      const response = await fetch('/api/tasks?completed=false&limit=100');
      if (response.ok) {
        const existingTasks = await response.json();

        // Convert to scheduling tasks
        const schedulingTasks = existingTasks.data.map(task => ({
          title: task.title,
          description: task.description,
          duration: task.duration || 60,
          priority: task.priority === 'urgent' ? 10 :
                   task.priority === 'high' ? 7 :
                   task.priority === 'medium' ? 5 : 3,
          due_date: task.due_date,
          status: 'pending'
        }));

        // Create scheduling tasks in bulk
        for (const task of schedulingTasks) {
          await fetch('/api/scheduling/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
          });
        }

        await loadSchedulingData();
        toast.success(`Imported ${schedulingTasks.length} tasks from existing system`);
      }
    } catch (error) {
      console.error('Failed to import tasks:', error);
      toast.error('Failed to import existing tasks');
    }
  };

  const exportScheduleToCalendar = async (scheduleId) => {
    try {
      // Get the schedule details
      const scheduleResponse = await fetch(`/api/scheduling/schedules/${scheduleId}`);
      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const schedule = await scheduleResponse.json();
      const scheduleData = schedule.data;

      // Convert scheduled slots to calendar events
      const eventsToCreate = scheduleData.slots.map(slot => {
        // slot.taskId should be populated with task data
        const taskTitle = slot.taskId?.title || `Task ${slot.taskId}`;
        return {
          title: `Scheduled: ${taskTitle}`,
          start_time: slot.start,
          end_time: slot.end,
          description: `Auto-scheduled by Advanced Scheduler\nTask: ${taskTitle}`,
          category: 'work',
          priority: 'medium'
        };
      });

      // Create events in the calendar system
      for (const event of eventsToCreate) {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
      }

      toast.success(`Exported ${eventsToCreate.length} scheduled events to calendar`);
    } catch (error) {
      console.error('Failed to export schedule:', error);
      toast.error('Failed to export schedule to calendar');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadSchedulingData();
  }, []);

  const loadSchedulingData = async () => {
    try {
      setLoading(true);

      const [tasksRes, resourcesRes, constraintsRes, schedulesRes] = await Promise.all([
        fetch('/api/scheduling/tasks'),
        fetch('/api/scheduling/resources'),
        fetch('/api/scheduling/constraints'),
        fetch('/api/scheduling/schedules')
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.data);
      }

      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setResources(resourcesData.data);
      }

      if (constraintsRes.ok) {
        const constraintsData = await constraintsRes.json();
        setConstraints(constraintsData.data);
      }

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData.data);
      }
    } catch (error) {
      console.error('Failed to load scheduling data:', error);
      toast.error('Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    try {
      const response = await fetch('/api/scheduling/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask)
      });

      if (response.ok) {
        const result = await response.json();
        setTasks([...tasks, result.data]);
        setNewTask({
          title: '',
          description: '',
          duration: 60,
          priority: 5,
          due_date: '',
          requiredResources: [],
          optionalResources: []
        });
        toast.success('Task created successfully');
      } else {
        toast.error('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    }
  };

  const createResource = async () => {
    try {
      const response = await fetch('/api/scheduling/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newResource)
      });

      if (response.ok) {
        const result = await response.json();
        setResources([...resources, result.data]);
        setNewResource({
          name: '',
          type: 'person',
          capacity: 1
        });
        toast.success('Resource created successfully');
      } else {
        toast.error('Failed to create resource');
      }
    } catch (error) {
      console.error('Failed to create resource:', error);
      toast.error('Failed to create resource');
    }
  };

  const createConstraint = async () => {
    try {
      const response = await fetch('/api/scheduling/constraints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConstraint)
      });

      if (response.ok) {
        const result = await response.json();
        setConstraints([...constraints, result.data]);
        setNewConstraint({
          name: '',
          type: 'soft',
          category: 'time_preferences',
          weight: 0.5
        });
        toast.success('Constraint created successfully');
      } else {
        toast.error('Failed to create constraint');
      }
    } catch (error) {
      console.error('Failed to create constraint:', error);
      toast.error('Failed to create constraint');
    }
  };

  const generateSchedule = async () => {
    try {
      setLoading(true);

      const taskIds = tasks.map(t => t._id);
      const resourceIds = resources.map(r => r._id);
      const constraintIds = constraints.map(c => c._id);

      const response = await fetch('/api/scheduling/generate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIds,
          resourceIds,
          constraintIds,
          timeRange: scheduleOptions.timeRange,
          options: {
            algorithm: scheduleOptions.algorithm
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSchedules([result.data, ...schedules]);
        toast.success('Schedule generated successfully');
      } else {
        toast.error('Failed to generate schedule');
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      toast.error('Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Scheduling</h1>
          <p className="text-muted-foreground">
            Create optimized schedules with intelligent resource allocation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importExistingTasks}>
            Import Tasks
          </Button>
          <Button onClick={generateSchedule} disabled={loading || tasks.length === 0}>
            <Play className="w-4 h-4 mr-2" />
            Generate Schedule
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="constraints">Constraints</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Tasks
              </CardTitle>
              <CardDescription>
                Define tasks that need to be scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-duration">Duration (minutes)</Label>
                  <Input
                    id="task-duration"
                    type="number"
                    value={newTask.duration}
                    onChange={(e) => setNewTask({...newTask, duration: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Priority (1-10)</Label>
                  <Input
                    id="task-priority"
                    type="number"
                    min="1"
                    max="10"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due-date">Due Date</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Task description"
                />
              </div>
              <Button onClick={createTask} disabled={!newTask.title}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>

              <div className="space-y-2">
                <h3 className="font-semibold">Existing Tasks</h3>
                <div className="grid gap-2">
                  {tasks.map(task => (
                    <div key={task._id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {task.duration}min • Priority {task.priority}
                          {task.due_date && ` • Due ${new Date(task.due_date).toLocaleDateString()}`}
                        </div>
                      </div>
                      <Badge variant="secondary">{task.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Resources
              </CardTitle>
              <CardDescription>
                Define people, rooms, and equipment available for scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="resource-name">Name</Label>
                  <Input
                    id="resource-name"
                    value={newResource.name}
                    onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                    placeholder="Resource name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resource-type">Type</Label>
                  <Select value={newResource.type} onValueChange={(value) => setNewResource({...newResource, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">Person</SelectItem>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resource-capacity">Capacity</Label>
                  <Input
                    id="resource-capacity"
                    type="number"
                    min="1"
                    value={newResource.capacity}
                    onChange={(e) => setNewResource({...newResource, capacity: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <Button onClick={createResource} disabled={!newResource.name}>
                <Plus className="w-4 h-4 mr-2" />
                Create Resource
              </Button>

              <div className="space-y-2">
                <h3 className="font-semibold">Existing Resources</h3>
                <div className="grid gap-2">
                  {resources.map(resource => (
                    <div key={resource._id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{resource.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {resource.type} • Capacity: {resource.capacity}
                        </div>
                      </div>
                      <Badge variant={resource.isActive ? "default" : "secondary"}>
                        {resource.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constraints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Constraints
              </CardTitle>
              <CardDescription>
                Define rules and preferences for scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="constraint-name">Name</Label>
                  <Input
                    id="constraint-name"
                    value={newConstraint.name}
                    onChange={(e) => setNewConstraint({...newConstraint, name: e.target.value})}
                    placeholder="Constraint name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constraint-type">Type</Label>
                  <Select value={newConstraint.type} onValueChange={(value) => setNewConstraint({...newConstraint, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="soft">Soft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constraint-category">Category</Label>
                  <Select value={newConstraint.category} onValueChange={(value) => setNewConstraint({...newConstraint, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temporal">Temporal</SelectItem>
                      <SelectItem value="capacity">Capacity</SelectItem>
                      <SelectItem value="dependency">Dependency</SelectItem>
                      <SelectItem value="business_rules">Business Rules</SelectItem>
                      <SelectItem value="time_preferences">Time Preferences</SelectItem>
                      <SelectItem value="resource_optimization">Resource Optimization</SelectItem>
                      <SelectItem value="personal_preferences">Personal Preferences</SelectItem>
                      <SelectItem value="business_optimization">Business Optimization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constraint-weight">Weight</Label>
                  <Input
                    id="constraint-weight"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newConstraint.weight}
                    onChange={(e) => setNewConstraint({...newConstraint, weight: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <Button onClick={createConstraint} disabled={!newConstraint.name}>
                <Plus className="w-4 h-4 mr-2" />
                Create Constraint
              </Button>

              <div className="space-y-2">
                <h3 className="font-semibold">Existing Constraints</h3>
                <div className="grid gap-2">
                  {constraints.map(constraint => (
                    <div key={constraint._id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{constraint.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {constraint.category} • {constraint.type} • Weight: {constraint.weight}
                        </div>
                      </div>
                      <Badge variant={constraint.type === 'hard' ? "destructive" : "default"}>
                        {constraint.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Generated Schedules
              </CardTitle>
              <CardDescription>
                View and manage generated schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map(schedule => (
                  <div key={schedule._id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        Schedule {schedule._id.slice(-8)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={schedule.status === 'completed' ? "default" : "secondary"}>
                          {schedule.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Score: {(schedule.optimizationScore * 100).toFixed(1)}%
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportScheduleToCalendar(schedule._id)}
                        >
                          Export to Calendar
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {schedule.slots.length} tasks scheduled •
                      {schedule.unscheduledTasks.length} unscheduled •
                      Generated {new Date(schedule.metadata.generatedAt).toLocaleString()}
                    </div>
                    <div className="mt-2">
                      <div className="text-sm">
                        Algorithm: {schedule.metadata.algorithm} •
                        Computation time: {schedule.metadata.computationTime}ms
                      </div>
                    </div>
                  </div>
                ))}
                {schedules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No schedules generated yet. Create tasks, resources, and constraints, then generate a schedule.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Settings</CardTitle>
              <CardDescription>
                Configure algorithm parameters and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="algorithm">Algorithm</Label>
                  <Select
                    value={scheduleOptions.algorithm}
                    onValueChange={(value) => setScheduleOptions({...scheduleOptions, algorithm: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greedy">Greedy (Fast)</SelectItem>
                      <SelectItem value="optimal">Optimal (Slow)</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={scheduleOptions.timeRange.start}
                        onChange={(e) => setScheduleOptions({
                          ...scheduleOptions,
                          timeRange: {...scheduleOptions.timeRange, start: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-xs">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={scheduleOptions.timeRange.end}
                        onChange={(e) => setScheduleOptions({
                          ...scheduleOptions,
                          timeRange: {...scheduleOptions.timeRange, end: e.target.value}
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Scheduling;