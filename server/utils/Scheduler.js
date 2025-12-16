const SchedulingTask = require('../models/SchedulingTask');
const SchedulingResource = require('../models/SchedulingResource');
const SchedulingConstraint = require('../models/SchedulingConstraint');
const Schedule = require('../models/Schedule');

class AdvancedScheduler {
  constructor(options = {}) {
    this.options = {
      algorithm: 'greedy', // 'greedy', 'optimal', 'balanced', 'fast'
      maxComputationTime: 30000, // 30 seconds
      optimizationIterations: 100,
      hardConstraintPriority: ['temporal', 'capacity', 'dependency', 'business_rules'],
      softConstraintWeights: {
        time_preferences: 0.3,
        resource_optimization: 0.2,
        personal_preferences: 0.2,
        business_optimization: 0.3
      },
      bufferTimeDefault: 15, // minutes
      slotGranularity: 15, // minutes
      allowOvertime: false,
      preferCompactScheduling: true,
      balancingStrategy: 'equal', // 'equal', 'weighted', 'skill-based'
      failureHandling: 'lenient', // 'strict', 'lenient', 'hybrid'
      ...options
    };

    this.tasks = [];
    this.resources = [];
    this.constraints = [];
    this.schedule = null;
  }

  /**
   * Main scheduling method
   */
  async generateSchedule(tasks, resources, constraints, timeRange) {
    const startTime = Date.now();

    // Initialize scheduler with data
    this.tasks = tasks;
    this.resources = resources;
    this.constraints = constraints;

    // Preprocessing
    await this.preprocess();

    // Generate initial schedule based on algorithm
    let schedule;
    switch (this.options.algorithm) {
      case 'greedy':
        schedule = await this.greedyScheduling(timeRange);
        break;
      case 'optimal':
        schedule = await this.optimalScheduling(timeRange);
        break;
      case 'balanced':
        schedule = await this.balancedScheduling(timeRange);
        break;
      case 'fast':
        schedule = await this.fastScheduling(timeRange);
        break;
      default:
        schedule = await this.greedyScheduling(timeRange);
    }

    // Post-processing and optimization
    schedule = await this.postProcess(schedule);

    const computationTime = Date.now() - startTime;

    return {
      ...schedule,
      metadata: {
        ...schedule.metadata,
        computationTime,
        algorithm: this.options.algorithm
      }
    };
  }

  /**
   * Phase 1: Preprocessing
   */
  async preprocess() {
    // Build dependency graph first
    this.buildDependencyGraph();

    // Validate input data
    this.validateInput();

    // Pre-compute resource availability
    this.computeResourceAvailability();

    // Sort tasks by priority
    this.sortTasksByPriority();
  }

  /**
   * Validate input data completeness and consistency
   */
  validateInput() {
    // Check for circular dependencies
    this.detectCircularDependencies();

    // Validate resource availability
    this.validateResourceAvailability();

    // Check constraint consistency
    this.validateConstraints();
  }

  /**
   * Build dependency graph for topological sorting
   */
  buildDependencyGraph() {
    this.dependencyGraph = new Map();
    this.reverseDependencyGraph = new Map();

    this.tasks.forEach(task => {
      this.dependencyGraph.set(task._id.toString(), []);
      this.reverseDependencyGraph.set(task._id.toString(), []);
    });

    this.tasks.forEach(task => {
      task.dependencies.forEach(dep => {
        const taskId = task._id.toString();
        const depId = dep.taskId.toString();

        if (dep.type === 'after') {
          // task depends on depId (task comes after depId)
          this.dependencyGraph.get(depId).push(taskId);
          this.reverseDependencyGraph.get(taskId).push(depId);
        } else if (dep.type === 'before') {
          // depId depends on task (depId comes after task)
          this.dependencyGraph.get(taskId).push(depId);
          this.reverseDependencyGraph.get(depId).push(taskId);
        }
      });
    });
  }

  /**
   * Compute available time slots for each resource
   */
  computeResourceAvailability() {
    this.resourceAvailability = new Map();

    this.resources.forEach(resource => {
      const availability = this.calculateResourceAvailability(resource);
      this.resourceAvailability.set(resource._id.toString(), availability);
    });
  }

  /**
   * Sort tasks by composite priority score
   */
  sortTasksByPriority() {
    this.tasks.sort((a, b) => {
      const scoreA = this.calculateTaskPriorityScore(a);
      const scoreB = this.calculateTaskPriorityScore(b);
      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Calculate composite priority score for a task
   */
  calculateTaskPriorityScore(task) {
    let score = task.priority || 5;

    // Factor in deadline urgency
    if (task.deadline) {
      const now = new Date();
      const timeToDeadline = task.deadline - now;
      const daysToDeadline = timeToDeadline / (1000 * 60 * 60 * 24);

      if (daysToDeadline < 1) score += 10; // Urgent
      else if (daysToDeadline < 3) score += 5; // High priority
      else if (daysToDeadline < 7) score += 2; // Medium priority
    }

    // Factor in dependency depth (tasks deeper in dependency chain get higher priority)
    const dependencyDepth = this.calculateDependencyDepth(task);
    score += dependencyDepth * 2;

    // Factor in constraint complexity
    const constraintComplexity = this.calculateConstraintComplexity(task);
    score += constraintComplexity;

    return score;
  }

  /**
   * Calculate how deep a task is in the dependency chain
   */
  calculateDependencyDepth(task) {
    const visited = new Set();
    let maxDepth = 0;

    const dfs = (taskId, depth) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      maxDepth = Math.max(maxDepth, depth);

      const dependencies = this.reverseDependencyGraph.get(taskId) || [];
      dependencies.forEach(depId => dfs(depId, depth + 1));
    };

    dfs(task._id.toString(), 0);
    return maxDepth;
  }

  /**
   * Calculate constraint complexity for a task
   */
  calculateConstraintComplexity(task) {
    let complexity = 0;

    // Required resources increase complexity
    complexity += (task.requiredResources?.length || 0) * 2;

    // Preferred time windows increase complexity
    complexity += (task.preferredTimeWindows?.length || 0) * 1;

    // Duration flexibility increases complexity
    if (task.durationFlexibility) {
      const flexibility = task.durationFlexibility.max - task.durationFlexibility.min;
      complexity += Math.min(flexibility / 30, 5); // Cap at 5 points
    }

    return complexity;
  }

  /**
   * Phase 2: Greedy Scheduling Algorithm
   */
  async greedyScheduling(timeRange) {
    const schedule = this.initializeSchedule(timeRange);
    const unscheduledTasks = [];

    for (const task of this.tasks) {
      const bestSlot = await this.findBestSlotForTask(task, schedule, timeRange);

      if (bestSlot) {
        schedule.slots.push(bestSlot);
        this.updateScheduleAvailability(schedule, bestSlot);
      } else {
        unscheduledTasks.push(task._id);
      }
    }

    schedule.unscheduledTasks = unscheduledTasks;
    schedule.optimizationScore = this.calculateScheduleScore(schedule);

    return schedule;
  }

  /**
   * Find the best available slot for a task
   */
  async findBestSlotForTask(task, currentSchedule, timeRange) {
    const candidateSlots = this.generateCandidateSlots(task, timeRange);

    let bestSlot = null;
    let bestScore = -1;

    for (const slot of candidateSlots) {
      if (this.isSlotAvailable(slot, currentSchedule)) {
        const score = this.scoreSlotForTask(slot, task);
        if (score > bestScore) {
          bestScore = score;
          bestSlot = slot;
        }
      }
    }

    return bestSlot;
  }

  /**
   * Generate candidate time slots for a task
   */
  generateCandidateSlots(task, timeRange) {
    const slots = [];
    const granularity = this.options.slotGranularity;
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);

    // Generate slots across the time range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += granularity) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + task.duration);

          // Check if slot is within business hours and available
          if (this.isValidSlotTime(slotStart, slotEnd, task)) {
            slots.push({
              taskId: task._id,
              resourceIds: this.selectResourcesForTask(task),
              start: slotStart,
              end: slotEnd,
              actualDuration: task.duration,
              confidence: 1.0,
              constraintViolations: [],
              optimizationScore: 0
            });
          }
        }
      }
    }

    return slots;
  }

  /**
   * Check if a time slot is valid for a task
   */
  isValidSlotTime(start, end, task) {
    // Check if within task time constraints
    if (task.earliestStart && start < task.earliestStart) return false;
    if (task.latestEnd && end > task.latestEnd) return false;
    if (task.deadline && end > task.deadline) return false;

    // Check preferred time windows
    if (task.preferredTimeWindows?.length > 0) {
      const isInPreferredWindow = task.preferredTimeWindows.some(window => {
        return start >= new Date(window.start) && end <= new Date(window.end);
      });
      if (!isInPreferredWindow) return false;
    }

    return true;
  }

  /**
   * Select appropriate resources for a task
   */
  selectResourcesForTask(task) {
    const requiredResources = task.requiredResources || [];
    const optionalResources = task.optionalResources || [];

    // For now, return required resources (can be enhanced with optimization)
    return requiredResources;
  }

  /**
   * Check if a slot is available (no conflicts)
   */
  isSlotAvailable(slot, schedule) {
    // Check resource availability
    for (const resourceId of slot.resourceIds) {
      const resourceAvailability = this.resourceAvailability.get(resourceId.toString());
      if (!resourceAvailability) continue;

      // Check if slot overlaps with existing bookings
      const hasConflict = schedule.slots.some(existingSlot => {
        return existingSlot.resourceIds.includes(resourceId) &&
               this.slotsOverlap(slot, existingSlot);
      });

      if (hasConflict) return false;
    }

    // Check hard constraints
    return this.checkHardConstraints(slot);
  }

  /**
   * Check if two time slots overlap
   */
  slotsOverlap(slot1, slot2) {
    return slot1.start < slot2.end && slot2.start < slot1.end;
  }

  /**
   * Check hard constraints for a slot
   */
  checkHardConstraints(slot) {
    // Implement hard constraint checking
    // This is a simplified version - full implementation would check all constraint types

    // Check temporal constraints (no overlaps for same resource)
    // Already handled in isSlotAvailable

    // Check capacity constraints
    for (const resourceId of slot.resourceIds) {
      const resource = this.resources.find(r => r._id.toString() === resourceId.toString());
      if (resource && resource.capacity > 1) {
        // Count concurrent usage
        const concurrentUsage = this.countConcurrentUsage(slot, resourceId);
        if (concurrentUsage >= resource.capacity) return false;
      }
    }

    return true;
  }

  /**
   * Count concurrent resource usage for a slot
   */
  countConcurrentUsage(slot, resourceId) {
    // This would need to be implemented based on current schedule
    // For now, return 0 (no concurrent usage)
    return 0;
  }

  /**
   * Score a slot for a task based on soft constraints
   */
  scoreSlotForTask(slot, task) {
    let score = 1.0; // Base score

    // Factor in preferred time windows
    if (task.preferredTimeWindows?.length > 0) {
      const isInPreferredWindow = task.preferredTimeWindows.some(window => {
        return slot.start >= new Date(window.start) && slot.end <= new Date(window.end);
      });

      if (isInPreferredWindow) {
        score += this.options.softConstraintWeights.time_preferences;
      }
    }

    // Factor in resource preferences
    score += this.scoreResourcePreferences(slot, task);

    // Factor in business optimization (compact scheduling, etc.)
    score += this.scoreBusinessOptimization(slot, task);

    return Math.min(score, 2.0); // Cap at 2.0
  }

  /**
   * Score resource preferences for a slot
   */
  scoreResourcePreferences(slot, task) {
    // Simplified scoring - can be enhanced
    return 0.1;
  }

  /**
   * Score business optimization factors
   */
  scoreBusinessOptimization(slot, task) {
    // Simplified scoring - can be enhanced
    return 0.1;
  }

  /**
   * Update schedule availability after placing a slot
   */
  updateScheduleAvailability(schedule, slot) {
    // Update resource availability matrices
    // This would mark the time slots as occupied
  }

  /**
   * Phase 3: Optimal Scheduling with Simulated Annealing
   */
  async optimalScheduling(timeRange) {
    // Start with greedy solution
    const initialSchedule = await this.greedyScheduling(timeRange);

    // Apply simulated annealing optimization
    return this.simulatedAnnealing(initialSchedule, timeRange);
  }

  /**
   * Simulated Annealing optimization
   */
  simulatedAnnealing(initialSchedule, timeRange) {
    let currentSchedule = { ...initialSchedule };
    let currentScore = this.calculateScheduleScore(currentSchedule);
    let bestSchedule = { ...currentSchedule };
    let bestScore = currentScore;

    let temperature = 100;
    const coolingRate = 0.95;
    const maxIterations = this.options.optimizationIterations;

    for (let i = 0; i < maxIterations; i++) {
      // Generate neighbor solution
      const neighborSchedule = this.generateNeighborSchedule(currentSchedule, timeRange);

      if (neighborSchedule) {
        const neighborScore = this.calculateScheduleScore(neighborSchedule);

        // Accept better solution or worse solution with probability
        if (neighborScore > currentScore ||
            Math.random() < Math.exp((neighborScore - currentScore) / temperature)) {
          currentSchedule = { ...neighborSchedule };
          currentScore = neighborScore;

          if (currentScore > bestScore) {
            bestSchedule = { ...currentSchedule };
            bestScore = currentScore;
          }
        }
      }

      // Cool down
      temperature *= coolingRate;

      // Check time limit
      if (Date.now() - initialSchedule.metadata.generatedAt > this.options.maxComputationTime) {
        break;
      }
    }

    bestSchedule.metadata.iterationsPerformed = maxIterations;
    return bestSchedule;
  }

  /**
   * Generate a neighbor schedule by making small changes
   */
  generateNeighborSchedule(schedule, timeRange) {
    // Randomly choose a perturbation:
    // 1. Swap two tasks
    // 2. Shift a task to a different time
    // 3. Reassign resources

    const perturbationType = Math.floor(Math.random() * 3);

    switch (perturbationType) {
      case 0:
        return this.swapRandomTasks(schedule, timeRange);
      case 1:
        return this.shiftRandomTask(schedule, timeRange);
      case 2:
        return this.reassignRandomResources(schedule, timeRange);
      default:
        return null;
    }
  }

  /**
   * Calculate overall schedule quality score
   */
  calculateScheduleScore(schedule) {
    let score = 0;

    // Task completion rate (0-1)
    const completionRate = schedule.slots.length / (schedule.slots.length + schedule.unscheduledTasks.length);
    score += completionRate * 0.4;

    // Constraint satisfaction (0-1)
    const constraintScore = this.calculateConstraintSatisfaction(schedule);
    score += constraintScore * 0.3;

    // Resource utilization balance (0-1)
    const balanceScore = this.calculateResourceBalance(schedule);
    score += balanceScore * 0.2;

    // Schedule compactness (0-1)
    const compactnessScore = this.calculateCompactness(schedule);
    score += compactnessScore * 0.1;

    return score;
  }

  /**
   * Calculate constraint satisfaction score
   */
  calculateConstraintSatisfaction(schedule) {
    // Simplified - full implementation would check all constraints
    let violations = 0;
    let totalChecks = 0;

    schedule.slots.forEach(slot => {
      totalChecks++;
      if (slot.constraintViolations.length > 0) {
        violations++;
      }
    });

    return violations === 0 ? 1.0 : (totalChecks - violations) / totalChecks;
  }

  /**
   * Calculate resource utilization balance
   */
  calculateResourceBalance(schedule) {
    // Simplified - calculate variance in resource usage
    return 0.8; // Placeholder
  }

  /**
   * Calculate schedule compactness
   */
  calculateCompactness(schedule) {
    // Simplified - measure gaps and fragmentation
    return 0.7; // Placeholder
  }

  /**
   * Phase 4: Balanced Scheduling (compromise between speed and optimality)
   */
  async balancedScheduling(timeRange) {
    // Use greedy with some optimization
    const schedule = await this.greedyScheduling(timeRange);

    // Apply limited optimization
    return this.simulatedAnnealing(schedule, timeRange, 50); // Fewer iterations
  }

  /**
   * Phase 5: Fast Scheduling (prioritize speed over optimality)
   */
  async fastScheduling(timeRange) {
    // Simplified greedy with larger time slots
    const originalGranularity = this.options.slotGranularity;
    this.options.slotGranularity = Math.max(originalGranularity * 2, 60); // Double granularity, min 1 hour

    const schedule = await this.greedyScheduling(timeRange);

    // Restore original granularity
    this.options.slotGranularity = originalGranularity;

    return schedule;
  }

  /**
   * Phase 6: Post-processing
   */
  async postProcess(schedule) {
    // Add buffers between tasks
    schedule = this.addBuffers(schedule);

    // Final validation
    schedule = this.finalValidation(schedule);

    // Calculate final metrics
    schedule.optimizationScore = this.calculateScheduleScore(schedule);

    return schedule;
  }

  /**
   * Add buffer times between consecutive tasks
   */
  addBuffers(schedule) {
    // Implementation for adding buffer times
    return schedule;
  }

  /**
   * Final validation pass
   */
  finalValidation(schedule) {
    // Check all constraints one final time
    return schedule;
  }

  /**
   * Initialize empty schedule
   */
  initializeSchedule(timeRange) {
    return {
      startDate: timeRange.start,
      endDate: timeRange.end,
      slots: [],
      unscheduledTasks: [],
      optimizationScore: 0,
      constraints: {
        hard: this.constraints.filter(c => c.type === 'hard').map(c => c._id),
        soft: this.constraints.filter(c => c.type === 'soft').map(c => c._id)
      },
      metadata: {
        generatedAt: new Date(),
        algorithm: this.options.algorithm,
        computationTime: 0,
        iterationsPerformed: 0,
        version: '1.0'
      },
      status: 'draft'
    };
  }

  // Additional helper methods
  detectCircularDependencies() {
    const visited = new Set();
    const recStack = new Set();

    const dfs = (taskId) => {
      if (recStack.has(taskId)) return true; // Cycle detected
      if (visited.has(taskId)) return false;

      visited.add(taskId);
      recStack.add(taskId);

      const dependencies = this.reverseDependencyGraph.get(taskId) || [];
      for (const depId of dependencies) {
        if (dfs(depId)) return true;
      }

      recStack.delete(taskId);
      return false;
    };

    for (const task of this.tasks) {
      const taskId = task._id.toString();
      if (dfs(taskId)) {
        throw new Error('Circular dependency detected in tasks');
      }
    }
  }

  validateResourceAvailability() {
    // Check for overlapping unavailable slots
    this.resources.forEach(resource => {
      const unavailable = resource.unavailableSlots || [];
      for (let i = 0; i < unavailable.length; i++) {
        for (let j = i + 1; j < unavailable.length; j++) {
          const slot1 = unavailable[i];
          const slot2 = unavailable[j];
          if (this.slotsOverlap(slot1, slot2)) {
            throw new Error(`Overlapping unavailable slots for resource ${resource.name}`);
          }
        }
      }
    });
  }

  validateConstraints() {
    // Validate constraint parameters
    this.constraints.forEach(constraint => {
      if (constraint.type === 'hard' && constraint.weight !== 1.0) {
        throw new Error(`Hard constraint ${constraint.name} must have weight 1.0`);
      }
    });
  }

  calculateResourceAvailability(resource) {
    // Calculate available time slots based on resource schedule
    const availability = [];

    // Default availability (9 AM - 5 PM, Monday-Friday)
    const defaultAvailability = [
      { dayOfWeek: 1, start: '09:00', end: '17:00' }, // Monday
      { dayOfWeek: 2, start: '09:00', end: '17:00' }, // Tuesday
      { dayOfWeek: 3, start: '09:00', end: '17:00' }, // Wednesday
      { dayOfWeek: 4, start: '09:00', end: '17:00' }, // Thursday
      { dayOfWeek: 5, start: '09:00', end: '17:00' }, // Friday
    ];

    const resourceAvailability = resource.availability?.length > 0
      ? resource.availability
      : defaultAvailability;

    // Convert to time slots
    resourceAvailability.forEach(slot => {
      availability.push({
        dayOfWeek: slot.dayOfWeek,
        start: slot.start,
        end: slot.end,
        available: true
      });
    });

    return availability;
  }

  swapRandomTasks(schedule, timeRange) {
    if (schedule.slots.length < 2) return schedule;

    const newSchedule = JSON.parse(JSON.stringify(schedule));

    // Pick two random slots
    const idx1 = Math.floor(Math.random() * newSchedule.slots.length);
    let idx2 = Math.floor(Math.random() * newSchedule.slots.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * newSchedule.slots.length);
    }

    // Swap their time slots
    const temp = newSchedule.slots[idx1];
    newSchedule.slots[idx1] = newSchedule.slots[idx2];
    newSchedule.slots[idx2] = temp;

    return newSchedule;
  }

  shiftRandomTask(schedule, timeRange) {
    if (schedule.slots.length === 0) return schedule;

    const newSchedule = JSON.parse(JSON.stringify(schedule));
    const randomIdx = Math.floor(Math.random() * newSchedule.slots.length);
    const slot = newSchedule.slots[randomIdx];

    // Shift by random amount (±2 hours)
    const shiftMinutes = (Math.random() - 0.5) * 4 * 60; // ±2 hours in minutes
    const newStart = new Date(slot.start);
    newStart.setMinutes(newStart.getMinutes() + shiftMinutes);

    const newEnd = new Date(slot.end);
    newEnd.setMinutes(newEnd.getMinutes() + shiftMinutes);

    // Check if new time is within range
    if (newStart >= new Date(timeRange.start) && newEnd <= new Date(timeRange.end)) {
      slot.start = newStart.toISOString();
      slot.end = newEnd.toISOString();
    }

    return newSchedule;
  }

  reassignRandomResources(schedule, timeRange) {
    if (schedule.slots.length === 0) return schedule;

    const newSchedule = JSON.parse(JSON.stringify(schedule));
    const randomIdx = Math.floor(Math.random() * newSchedule.slots.length);
    const slot = newSchedule.slots[randomIdx];

    // Try to assign different resources if available
    const availableResources = this.resources.filter(r =>
      !slot.resourceIds.includes(r._id.toString())
    );

    if (availableResources.length > 0) {
      const newResource = availableResources[Math.floor(Math.random() * availableResources.length)];
      slot.resourceIds = [newResource._id.toString()];
    }

    return newSchedule;
  }

  // Public method to find available slots (used by API)
  async findAvailableSlots(resources, duration, constraints, timeRange, count) {
    // Simplified implementation - in practice would use the same logic as generateCandidateSlots
    const slots = [];

    for (let i = 0; i < count; i++) {
      const start = new Date(timeRange.start);
      start.setDate(start.getDate() + Math.floor(Math.random() * 7)); // Random day in range
      start.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15, 0, 0); // 9 AM - 5 PM

      const end = new Date(start);
      end.setMinutes(start.getMinutes() + duration);

      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        duration,
        score: Math.random(),
        available: true
      });
    }

    return slots;
  }

  // Public method to validate schedule
  async validateSchedule(schedule) {
    const violations = [];

    // Check for overlapping slots
    for (let i = 0; i < schedule.slots.length; i++) {
      for (let j = i + 1; j < schedule.slots.length; j++) {
        const slot1 = schedule.slots[i];
        const slot2 = schedule.slots[j];

        if (this.slotsOverlap(slot1, slot2)) {
          violations.push({
            type: 'overlap',
            severity: 'high',
            description: `Tasks ${slot1.taskId} and ${slot2.taskId} overlap`
          });
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      score: this.calculateScheduleScore(schedule)
    };
  }

  // Public method to get schedule metrics
  getScheduleMetrics(schedule) {
    const totalTasks = schedule.slots.length + schedule.unscheduledTasks.length;
    const scheduledTasks = schedule.slots.length;
    const completionRate = totalTasks > 0 ? scheduledTasks / totalTasks : 0;

    const totalDuration = schedule.slots.reduce((sum, slot) => sum + slot.actualDuration, 0);
    const scheduleDuration = (new Date(schedule.endDate) - new Date(schedule.startDate)) / (1000 * 60); // minutes
    const utilization = scheduleDuration > 0 ? totalDuration / scheduleDuration : 0;

    return {
      totalTasks,
      scheduledTasks,
      unscheduledTasks: schedule.unscheduledTasks.length,
      completionRate,
      totalDuration,
      utilization,
      optimizationScore: schedule.optimizationScore,
      computationTime: schedule.metadata.computationTime,
      algorithm: schedule.metadata.algorithm
    };
  }
}

module.exports = AdvancedScheduler;