/**
 * Daily Statistics Reset System
 * 
 * This module handles the automated reset of daily statistics (todaySales and todayRefunds)
 * at midnight UTC. It provides a scheduled job system and date utilities for proper
 * timezone handling and stats management.
 */

/**
 * Date utilities with UTC support for consistent timezone handling
 */
export class DateUtils {
  /**
   * Get the current date in UTC as YYYY-MM-DD string
   */
  static getCurrentDateUTC(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Get the start of day in UTC for a given date
   */
  static getStartOfDayUTC(date: Date = new Date()): Date {
    const utcDate = new Date(date);
    utcDate.setUTCHours(0, 0, 0, 0);
    return utcDate;
  }

  /**
   * Get the end of day in UTC for a given date
   */
  static getEndOfDayUTC(date: Date = new Date()): Date {
    const utcDate = new Date(date);
    utcDate.setUTCHours(23, 59, 59, 999);
    return utcDate;
  }

  /**
   * Check if two dates are the same day in UTC
   */
  static isSameDayUTC(date1: Date, date2: Date): boolean {
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
  }

  /**
   * Check if a date is today in UTC
   */
  static isTodayUTC(date: Date): boolean {
    return this.isSameDayUTC(date, new Date());
  }

  /**
   * Get milliseconds until next midnight UTC
   */
  static getMillisecondsUntilNextMidnightUTC(): number {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
    nextMidnight.setUTCHours(0, 0, 0, 0);
    return nextMidnight.getTime() - now.getTime();
  }
}

/**
 * Daily Statistics Reset Manager
 * 
 * Handles automated reset of daily statistics at midnight UTC
 */
export class DailyStatsResetManager {
  private resetInterval: NodeJS.Timeout | null = null;
  private lastResetDate: string | null = null;

  /**
   * Start the daily stats reset scheduler
   */
  async start(): Promise<void> {
    console.log('Starting daily stats reset scheduler...');
    
    // Import fileStorage here to avoid circular dependency
    const { fileStorage } = await import('./fileStorage');
    
    // Recalculate today's stats from actual sales data on startup
    await fileStorage.recalculateTodayStats();
    
    // Initialize the last reset date
    this.lastResetDate = DateUtils.getCurrentDateUTC();
    
    // Schedule the first check for next midnight
    this.scheduleNextReset();
    
    // Set up a regular check every hour to ensure we don't miss a reset
    this.resetInterval = setInterval(() => {
      this.checkForDailyReset();
    }, 60 * 60 * 1000); // Check every hour
    
    console.log('Daily stats reset scheduler started successfully');
  }

  /**
   * Stop the daily stats reset scheduler
   */
  stop(): void {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
      console.log('Daily stats reset scheduler stopped');
    }
  }

  /**
   * Schedule the next reset to occur at midnight UTC
   */
  private scheduleNextReset(): void {
    const msUntilMidnight = DateUtils.getMillisecondsUntilNextMidnightUTC();
    
    setTimeout(() => {
      this.performDailyReset();
    }, msUntilMidnight);
    
    const nextMidnight = new Date(Date.now() + msUntilMidnight);
    console.log(`Next daily stats reset scheduled for: ${nextMidnight.toISOString()}`);
  }

  /**
   * Check if we need to perform a daily reset (backup check)
   */
  private checkForDailyReset(): void {
    const currentDate = DateUtils.getCurrentDateUTC();
    
    if (this.lastResetDate !== currentDate) {
      console.log(`Date changed detected: ${this.lastResetDate} -> ${currentDate}`);
      this.performDailyReset();
    }
  }

  /**
   * Perform the actual daily reset of statistics
   */
  private async performDailyReset(): Promise<void> {
    try {
      console.log('Performing daily stats reset...');
      
      // Import fileStorage here to avoid circular dependency
      const { fileStorage } = await import('./fileStorage');
      
      // Get current stats before reset
      const currentStats = await fileStorage.getStats();
      const previousSales = currentStats.todaySales;
      const previousRefunds = currentStats.todayRefunds || 0;
      
      // Reset daily statistics
      await fileStorage.updateStats({
        todaySales: 0,
        todayRefunds: 0,
        netSales: 0
      });
      
      // Update the last reset date
      this.lastResetDate = DateUtils.getCurrentDateUTC();
      
      // Log the reset activity
      const { ActivityLogger, LOG_ACTIONS } = await import('./logger');
      await ActivityLogger.logSystemActivity(
        LOG_ACTIONS.SYSTEM.MAINTENANCE,
        `Daily stats reset completed - Previous: Sales $${previousSales.toFixed(2)}, Refunds $${previousRefunds.toFixed(2)}`
      );
      
      console.log(`Daily stats reset completed successfully. Previous stats - Sales: $${previousSales.toFixed(2)}, Refunds: $${previousRefunds.toFixed(2)}`);
      
      // Schedule the next reset
      this.scheduleNextReset();
      
    } catch (error) {
      console.error('Error performing daily stats reset:', error);
      
      // Log the error
      try {
        const { ActivityLogger, LOG_ACTIONS } = await import('./logger');
        await ActivityLogger.logSystemActivity(
          LOG_ACTIONS.SYSTEM.ERROR,
          `Daily stats reset failed: ${error}`
        );
      } catch (logError) {
        console.error('Error logging daily stats reset failure:', logError);
      }
    }
  }

  /**
   * Manually trigger a daily reset (for testing or admin purposes)
   */
  async manualReset(): Promise<void> {
    console.log('Manual daily stats reset triggered');
    await this.performDailyReset();
  }
}

// Export singleton instance
export const dailyStatsResetManager = new DailyStatsResetManager();