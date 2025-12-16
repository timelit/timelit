// Basic test suite for the Advanced Scheduler
// Run with: node server/utils/scheduler.test.js

const AdvancedScheduler = require('./Scheduler');

async function runSchedulerTests() {
  console.log('🧪 Running Advanced Scheduler Tests...\n');

  try {
    // Test 1: Basic scheduler initialization
    console.log('Test 1: Scheduler Initialization');
    const scheduler = new AdvancedScheduler();
    console.log('✅ Scheduler initialized successfully\n');

    // Test 2: Create sample data
    console.log('Test 2: Sample Data Creation');

    const sampleTasks = [
      {
        _id: 'task1',
        title: 'Meeting with client',
        duration: 60,
        priority: 8,
        status: 'pending',
        dependencies: []
      },
      {
        _id: 'task2',
        title: 'Code review',
        duration: 30,
        priority: 6,
        status: 'pending',
        dependencies: []
      }
    ];

    const sampleResources = [
      {
        _id: 'resource1',
        name: 'Conference Room A',
        type: 'room',
        capacity: 10,
        availability: [{ dayOfWeek: 1, start: '09:00', end: '17:00' }],
        isActive: true
      }
    ];

    const sampleConstraints = [
      {
        _id: 'constraint1',
        name: 'Business Hours Only',
        type: 'hard',
        category: 'temporal',
        weight: 1.0,
        parameters: { start: '09:00', end: '17:00' }
      }
    ];

    console.log('✅ Sample data created\n');

    // Test 3: Generate schedule
    console.log('Test 3: Schedule Generation');

    const timeRange = {
      start: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
      end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:59.999Z'
    };

    const schedule = await scheduler.generateSchedule(
      sampleTasks,
      sampleResources,
      sampleConstraints,
      timeRange
    );

    console.log('✅ Schedule generated successfully');
    console.log(`   - Tasks scheduled: ${schedule.slots.length}`);
    console.log(`   - Optimization score: ${(schedule.optimizationScore * 100).toFixed(1)}%`);
    console.log(`   - Computation time: ${schedule.metadata.computationTime}ms\n`);

    // Test 4: Validate schedule
    console.log('Test 4: Schedule Validation');

    const validation = await scheduler.validateSchedule(schedule);
    console.log('✅ Schedule validation completed');
    console.log(`   - Is valid: ${validation.isValid}`);
    console.log(`   - Violations: ${validation.violations.length}`);
    console.log(`   - Validation score: ${(validation.score * 100).toFixed(1)}%\n`);

    // Test 5: Get metrics
    console.log('Test 5: Schedule Metrics');

    const metrics = scheduler.getScheduleMetrics(schedule);
    console.log('✅ Metrics calculated');
    console.log(`   - Total tasks: ${metrics.totalTasks}`);
    console.log(`   - Completion rate: ${(metrics.completionRate * 100).toFixed(1)}%`);
    console.log(`   - Resource utilization: ${(metrics.utilization * 100).toFixed(1)}%\n`);

    console.log('🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSchedulerTests();
}

module.exports = { runSchedulerTests };