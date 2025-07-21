/**
 * Test script for daily statistics reset functionality
 * 
 * This script tests the DateUtils and DailyStatsResetManager functionality
 * to ensure proper operation of the daily reset system.
 */

import { DateUtils, DailyStatsResetManager } from './dailyStatsReset';

async function testDateUtils() {
  console.log('Testing DateUtils...');
  
  const now = new Date();
  const currentDateUTC = DateUtils.getCurrentDateUTC();
  const startOfDay = DateUtils.getStartOfDayUTC();
  const endOfDay = DateUtils.getEndOfDayUTC();
  const msUntilMidnight = DateUtils.getMillisecondsUntilNextMidnightUTC();
  
  console.log('Current Date UTC:', currentDateUTC);
  console.log('Start of Day UTC:', startOfDay.toISOString());
  console.log('End of Day UTC:', endOfDay.toISOString());
  console.log('MS until next midnight:', msUntilMidnight);
  console.log('Hours until midnight:', (msUntilMidnight / (1000 * 60 * 60)).toFixed(2));
  
  // Test isTodayUTC
  const todayTest = DateUtils.isTodayUTC(now);
  const yesterdayTest = DateUtils.isTodayUTC(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  
  console.log('Is now today?', todayTest);
  console.log('Is yesterday today?', yesterdayTest);
  
  console.log('DateUtils tests completed successfully!\n');
}

async function testStatsReset() {
  console.log('Testing DailyStatsResetManager...');
  
  const manager = new DailyStatsResetManager();
  
  // Test manual reset
  console.log('Testing manual reset...');
  await manager.manualReset();
  
  console.log('DailyStatsResetManager tests completed successfully!\n');
}

async function runTests() {
  try {
    console.log('Starting daily stats reset functionality tests...\n');
    
    await testDateUtils();
    await testStatsReset();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };