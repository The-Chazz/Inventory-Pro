var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/logStorage.ts
import fs2 from "fs";
import path2 from "path";
var FileLogStorage, logStorage;
var init_logStorage = __esm({
  "server/logStorage.ts"() {
    "use strict";
    FileLogStorage = class {
      logsCache = /* @__PURE__ */ new Map();
      nextId = 1;
      constructor() {
        this.loadLogsFromFile();
      }
      async loadLogsFromFile() {
        try {
          const logsDir = path2.join(process.cwd(), "server", "data");
          const logsFile = path2.join(logsDir, "activity_logs.json");
          if (!fs2.existsSync(logsFile)) {
            if (!fs2.existsSync(logsDir)) {
              fs2.mkdirSync(logsDir, { recursive: true });
            }
            fs2.writeFileSync(logsFile, JSON.stringify({ logs: [] }));
            return;
          }
          const data = JSON.parse(fs2.readFileSync(logsFile, "utf-8"));
          if (data.logs && Array.isArray(data.logs)) {
            data.logs.forEach((log2) => {
              this.logsCache.set(log2.id, {
                ...log2,
                timestamp: new Date(log2.timestamp)
              });
              if (log2.id >= this.nextId) {
                this.nextId = log2.id + 1;
              }
            });
          }
        } catch (error) {
          this.logsCache.clear();
          this.nextId = 1;
        }
      }
      async saveLogsToFile() {
        try {
          const logsDir = path2.join(process.cwd(), "server", "data");
          const logsFile = path2.join(logsDir, "activity_logs.json");
          if (!fs2.existsSync(logsDir)) {
            fs2.mkdirSync(logsDir, { recursive: true });
          }
          const logs = Array.from(this.logsCache.values());
          fs2.writeFileSync(logsFile, JSON.stringify({ logs }, null, 2));
        } catch (error) {
          console.error("Error saving logs to file:", error);
        }
      }
      async createLog(log2) {
        const newLog = {
          id: this.nextId++,
          userId: log2.userId,
          username: log2.username,
          action: log2.action,
          category: log2.category,
          details: log2.details || "",
          timestamp: /* @__PURE__ */ new Date()
        };
        this.logsCache.set(newLog.id, newLog);
        await this.saveLogsToFile();
        return newLog;
      }
      async getLogs() {
        return Array.from(this.logsCache.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      async getLogsByCategory(category) {
        return Array.from(this.logsCache.values()).filter((log2) => log2.category === category).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      async getLogsByUser(userId) {
        return Array.from(this.logsCache.values()).filter((log2) => log2.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      async getLogById(id) {
        return this.logsCache.get(id);
      }
    };
    logStorage = new FileLogStorage();
  }
});

// server/logger.ts
var logger_exports = {};
__export(logger_exports, {
  ActivityLogger: () => ActivityLogger,
  LOG_ACTIONS: () => LOG_ACTIONS,
  LOG_CATEGORIES: () => LOG_CATEGORIES
});
var LOG_CATEGORIES, LOG_ACTIONS, ActivityLogger;
var init_logger = __esm({
  "server/logger.ts"() {
    "use strict";
    init_logStorage();
    LOG_CATEGORIES = {
      USER: "user",
      INVENTORY: "inventory",
      SALES: "sales",
      LOSSES: "losses",
      SETTINGS: "settings",
      AUTHENTICATION: "authentication",
      SYSTEM: "system"
    };
    LOG_ACTIONS = {
      USER: {
        CREATE: "User Created",
        UPDATE: "User Updated",
        DELETE: "User Deleted",
        STATUS_CHANGE: "User Status Changed"
      },
      INVENTORY: {
        CREATE: "Inventory Item Created",
        UPDATE: "Inventory Item Updated",
        DELETE: "Inventory Item Deleted",
        BULK_IMPORT: "Bulk Inventory Import"
      },
      SALES: {
        CREATE: "Sale Recorded",
        REPRINT: "Receipt Reprinted",
        REFUND: "Sale Refunded"
      },
      LOSSES: {
        CREATE: "Loss Recorded",
        UPDATE: "Loss Updated"
      },
      SETTINGS: {
        UPDATE: "Settings Updated"
      },
      AUTHENTICATION: {
        LOGIN: "User Login",
        LOGOUT: "User Logout",
        FAILED_LOGIN: "Failed Login Attempt"
      },
      SYSTEM: {
        ERROR: "System Error",
        STARTUP: "System Startup"
      }
    };
    ActivityLogger = class {
      // Log any activity
      static async log(userId, username, category, action, details) {
        try {
          const logEntry = {
            userId,
            username,
            category,
            action,
            details: details || ""
          };
          await logStorage.createLog(logEntry);
        } catch (error) {
          console.error("Failed to log activity:", error);
        }
      }
      // Helper methods for common log types
      static async logUserActivity(userId, username, action, details) {
        return this.log(userId, username, LOG_CATEGORIES.USER, action, details);
      }
      static async logInventoryActivity(userId, username, action, details) {
        return this.log(userId, username, LOG_CATEGORIES.INVENTORY, action, details);
      }
      static async logSalesActivity(userId, username, action, details) {
        return this.log(userId, username, LOG_CATEGORIES.SALES, action, details);
      }
      static async logLossActivity(userId, username, action, details) {
        return this.log(userId, username, LOG_CATEGORIES.LOSSES, action, details);
      }
      static async logSettingsActivity(userId, username, action, details) {
        return this.log(userId, username, LOG_CATEGORIES.SETTINGS, action, details);
      }
      static async logAuthActivity(userId, username, action, details) {
        return this.log(userId, username, LOG_CATEGORIES.AUTHENTICATION, action, details);
      }
      static async logSystemActivity(action, details) {
        return this.log(0, "SYSTEM", LOG_CATEGORIES.SYSTEM, action, details);
      }
    };
  }
});

// server/dailyStatsReset.ts
var DateUtils, DailyStatsResetManager, dailyStatsResetManager;
var init_dailyStatsReset = __esm({
  "server/dailyStatsReset.ts"() {
    "use strict";
    DateUtils = class {
      /**
       * Get the current date in UTC as YYYY-MM-DD string
       */
      static getCurrentDateUTC() {
        const now = /* @__PURE__ */ new Date();
        return now.toISOString().split("T")[0];
      }
      /**
       * Get the start of day in UTC for a given date
       */
      static getStartOfDayUTC(date = /* @__PURE__ */ new Date()) {
        const utcDate = new Date(date);
        utcDate.setUTCHours(0, 0, 0, 0);
        return utcDate;
      }
      /**
       * Get the end of day in UTC for a given date
       */
      static getEndOfDayUTC(date = /* @__PURE__ */ new Date()) {
        const utcDate = new Date(date);
        utcDate.setUTCHours(23, 59, 59, 999);
        return utcDate;
      }
      /**
       * Check if two dates are the same day in UTC
       */
      static isSameDayUTC(date1, date2) {
        return date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0];
      }
      /**
       * Check if a date is today in UTC
       */
      static isTodayUTC(date) {
        return this.isSameDayUTC(date, /* @__PURE__ */ new Date());
      }
      /**
       * Get milliseconds until next midnight UTC
       */
      static getMillisecondsUntilNextMidnightUTC() {
        const now = /* @__PURE__ */ new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
        nextMidnight.setUTCHours(0, 0, 0, 0);
        return nextMidnight.getTime() - now.getTime();
      }
    };
    DailyStatsResetManager = class {
      resetInterval = null;
      lastResetDate = null;
      /**
       * Start the daily stats reset scheduler
       */
      async start() {
        console.log("Starting daily stats reset scheduler...");
        const { fileStorage: fileStorage2 } = await Promise.resolve().then(() => (init_fileStorage(), fileStorage_exports));
        await fileStorage2.recalculateTodayStats();
        this.lastResetDate = DateUtils.getCurrentDateUTC();
        this.scheduleNextReset();
        this.resetInterval = setInterval(() => {
          this.checkForDailyReset();
        }, 60 * 60 * 1e3);
        console.log("Daily stats reset scheduler started successfully");
      }
      /**
       * Stop the daily stats reset scheduler
       */
      stop() {
        if (this.resetInterval) {
          clearInterval(this.resetInterval);
          this.resetInterval = null;
          console.log("Daily stats reset scheduler stopped");
        }
      }
      /**
       * Schedule the next reset to occur at midnight UTC
       */
      scheduleNextReset() {
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
      checkForDailyReset() {
        const currentDate = DateUtils.getCurrentDateUTC();
        if (this.lastResetDate !== currentDate) {
          console.log(`Date changed detected: ${this.lastResetDate} -> ${currentDate}`);
          this.performDailyReset();
        }
      }
      /**
       * Perform the actual daily reset of statistics
       */
      async performDailyReset() {
        try {
          console.log("Performing daily stats reset...");
          const { fileStorage: fileStorage2 } = await Promise.resolve().then(() => (init_fileStorage(), fileStorage_exports));
          const currentStats = await fileStorage2.getStats();
          const previousSales = currentStats.todaySales;
          const previousRefunds = currentStats.todayRefunds || 0;
          await fileStorage2.updateStats({
            todaySales: 0,
            todayRefunds: 0,
            netSales: 0
          });
          this.lastResetDate = DateUtils.getCurrentDateUTC();
          const { ActivityLogger: ActivityLogger2, LOG_ACTIONS: LOG_ACTIONS2 } = await Promise.resolve().then(() => (init_logger(), logger_exports));
          await ActivityLogger2.logSystemActivity(
            LOG_ACTIONS2.SYSTEM.MAINTENANCE,
            `Daily stats reset completed - Previous: Sales $${previousSales.toFixed(2)}, Refunds $${previousRefunds.toFixed(2)}`
          );
          console.log(`Daily stats reset completed successfully. Previous stats - Sales: $${previousSales.toFixed(2)}, Refunds: $${previousRefunds.toFixed(2)}`);
          this.scheduleNextReset();
        } catch (error) {
          console.error("Error performing daily stats reset:", error);
          try {
            const { ActivityLogger: ActivityLogger2, LOG_ACTIONS: LOG_ACTIONS2 } = await Promise.resolve().then(() => (init_logger(), logger_exports));
            await ActivityLogger2.logSystemActivity(
              LOG_ACTIONS2.SYSTEM.ERROR,
              `Daily stats reset failed: ${error}`
            );
          } catch (logError) {
            console.error("Error logging daily stats reset failure:", logError);
          }
        }
      }
      /**
       * Manually trigger a daily reset (for testing or admin purposes)
       */
      async manualReset() {
        console.log("Manual daily stats reset triggered");
        await this.performDailyReset();
      }
    };
    dailyStatsResetManager = new DailyStatsResetManager();
  }
});

// server/fileStorage.ts
var fileStorage_exports = {};
__export(fileStorage_exports, {
  FileStorage: () => FileStorage,
  fileStorage: () => fileStorage
});
import fs3 from "fs/promises";
import path3 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { dirname } from "path";
var __filename2, __dirname2, FileStorage, fileStorage;
var init_fileStorage = __esm({
  "server/fileStorage.ts"() {
    "use strict";
    init_dailyStatsReset();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = dirname(__filename2);
    FileStorage = class {
      dataDir;
      /**
       * Initialize the storage system
       */
      constructor() {
        this.dataDir = path3.join(__dirname2, "data");
        this.initDataDir();
      }
      /**
       * Ensures all necessary data files exist in the data directory
       * Creates them with default data if they don't exist
       */
      async ensureDataFiles() {
        const files = {
          "users.json": JSON.stringify({ users: [
            {
              id: 1,
              name: "Admin User",
              username: "admin",
              pin: "1234",
              role: "admin",
              lastActive: (/* @__PURE__ */ new Date()).toISOString(),
              status: "active"
            },
            {
              id: 2,
              name: "Sarah Johnson",
              username: "sarah",
              pin: "5678",
              role: "cashier",
              lastActive: (/* @__PURE__ */ new Date()).toISOString(),
              status: "active"
            }
          ] }),
          "inventory.json": JSON.stringify({ items: [] }),
          "sales.json": JSON.stringify({ sales: [] }),
          "losses.json": JSON.stringify({ losses: [] }),
          "stats.json": JSON.stringify({
            stats: {
              totalInventoryItems: 0,
              todaySales: 0,
              lowStockItems: 0,
              activeUsers: 2,
              totalInventoryValue: 0,
              todayRefunds: 0,
              netSales: 0
            }
          }),
          "settings.json": JSON.stringify({
            settings: {
              storeName: "Inventory Pro Store",
              storeAddress: "123 Main Street, City, State, 12345",
              storePhone: "(555) 123-4567",
              thankYouMessage: "Thank you for shopping with us!",
              nextTransactionId: 1
            }
          }),
          "popularity.json": JSON.stringify({
            popularity: []
          })
        };
        for (const [fileName, content] of Object.entries(files)) {
          const filePath = path3.join(this.dataDir, fileName);
          try {
            await fs3.access(filePath);
          } catch (error) {
            await fs3.writeFile(filePath, content, "utf8");
          }
        }
      }
      /**
       * Initialize the data directory for the application
       */
      async initDataDir() {
        try {
          await fs3.access(this.dataDir).catch(async () => {
            await fs3.mkdir(this.dataDir, { recursive: true });
          });
          await this.ensureDataFiles();
        } catch (error) {
          console.error(`Failed to initialize data directory: ${error}`);
        }
      }
      // Generic function to read data from a JSON file
      async readData(fileName, key) {
        try {
          const filePath = path3.join(this.dataDir, fileName);
          const data = await fs3.readFile(filePath, "utf8");
          const parsed = JSON.parse(data);
          return parsed[key] || [];
        } catch (error) {
          console.error(`Error reading ${fileName}:`, error);
          return [];
        }
      }
      // Generic function to write data to a JSON file
      async writeData(fileName, key, data) {
        try {
          const filePath = path3.join(this.dataDir, fileName);
          const fileContent = JSON.stringify({ [key]: data }, null, 2);
          await fs3.writeFile(filePath, fileContent, "utf8");
          return true;
        } catch (error) {
          console.error(`Error writing ${fileName}:`, error);
          return false;
        }
      }
      // User methods required by IStorage interface
      async getUsers() {
        return this.readData("users.json", "users");
      }
      async getUser(id) {
        const users = await this.readData("users.json", "users");
        return users.find((user) => user.id === id);
      }
      async getUserByUsername(username) {
        const users = await this.readData("users.json", "users");
        return users.find((user) => user.username === username);
      }
      async createUser(insertUser) {
        const users = await this.readData("users.json", "users");
        const newId = Math.max(0, ...users.map((user) => user.id)) + 1;
        const now = /* @__PURE__ */ new Date();
        const sessionValidUntil = new Date(now);
        sessionValidUntil.setHours(sessionValidUntil.getHours() + 2);
        const newUser = {
          ...insertUser,
          id: newId,
          lastActive: now.toISOString(),
          sessionValidUntil: sessionValidUntil.toISOString(),
          status: insertUser.status || "Active"
          // Ensure status is set
        };
        users.push(newUser);
        await this.writeData("users.json", "users", users);
        return newUser;
      }
      async updateUser(id, updates) {
        const users = await this.readData("users.json", "users");
        const userIndex = users.findIndex((user) => user.id === id);
        if (userIndex === -1) {
          return null;
        }
        const updatedUser = {
          ...users[userIndex],
          ...updates
        };
        users[userIndex] = updatedUser;
        await this.writeData("users.json", "users", users);
        return updatedUser;
      }
      async deleteUser(id) {
        try {
          const users = await this.readData("users.json", "users");
          const initialLength = users.length;
          const filteredUsers = users.filter((user) => user.id !== id);
          if (filteredUsers.length === initialLength) {
            return false;
          }
          await this.writeData("users.json", "users", filteredUsers);
          return true;
        } catch (error) {
          console.error(`Error deleting user with id ${id}:`, error);
          return false;
        }
      }
      // Additional methods for inventory, sales, and stats
      // Inventory methods
      async getInventory() {
        return this.readData("inventory.json", "items");
      }
      async getInventoryItem(id) {
        const items = await this.readData("inventory.json", "items");
        return items.find((item) => item.id === id);
      }
      async updateInventoryItem(id, updates) {
        const items = await this.readData("inventory.json", "items");
        const index = items.findIndex((item) => item.id === id);
        if (index !== -1) {
          const updatedItem = { ...items[index], ...updates };
          if (updates.stock !== void 0 || updates.threshold !== void 0) {
            updatedItem.status = updatedItem.stock <= updatedItem.threshold ? "Low Stock" : "In Stock";
          }
          items[index] = updatedItem;
          await this.writeData("inventory.json", "items", items);
          return items[index];
        }
        return null;
      }
      async addInventoryItem(item) {
        const items = await this.readData("inventory.json", "items");
        const newId = Math.max(0, ...items.map((item2) => item2.id)) + 1;
        const newItem = {
          ...item,
          // Type cast to avoid TypeScript errors
          id: newId,
          status: item.stock < item.threshold ? "Low Stock" : "In Stock"
        };
        items.push(newItem);
        await this.writeData("inventory.json", "items", items);
        return newItem;
      }
      async deleteInventoryItem(id) {
        const items = await this.readData("inventory.json", "items");
        const newItems = items.filter((item) => item.id !== id);
        if (newItems.length !== items.length) {
          await this.writeData("inventory.json", "items", newItems);
          return true;
        }
        return false;
      }
      // Sales methods
      async getSales() {
        return this.readData("sales.json", "sales");
      }
      async getSale(id) {
        const sales = await this.readData("sales.json", "sales");
        return sales.find((sale) => sale.id === id);
      }
      async addSale(sale) {
        const sales = await this.readData("sales.json", "sales");
        const date = /* @__PURE__ */ new Date();
        const formattedDate = date.toISOString().split("T")[0].replace(/-/g, "");
        const settings = await this.getStoreSettings();
        const today = /* @__PURE__ */ new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const dateFormatted = `${year}${month}${day}`;
        let todayMaxNumber = 0;
        for (const existingSale of sales) {
          if (existingSale.id.startsWith(`TRX-${dateFormatted}`)) {
            try {
              const parts = existingSale.id.split("-");
              if (parts.length === 3) {
                const number = parseInt(parts[2], 10);
                if (!isNaN(number) && number > todayMaxNumber) {
                  todayMaxNumber = number;
                }
              }
            } catch (error) {
              console.error("Error parsing transaction ID", existingSale.id, error);
            }
          }
        }
        const nextTransactionNumber = todayMaxNumber + 1;
        const transactionId = `TRX-${dateFormatted}-${nextTransactionNumber}`;
        const newSale = {
          ...sale,
          // Type cast to avoid TypeScript errors
          id: transactionId,
          date: date.toISOString()
        };
        sales.push(newSale);
        await this.writeData("sales.json", "sales", sales);
        await this.updateProductPopularity(newSale.items);
        return newSale;
      }
      /**
       * Update a sale record (e.g., for refunds)
       * 
       * @param id The ID of the sale to update
       * @param updates Partial updates to apply to the sale
       * @returns The updated sale, or null if not found
       */
      async updateSale(id, updates) {
        const sales = await this.readData("sales.json", "sales");
        const index = sales.findIndex((sale) => sale.id === id);
        if (index === -1) {
          return null;
        }
        const updatedSale = {
          ...sales[index],
          ...updates
        };
        sales[index] = updatedSale;
        await this.writeData("sales.json", "sales", sales);
        return updatedSale;
      }
      /**
       * Process a refund for a sale
       * 
       * @param id The ID of the sale to refund
       * @param refundedBy Username of the person who processed the refund
       * @returns The updated sale with refunded status, or null if not found
       */
      async refundSale(id, refundedBy) {
        const sale = await this.getSale(id);
        if (!sale || sale.status === "Refunded") {
          return null;
        }
        for (const item of sale.items) {
          const inventoryItem = await this.getInventoryItem(item.productId);
          if (inventoryItem) {
            const newStock = inventoryItem.stock + item.quantity;
            await this.updateInventoryItem(item.productId, {
              stock: newStock
            });
            if (inventoryItem.stock <= inventoryItem.threshold && newStock > inventoryItem.threshold) {
              const stats2 = await this.getStats();
              await this.updateStats({
                lowStockItems: Math.max(0, stats2.lowStockItems - 1)
                // Ensure we don't go below 0
              });
            }
          }
        }
        const saleDate = new Date(sale.date);
        if (DateUtils.isTodayUTC(saleDate)) {
          const stats2 = await this.getStats();
          const currentRefunds = stats2.todayRefunds || 0;
          const updatedRefunds = currentRefunds + sale.amount;
          const netSales = stats2.todaySales - updatedRefunds;
          await this.updateStats({
            todayRefunds: updatedRefunds,
            netSales
          });
        }
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const updatedSale = await this.updateSale(id, {
          status: "Refunded",
          refundedBy,
          refundDate: timestamp
        });
        return updatedSale;
      }
      // Stats methods
      async getStats() {
        try {
          const filePath = path3.join(this.dataDir, "stats.json");
          const data = await fs3.readFile(filePath, "utf8");
          const stats2 = JSON.parse(data);
          const baseStats = stats2.stats || stats2;
          const inventory = await this.getInventory();
          const totalInventoryValue = inventory.reduce((total, item) => {
            return total + item.price * item.stock;
          }, 0);
          const totalInventoryItems = inventory.length;
          const lowStockItems = inventory.filter((item) => item.stock <= item.threshold).length;
          const users = await this.readData("users.json", "users");
          const activeUsers = users.filter((user) => user.status === "Active").length;
          if (typeof baseStats.todayRefunds === "undefined") {
            baseStats.todayRefunds = 0;
          }
          const netSales = Math.max(0, (baseStats.todaySales || 0) - (baseStats.todayRefunds || 0));
          return {
            ...baseStats,
            totalInventoryValue,
            totalInventoryItems,
            lowStockItems,
            activeUsers,
            netSales
          };
        } catch (error) {
          console.error("Error reading stats.json:", error);
          return {
            totalInventoryItems: 0,
            todaySales: 0,
            lowStockItems: 0,
            activeUsers: 0,
            totalInventoryValue: 0,
            todayRefunds: 0,
            netSales: 0
          };
        }
      }
      /**
       * Recalculate today's sales and refunds from actual sales data
       * This is useful during startup to ensure stats are accurate
       */
      async recalculateTodayStats() {
        try {
          console.log("Recalculating today's stats from sales data...");
          const sales = await this.getSales();
          const todaySales = sales.filter((sale) => DateUtils.isTodayUTC(new Date(sale.date)));
          const todaySalesTotal = todaySales.filter((sale) => sale.status !== "Refunded").reduce((total, sale) => total + sale.amount, 0);
          const todayRefundsTotal = todaySales.filter((sale) => sale.status === "Refunded").reduce((total, sale) => total + sale.amount, 0);
          const netSales = Math.max(0, todaySalesTotal - todayRefundsTotal);
          await this.updateStats({
            todaySales: todaySalesTotal,
            todayRefunds: todayRefundsTotal,
            netSales
          });
          console.log(`Today's stats recalculated - Sales: $${todaySalesTotal.toFixed(2)}, Refunds: $${todayRefundsTotal.toFixed(2)}, Net: $${netSales.toFixed(2)}`);
        } catch (error) {
          console.error("Error recalculating today's stats:", error);
        }
      }
      async updateStats(updates) {
        try {
          const filePath = path3.join(this.dataDir, "stats.json");
          const data = await fs3.readFile(filePath, "utf8");
          const stats2 = JSON.parse(data);
          const baseStats = stats2.stats || stats2;
          if (!baseStats.totalInventoryValue) {
            baseStats.totalInventoryValue = 0;
          }
          if (typeof baseStats.todayRefunds === "undefined") {
            baseStats.todayRefunds = 0;
          }
          if (typeof baseStats.netSales === "undefined") {
            baseStats.netSales = baseStats.todaySales || 0;
          }
          const updatedStats = {
            ...baseStats,
            ...updates
          };
          if ((updates.todaySales || updates.todayRefunds) && !updates.netSales) {
            updatedStats.netSales = Math.max(0, updatedStats.todaySales - (updatedStats.todayRefunds || 0));
          }
          const { totalInventoryValue, totalInventoryItems, lowStockItems, activeUsers, ...persistentFields } = updatedStats;
          await fs3.writeFile(filePath, JSON.stringify(persistentFields, null, 2), "utf8");
          return updatedStats;
        } catch (error) {
          console.error("Error updating stats.json:", error);
          return null;
        }
      }
      // Losses Management
      async getLosses() {
        try {
          return await this.readData("losses.json", "losses");
        } catch (error) {
          console.error("Error reading losses:", error);
          return [];
        }
      }
      async getLoss(id) {
        try {
          const losses = await this.getLosses();
          return losses.find((loss) => loss.id === id);
        } catch (error) {
          console.error("Error fetching loss:", error);
          return void 0;
        }
      }
      async addLoss(lossData) {
        try {
          const losses = await this.getLosses();
          const id = `LOSS-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}-${String(losses.length + 1).padStart(3, "0")}`;
          const newLoss = {
            ...lossData,
            // Type cast to avoid TypeScript errors
            id,
            date: (/* @__PURE__ */ new Date()).toISOString()
          };
          await this.updateInventoryFromLoss(newLoss);
          losses.push(newLoss);
          await this.writeData("losses.json", "losses", losses);
          return newLoss;
        } catch (error) {
          throw error;
        }
      }
      async updateInventoryFromLoss(loss) {
        try {
          const item = await this.getInventoryItem(loss.inventoryItemId);
          if (!item) {
            throw new Error(`Inventory item with ID ${loss.inventoryItemId} not found`);
          }
          const newStock = Math.max(0, item.stock - loss.quantity);
          await this.updateInventoryItem(loss.inventoryItemId, { stock: newStock });
          const stats2 = await this.getStats();
          if (newStock <= item.threshold && item.stock > item.threshold) {
            await this.updateStats({ lowStockItems: stats2.lowStockItems + 1 });
          }
        } catch (error) {
          throw error;
        }
      }
      /**
       * Update a loss record
       * 
       * @param id The ID of the loss record to update
       * @param updates Partial updates to apply to the loss record
       * @returns The updated loss record, or null if not found
       */
      async updateLoss(id, updates) {
        try {
          const losses = await this.getLosses();
          const index = losses.findIndex((loss) => loss.id === id);
          if (index === -1) {
            return null;
          }
          const originalLoss = losses[index];
          const updatedLoss = {
            ...originalLoss,
            ...updates
          };
          if (updates.quantity !== void 0 && updates.quantity !== originalLoss.quantity) {
            const inventoryItem = await this.getInventoryItem(originalLoss.inventoryItemId);
            if (inventoryItem) {
              const quantityDifference = updates.quantity - originalLoss.quantity;
              const currentStock = inventoryItem.stock;
              const newStock = Math.max(0, currentStock - quantityDifference);
              await this.updateInventoryItem(originalLoss.inventoryItemId, { stock: newStock });
              const stats2 = await this.getStats();
              if (currentStock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
                await this.updateStats({ lowStockItems: stats2.lowStockItems + 1 });
              } else if (currentStock <= inventoryItem.threshold && newStock > inventoryItem.threshold) {
                await this.updateStats({ lowStockItems: Math.max(0, stats2.lowStockItems - 1) });
              }
              if (updates.value === void 0) {
                updatedLoss.value = updates.quantity * inventoryItem.price;
              }
            }
          }
          losses[index] = updatedLoss;
          await this.writeData("losses.json", "losses", losses);
          return updatedLoss;
        } catch (error) {
          throw error;
        }
      }
      /**
       * Get the store settings
       */
      async getStoreSettings() {
        try {
          const data = await this.readData("settings.json", "settings");
          if (data && data.length > 0) {
            return data[0];
          }
          return {
            storeName: "Inventory Pro Store",
            storeAddress: "123 Main Street, City, State, 12345",
            storePhone: "(555) 123-4567",
            thankYouMessage: "Thank you for shopping with us!",
            nextTransactionId: 1
          };
        } catch (error) {
          throw error;
        }
      }
      /**
       * Update the store settings
       */
      async updateStoreSettings(updates) {
        try {
          const currentSettings = await this.getStoreSettings();
          const updatedSettings = { ...currentSettings, ...updates };
          await this.writeData("settings.json", "settings", [updatedSettings]);
          return updatedSettings;
        } catch (error) {
          throw error;
        }
      }
      /**
       * Get the next transaction ID and increment it
       */
      async getNextTransactionId() {
        try {
          const settings = await this.getStoreSettings();
          const currentId = settings.nextTransactionId;
          await this.updateStoreSettings({ nextTransactionId: currentId + 1 });
          return currentId;
        } catch (error) {
          throw error;
        }
      }
      /**
       * Get product popularity data
       */
      async getProductPopularity() {
        try {
          const data = await this.readData("popularity.json", "popularity");
          return data || [];
        } catch (error) {
          return [];
        }
      }
      /**
       * Update product popularity when a sale is completed
       */
      async updateProductPopularity(items) {
        try {
          const popularityData = await this.getProductPopularity();
          const currentDate = (/* @__PURE__ */ new Date()).toISOString();
          for (const item of items) {
            const productId = item.productId;
            const existingIndex = popularityData.findIndex((p) => p.productId === productId);
            if (existingIndex >= 0) {
              popularityData[existingIndex].salesCount += item.quantity;
              popularityData[existingIndex].lastUpdated = currentDate;
            } else {
              popularityData.push({
                productId,
                salesCount: item.quantity,
                lastUpdated: currentDate
              });
            }
          }
          popularityData.sort((a, b) => b.salesCount - a.salesCount);
          await this.writeData("popularity.json", "popularity", popularityData);
        } catch (error) {
        }
      }
      /**
       * Get inventory sorted by popularity
       */
      async getInventoryByPopularity() {
        try {
          const inventory = await this.getInventory();
          const popularity = await this.getProductPopularity();
          const popularityMap = /* @__PURE__ */ new Map();
          popularity.forEach((item) => {
            popularityMap.set(item.productId, item.salesCount);
          });
          return inventory.sort((a, b) => {
            const aPopularity = popularityMap.get(a.id) || 0;
            const bPopularity = popularityMap.get(b.id) || 0;
            if (bPopularity !== aPopularity) {
              return bPopularity - aPopularity;
            }
            return a.name.localeCompare(b.name);
          });
        } catch (error) {
          return this.getInventory();
        }
      }
    };
    fileStorage = new FileStorage();
  }
});

// server/config.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var rootDir = path.join(__dirname, "..");
function loadEnvFile() {
  try {
    const envPath = path.join(rootDir, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const envLines = envContent.split("\n");
      for (const line of envLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;
        const [key, value] = trimmedLine.split("=");
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (error) {
  }
}
loadEnvFile();
var config = {
  useFileStorage: true,
  // Always use file storage
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  sessionSecret: process.env.SESSION_SECRET || "inventory-pro-secret-key-1234",
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || "7200000", 10)
  // 2 hours in milliseconds
};

// server/index.ts
import express3 from "express";

// server/routes.ts
init_fileStorage();
init_logStorage();
init_logger();
import express from "express";
import { createServer } from "http";
import fs5 from "fs/promises";

// server/productLookup.ts
import { z } from "zod";
var ProductInfoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  success: z.boolean(),
  source: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  errorMessage: z.string().optional()
});
var OpenFoodFactsProductSchema = z.object({
  status: z.number(),
  product: z.object({
    product_name: z.string().optional(),
    product_name_en: z.string().optional(),
    product_name_fr: z.string().optional(),
    product_name_es: z.string().optional(),
    abbreviated_product_name: z.string().optional(),
    generic_name: z.string().optional(),
    generic_name_en: z.string().optional(),
    brands: z.string().optional(),
    categories: z.string().optional(),
    categories_tags: z.array(z.string()).optional(),
    image_front_url: z.string().url().optional().or(z.literal("")),
    image_url: z.string().url().optional().or(z.literal("")),
    image_front_small_url: z.string().url().optional().or(z.literal("")),
    ingredients_text: z.string().optional(),
    ingredients_text_en: z.string().optional()
  }).partial().optional()
}).partial();
var UPCDatabaseResponseSchema = z.object({
  code: z.string(),
  items: z.array(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    images: z.array(z.string().url()).optional()
  }).partial()).optional()
}).partial();
var ProductCache = class {
  cache = /* @__PURE__ */ new Map();
  defaultTTL = 24 * 60 * 60 * 1e3;
  // 24 hours
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  clear() {
    this.cache.clear();
  }
  size() {
    return this.cache.size;
  }
};
var RateLimiter = class {
  lastCalls = /* @__PURE__ */ new Map();
  defaultMinInterval = 50;
  // Reduced from 100ms to 50ms for better performance
  upcDatabaseInterval = 1e3;
  // 1 second for UPC Database free tier
  openFoodFactsInterval = 100;
  // Reduced from 200ms to 100ms for Open Food Facts
  async throttle(apiName = "default") {
    const now = Date.now();
    const lastCall = this.lastCalls.get(apiName) || 0;
    const minInterval = this.getMinInterval(apiName);
    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall < minInterval) {
      const delay = minInterval - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastCalls.set(apiName, Date.now());
  }
  getMinInterval(apiName) {
    switch (apiName) {
      case "upcDatabase":
        return this.upcDatabaseInterval;
      case "openFoodFacts":
        return this.openFoodFactsInterval;
      default:
        return this.defaultMinInterval;
    }
  }
};
var BarcodeLogger = class _BarcodeLogger {
  static instance;
  static getInstance() {
    if (!_BarcodeLogger.instance) {
      _BarcodeLogger.instance = new _BarcodeLogger();
    }
    return _BarcodeLogger.instance;
  }
  logAttempt(barcode, apiName) {
    console.log(`[ProductLookup] Attempting ${apiName} for barcode: ${barcode}`);
  }
  logSuccess(barcode, apiName, productName) {
    console.log(`[ProductLookup] SUCCESS ${apiName} for barcode ${barcode}: ${productName || "Found product"}`);
  }
  logError(barcode, apiName, error) {
    console.warn(`[ProductLookup] ERROR ${apiName} for barcode ${barcode}:`, error.message || error);
  }
  logCacheHit(barcode) {
    console.log(`[ProductLookup] Cache HIT for barcode: ${barcode}`);
  }
  logCacheMiss(barcode) {
    console.log(`[ProductLookup] Cache MISS for barcode: ${barcode}`);
  }
};
var productCache = new ProductCache();
var rateLimiter = new RateLimiter();
var logger = BarcodeLogger.getInstance();
function detectRegion(barcode) {
  const prefix = barcode.substring(0, 3);
  const numPrefix = parseInt(prefix);
  if (numPrefix >= 0 && numPrefix <= 19) return "US_CANADA";
  if (numPrefix >= 20 && numPrefix <= 29) return "RESTRICTED";
  if (numPrefix >= 30 && numPrefix <= 39) return "US_DRUGS";
  if (numPrefix >= 40 && numPrefix <= 49) return "RESTRICTED";
  if (numPrefix >= 50 && numPrefix <= 59) return "COUPONS";
  if (numPrefix >= 60 && numPrefix <= 99) return "US_CANADA";
  if (numPrefix >= 100 && numPrefix <= 139) return "US_CANADA";
  if (numPrefix >= 200 && numPrefix <= 299) return "RESTRICTED";
  if (numPrefix >= 300 && numPrefix <= 379) return "FRANCE";
  if (numPrefix >= 380 && numPrefix <= 380) return "BULGARIA";
  if (numPrefix >= 383 && numPrefix <= 383) return "SLOVENIA";
  if (numPrefix >= 385 && numPrefix <= 385) return "CROATIA";
  if (numPrefix >= 387 && numPrefix <= 387) return "BOSNIA_HERZEGOVINA";
  if (numPrefix >= 400 && numPrefix <= 440) return "GERMANY";
  if (numPrefix >= 450 && numPrefix <= 459) return "JAPAN";
  if (numPrefix >= 460 && numPrefix <= 469) return "RUSSIA";
  if (numPrefix >= 470 && numPrefix <= 470) return "KYRGYZSTAN";
  if (numPrefix >= 471 && numPrefix <= 471) return "TAIWAN";
  if (numPrefix >= 474 && numPrefix <= 474) return "ESTONIA";
  if (numPrefix >= 475 && numPrefix <= 475) return "LATVIA";
  if (numPrefix >= 476 && numPrefix <= 476) return "AZERBAIJAN";
  if (numPrefix >= 477 && numPrefix <= 477) return "LITHUANIA";
  if (numPrefix >= 478 && numPrefix <= 478) return "UZBEKISTAN";
  if (numPrefix >= 479 && numPrefix <= 479) return "SRI_LANKA";
  if (numPrefix >= 480 && numPrefix <= 480) return "PHILIPPINES";
  if (numPrefix >= 481 && numPrefix <= 481) return "BELARUS";
  if (numPrefix >= 482 && numPrefix <= 482) return "UKRAINE";
  if (numPrefix >= 484 && numPrefix <= 484) return "MOLDOVA";
  if (numPrefix >= 485 && numPrefix <= 485) return "ARMENIA";
  if (numPrefix >= 486 && numPrefix <= 486) return "GEORGIA";
  if (numPrefix >= 487 && numPrefix <= 487) return "KAZAKHSTAN";
  if (numPrefix >= 488 && numPrefix <= 488) return "TAJIKISTAN";
  if (numPrefix >= 489 && numPrefix <= 489) return "HONG_KONG";
  if (numPrefix >= 490 && numPrefix <= 499) return "JAPAN";
  if (numPrefix >= 500 && numPrefix <= 509) return "UK";
  if (numPrefix >= 520 && numPrefix <= 521) return "GREECE";
  if (numPrefix >= 528 && numPrefix <= 528) return "LEBANON";
  if (numPrefix >= 529 && numPrefix <= 529) return "CYPRUS";
  if (numPrefix >= 530 && numPrefix <= 530) return "ALBANIA";
  if (numPrefix >= 531 && numPrefix <= 531) return "MACEDONIA";
  if (numPrefix >= 535 && numPrefix <= 535) return "MALTA";
  if (numPrefix >= 539 && numPrefix <= 539) return "IRELAND";
  if (numPrefix >= 540 && numPrefix <= 549) return "BELGIUM_LUXEMBOURG";
  if (numPrefix >= 560 && numPrefix <= 560) return "PORTUGAL";
  if (numPrefix >= 569 && numPrefix <= 569) return "ICELAND";
  if (numPrefix >= 570 && numPrefix <= 579) return "DENMARK";
  if (numPrefix >= 590 && numPrefix <= 590) return "POLAND";
  if (numPrefix >= 594 && numPrefix <= 594) return "ROMANIA";
  if (numPrefix >= 599 && numPrefix <= 599) return "HUNGARY";
  if (numPrefix >= 600 && numPrefix <= 601) return "SOUTH_AFRICA";
  if (numPrefix >= 603 && numPrefix <= 603) return "GHANA";
  if (numPrefix >= 604 && numPrefix <= 604) return "SENEGAL";
  if (numPrefix >= 608 && numPrefix <= 608) return "BAHRAIN";
  if (numPrefix >= 609 && numPrefix <= 609) return "MAURITIUS";
  if (numPrefix >= 611 && numPrefix <= 611) return "MOROCCO";
  if (numPrefix >= 613 && numPrefix <= 613) return "ALGERIA";
  if (numPrefix >= 615 && numPrefix <= 615) return "NIGERIA";
  if (numPrefix >= 616 && numPrefix <= 616) return "KENYA";
  if (numPrefix >= 617 && numPrefix <= 617) return "CAMEROON";
  if (numPrefix >= 618 && numPrefix <= 618) return "IVORY_COAST";
  if (numPrefix >= 619 && numPrefix <= 619) return "TUNISIA";
  if (numPrefix >= 620 && numPrefix <= 620) return "TANZANIA";
  if (numPrefix >= 621 && numPrefix <= 621) return "SYRIA";
  if (numPrefix >= 622 && numPrefix <= 622) return "EGYPT";
  if (numPrefix >= 623 && numPrefix <= 623) return "BRUNEI";
  if (numPrefix >= 624 && numPrefix <= 624) return "LIBYA";
  if (numPrefix >= 625 && numPrefix <= 625) return "JORDAN";
  if (numPrefix >= 626 && numPrefix <= 626) return "IRAN";
  if (numPrefix >= 627 && numPrefix <= 627) return "KUWAIT";
  if (numPrefix >= 628 && numPrefix <= 628) return "SAUDI_ARABIA";
  if (numPrefix >= 629 && numPrefix <= 629) return "UAE";
  if (numPrefix >= 640 && numPrefix <= 649) return "FINLAND";
  if (numPrefix >= 690 && numPrefix <= 695) return "CHINA";
  if (numPrefix >= 700 && numPrefix <= 709) return "NORWAY";
  if (numPrefix >= 729 && numPrefix <= 729) return "ISRAEL";
  if (numPrefix >= 730 && numPrefix <= 739) return "SWEDEN";
  if (numPrefix >= 740 && numPrefix <= 740) return "GUATEMALA";
  if (numPrefix >= 741 && numPrefix <= 741) return "EL_SALVADOR";
  if (numPrefix >= 742 && numPrefix <= 742) return "HONDURAS";
  if (numPrefix >= 743 && numPrefix <= 743) return "NICARAGUA";
  if (numPrefix >= 744 && numPrefix <= 744) return "COSTA_RICA";
  if (numPrefix >= 745 && numPrefix <= 745) return "PANAMA";
  if (numPrefix >= 746 && numPrefix <= 746) return "DOMINICAN_REPUBLIC";
  if (numPrefix >= 750 && numPrefix <= 750) return "MEXICO";
  if (numPrefix >= 754 && numPrefix <= 755) return "CANADA";
  if (numPrefix >= 759 && numPrefix <= 759) return "VENEZUELA";
  if (numPrefix >= 760 && numPrefix <= 769) return "SWITZERLAND";
  if (numPrefix >= 770 && numPrefix <= 771) return "COLOMBIA";
  if (numPrefix >= 773 && numPrefix <= 773) return "URUGUAY";
  if (numPrefix >= 775 && numPrefix <= 775) return "PERU";
  if (numPrefix >= 777 && numPrefix <= 777) return "BOLIVIA";
  if (numPrefix >= 778 && numPrefix <= 779) return "ARGENTINA";
  if (numPrefix >= 780 && numPrefix <= 780) return "CHILE";
  if (numPrefix >= 784 && numPrefix <= 784) return "PARAGUAY";
  if (numPrefix >= 786 && numPrefix <= 786) return "ECUADOR";
  if (numPrefix >= 789 && numPrefix <= 790) return "BRAZIL";
  if (numPrefix >= 800 && numPrefix <= 839) return "ITALY";
  if (numPrefix >= 840 && numPrefix <= 849) return "SPAIN";
  if (numPrefix >= 850 && numPrefix <= 850) return "CUBA";
  if (numPrefix >= 858 && numPrefix <= 858) return "SLOVAKIA";
  if (numPrefix >= 859 && numPrefix <= 859) return "CZECH_REPUBLIC";
  if (numPrefix >= 860 && numPrefix <= 860) return "YUGOSLAVIA";
  if (numPrefix >= 865 && numPrefix <= 865) return "MONGOLIA";
  if (numPrefix >= 867 && numPrefix <= 867) return "NORTH_KOREA";
  if (numPrefix >= 868 && numPrefix <= 869) return "TURKEY";
  if (numPrefix >= 870 && numPrefix <= 879) return "NETHERLANDS";
  if (numPrefix >= 880 && numPrefix <= 880) return "SOUTH_KOREA";
  if (numPrefix >= 884 && numPrefix <= 884) return "CAMBODIA";
  if (numPrefix >= 885 && numPrefix <= 885) return "THAILAND";
  if (numPrefix >= 888 && numPrefix <= 888) return "SINGAPORE";
  if (numPrefix >= 890 && numPrefix <= 890) return "INDIA";
  if (numPrefix >= 893 && numPrefix <= 893) return "VIETNAM";
  if (numPrefix >= 896 && numPrefix <= 896) return "PAKISTAN";
  if (numPrefix >= 899 && numPrefix <= 899) return "INDONESIA";
  if (numPrefix >= 900 && numPrefix <= 919) return "AUSTRIA";
  if (numPrefix >= 930 && numPrefix <= 939) return "AUSTRALIA";
  if (numPrefix >= 940 && numPrefix <= 949) return "NEW_ZEALAND";
  if (numPrefix >= 950 && numPrefix <= 950) return "GS1_GLOBAL";
  if (numPrefix >= 951 && numPrefix <= 951) return "EPC_GLOBAL";
  if (numPrefix >= 955 && numPrefix <= 955) return "MALAYSIA";
  if (numPrefix >= 958 && numPrefix <= 958) return "MACAU";
  if (numPrefix >= 740 && numPrefix <= 750) return "CARICOM";
  return "UNKNOWN";
}
function getRegionLanguages(region) {
  const languageMap = {
    "CHINA": ["zh", "zh-CN", "en"],
    "JAPAN": ["ja", "en"],
    "FRANCE": ["fr", "en"],
    "GERMANY": ["de", "en"],
    "SPAIN": ["es", "en"],
    "ITALY": ["it", "en"],
    "NETHERLANDS": ["nl", "en"],
    "SWEDEN": ["sv", "en"],
    "NORWAY": ["no", "en"],
    "FINLAND": ["fi", "en"],
    "DENMARK": ["da", "en"],
    "RUSSIA": ["ru", "en"],
    "BRAZIL": ["pt", "en"],
    "MEXICO": ["es", "en"],
    "CARICOM": ["en", "es", "fr"],
    "SOUTH_KOREA": ["ko", "en"],
    "THAILAND": ["th", "en"],
    "VIETNAM": ["vi", "en"],
    "INDIA": ["hi", "en"],
    "TURKEY": ["tr", "en"],
    "ARABIC": ["ar", "en"]
  };
  return languageMap[region] || ["en"];
}
async function searchGS1GEPIR(barcode) {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    const response = await fetch(`https://gepir.gs1.org/index.php/search-by-gtin/${barcode}`);
    const text = await response.text();
    const nameMatch = text.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const companyMatch = text.match(/Company Name:<\/strong>\s*([^<]+)/i);
    if (nameMatch && nameMatch[1]) {
      return {
        name: nameMatch[1].trim(),
        brand: companyMatch ? companyMatch[1].trim() : void 0,
        success: true,
        source: "GS1 GEPIR",
        region
      };
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchChinaGBT(barcode) {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    if (!region.includes("CHINA") && !barcode.startsWith("69")) {
      return { success: false };
    }
    const response = await fetch(`https://www.ancc.org.cn/Service/queryGtin.aspx?gtin=${barcode}`);
    const data = await response.json();
    if (data && data.success && data.productInfo) {
      return {
        name: data.productInfo.productName || data.productInfo.name,
        description: data.productInfo.description,
        brand: data.productInfo.brand || data.productInfo.manufacturer,
        category: data.productInfo.category,
        imageUrl: data.productInfo.imageUrl,
        success: true,
        source: "China GB/T",
        region: "CHINA",
        language: "zh-CN"
      };
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchGS1Caribbean(barcode) {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    const caribbeanPrefixes = ["740", "741", "742", "743", "744", "745", "746"];
    const prefix = barcode.substring(0, 3);
    if (!caribbeanPrefixes.includes(prefix) && region !== "CARICOM") {
      return { success: false };
    }
    const response = await fetch(`https://gs1caribbean.org/api/product/${barcode}`);
    const data = await response.json();
    if (data && data.success && data.product) {
      const product = data.product;
      return {
        name: product.productName || product.name,
        description: product.description,
        brand: product.brand || product.manufacturerName,
        category: product.category || product.productCategory,
        imageUrl: product.imageUrl || product.productImage,
        success: true,
        source: "GS1 Caribbean",
        region: "CARICOM",
        language: "en"
      };
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchCARICOMRegional(barcode) {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    const caricomApis = [
      { url: "https://api.jamaicatradepoint.gov.jm/products", country: "Jamaica" },
      { url: "https://api.ttbs.org.tt/products", country: "Trinidad & Tobago" },
      { url: "https://api.barbados.gov.bb/products", country: "Barbados" },
      { url: "https://api.guyana.gov.gy/products", country: "Guyana" }
    ];
    for (const api of caricomApis) {
      try {
        const response = await fetch(`${api.url}/${barcode}`);
        const data = await response.json();
        if (data && data.success && data.product) {
          const product = data.product;
          return {
            name: product.productName || product.name,
            description: product.description,
            brand: product.brand || product.manufacturer,
            category: product.category,
            imageUrl: product.imageUrl,
            success: true,
            source: `CARICOM (${api.country})`,
            region: "CARICOM",
            language: "en"
          };
        }
      } catch (apiError) {
        continue;
      }
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchOpenFoodFacts(barcode) {
  const apiName = "openFoodFacts";
  try {
    logger.logAttempt(barcode, "Open Food Facts");
    await rateLimiter.throttle(apiName);
    const region = detectRegion(barcode);
    const languages = getRegionLanguages(region);
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        "User-Agent": "Inventory-Pro/1.0.0 (Product Lookup Service)"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const rawData = await response.json();
    const validationResult = OpenFoodFactsProductSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(`Invalid API response structure: ${validationResult.error.message}`);
    }
    const data = validationResult.data;
    if (data.status === 1 && data.product) {
      const product = data.product;
      let name = "";
      let description = "";
      for (const lang of languages) {
        const langField = `product_name_${lang}`;
        if (!name && product[langField]) {
          name = product[langField];
          break;
        }
      }
      if (!name) {
        name = product.product_name || product.product_name_en || product.product_name_fr || product.product_name_es || product.abbreviated_product_name || product.generic_name || product.generic_name_en || "";
      }
      for (const lang of languages) {
        const langField = `generic_name_${lang}`;
        if (!description && product[langField]) {
          description = product[langField];
          break;
        }
      }
      if (!description) {
        description = product.generic_name || product.generic_name_en || product.ingredients_text_en || product.ingredients_text || "";
      }
      let imageUrl = product.image_front_url || product.image_url || product.image_front_small_url || "";
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = "";
      }
      if (name.trim()) {
        const result = {
          name: name.trim(),
          description: description ? description.trim() : void 0,
          brand: product.brands || void 0,
          category: product.categories || product.categories_tags?.[0] || void 0,
          imageUrl: imageUrl || void 0,
          success: true,
          source: "Open Food Facts",
          region,
          language: languages[0]
        };
        logger.logSuccess(barcode, "Open Food Facts", result.name);
        return result;
      }
    }
    return {
      success: false,
      errorMessage: "Product not found in Open Food Facts database"
    };
  } catch (error) {
    logger.logError(barcode, "Open Food Facts", error);
    return {
      success: false,
      errorMessage: `Open Food Facts API error: ${error.message}`
    };
  }
}
async function searchUPCDatabase(barcode) {
  const apiName = "upcDatabase";
  try {
    logger.logAttempt(barcode, "UPC Database");
    await rateLimiter.throttle(apiName);
    const apiKey = process.env.UPC_DATABASE_API_KEY;
    const baseUrl = apiKey ? "https://api.upcitemdb.com/prod/trial/lookup" : "https://api.upcitemdb.com/prod/trial/lookup";
    const url = `${baseUrl}?upc=${barcode}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Inventory-Pro/1.0.0 (Product Lookup Service)",
        ...apiKey && { "user_key": apiKey }
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const rawData = await response.json();
    const validationResult = UPCDatabaseResponseSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(`Invalid API response structure: ${validationResult.error.message}`);
    }
    const data = validationResult.data;
    if (data.code === "OK" && data.items && data.items.length > 0) {
      const item = data.items[0];
      const result = {
        name: item.title || void 0,
        description: item.description || void 0,
        brand: item.brand || void 0,
        category: item.category || void 0,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : void 0,
        success: true,
        source: apiKey ? "UPC Database (API Key)" : "UPC Database (Free)"
      };
      logger.logSuccess(barcode, "UPC Database", result.name);
      return result;
    } else if (data.code === "RATE_LIMIT_EXCEEDED") {
      throw new Error("Rate limit exceeded for UPC Database free tier");
    }
    return {
      success: false,
      errorMessage: "Product not found in UPC Database"
    };
  } catch (error) {
    logger.logError(barcode, "UPC Database", error);
    return {
      success: false,
      errorMessage: `UPC Database API error: ${error.message}`
    };
  }
}
async function lookupProductByBarcode(barcode) {
  const cleanBarcode = barcode.replace(/\D/g, "");
  if (!cleanBarcode || cleanBarcode.length < 8) {
    logger.logError(cleanBarcode, "Validation", new Error("Invalid barcode length"));
    return {
      success: false,
      errorMessage: "Invalid barcode: must be at least 8 digits"
    };
  }
  const cacheKey = `barcode_${cleanBarcode}`;
  const cached = productCache.get(cacheKey);
  if (cached) {
    logger.logCacheHit(cleanBarcode);
    return { ...cached, source: `${cached.source} (cached)` };
  }
  logger.logCacheMiss(cleanBarcode);
  const barcodeVariants = [
    cleanBarcode,
    // Add leading zeros for UPC-A format (12 digits)
    cleanBarcode.length === 11 ? "0" + cleanBarcode : null,
    // Try without leading zeros for EAN-13 format
    cleanBarcode.startsWith("0") && cleanBarcode.length === 13 ? cleanBarcode.substring(1) : null,
    // Try both with and without check digit
    cleanBarcode.length > 8 ? cleanBarcode.substring(0, cleanBarcode.length - 1) : null
  ].filter(Boolean);
  const region = detectRegion(cleanBarcode);
  const freeApis = [
    searchOpenFoodFacts,
    // Comprehensive free food product database
    searchUPCDatabase
    // General product database with free tier
  ];
  let apis = [...freeApis];
  if (region === "CHINA" || cleanBarcode.startsWith("69")) {
    apis = [searchChinaGBT, searchGS1GEPIR, ...apis];
  } else if (region === "CARICOM" || ["740", "741", "742", "743", "744", "745", "746"].includes(cleanBarcode.substring(0, 3))) {
    apis = [searchGS1Caribbean, searchCARICOMRegional, searchGS1GEPIR, ...apis];
  } else {
    apis = [searchGS1GEPIR, ...apis];
  }
  const errors = [];
  for (const barcodeVariant of barcodeVariants) {
    for (const api of apis) {
      try {
        const result = await api(barcodeVariant);
        if (result.success) {
          productCache.set(cacheKey, result);
          if (!result.region) {
            result.region = region;
          }
          return result;
        } else if (result.errorMessage) {
          errors.push(result.errorMessage);
        }
      } catch (error) {
        logger.logError(barcodeVariant, api.name, error);
        errors.push(`${api.name}: ${error.message}`);
        continue;
      }
    }
  }
  const failedResult = {
    success: false,
    errorMessage: `Product not found. Tried ${apis.length} APIs. Errors: ${errors.join("; ")}`
  };
  productCache.set(cacheKey, failedResult, 60 * 60 * 1e3);
  return failedResult;
}

// server/routes.ts
import path5 from "path";
import { fileURLToPath as fileURLToPath4 } from "url";
import { dirname as dirname3 } from "path";

// server/fileUpload.ts
import multer from "multer";
import path4 from "path";
import fs4 from "fs-extra";
import { fileURLToPath as fileURLToPath3 } from "url";
import { dirname as dirname2 } from "path";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = dirname2(__filename3);
var uploadDir = path4.join(__dirname3, "uploads");
var inventoryImagesDir = path4.join(uploadDir, "inventory");
var logoImagesDir = path4.join(uploadDir, "logos");
var receiptImagesDir = path4.join(uploadDir, "receipts");
var csvDir = path4.join(uploadDir, "csv");
fs4.ensureDirSync(uploadDir);
fs4.ensureDirSync(inventoryImagesDir);
fs4.ensureDirSync(logoImagesDir);
fs4.ensureDirSync(receiptImagesDir);
fs4.ensureDirSync(csvDir);
var inventoryStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, inventoryImagesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path4.extname(file.originalname);
    cb(null, "inventory-" + uniqueSuffix + ext);
  }
});
var logoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, logoImagesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path4.extname(file.originalname);
    cb(null, "store-logo-" + uniqueSuffix + ext);
  }
});
var receiptStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, receiptImagesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path4.extname(file.originalname);
    cb(null, "receipt-" + uniqueSuffix + ext);
  }
});
var csvStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path4.join(uploadDir, "csv"));
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "inventory-import-" + uniqueSuffix + ".csv");
  }
});
var imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};
var receiptFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only image files and PDFs are allowed for receipts"));
  }
};
var csvFileFilter = (req, file, cb) => {
  if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed"));
  }
};
var inventoryImageUpload = multer({
  storage: inventoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB max file size
  },
  fileFilter: imageFileFilter
});
var logoImageUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024
    // 2MB max file size
  },
  fileFilter: imageFileFilter
});
var receiptUpload = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max file size for receipts
  },
  fileFilter: receiptFileFilter
});
var csvUpload = multer({
  storage: csvStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max file size
  },
  fileFilter: csvFileFilter
});
fs4.ensureDirSync(path4.join(uploadDir, "csv"));
async function processCsvFile(filePath) {
  const fs8 = await import("fs/promises");
  const { parse } = await import("csv-parse/sync");
  try {
    const content = await fs8.readFile(filePath, "utf-8");
    const records = parse(content, {
      columns: (header) => {
        return header.map((column) => {
          let normalizedColumn = column.toLowerCase().trim();
          if (normalizedColumn === "price unit" || normalizedColumn === "priceunit" || normalizedColumn === "unit price") {
            normalizedColumn = "priceunit";
          } else if (normalizedColumn === "barcode number" || normalizedColumn === "barcode") {
            normalizedColumn = "barcode";
          }
          return normalizedColumn;
        });
      },
      skip_empty_lines: true,
      trim: true
    });
    const standardizedRecords = records.map((record) => {
      const normalizedRecord = {};
      Object.keys(record).forEach((key) => {
        if (record[key] !== void 0 && record[key] !== null && record[key] !== "") {
          normalizedRecord[key.toLowerCase()] = record[key];
        }
      });
      return normalizedRecord;
    });
    return standardizedRecords;
  } catch (error) {
    console.error(`Error processing CSV file: ${error}`);
    throw error;
  }
}

// server/routes.ts
init_dailyStatsReset();
var __filename4 = fileURLToPath4(import.meta.url);
var __dirname4 = dirname3(__filename4);
var resetCsvTemplate = async () => {
  try {
    const csvTemplatePaths = [
      path5.join(__dirname4, "../client/public/sample-inventory-import.csv"),
      path5.join(__dirname4, "../dist/public/sample-inventory-import.csv")
    ];
    const cleanCsvContent = `sku,name,category,stock,unit,price,priceUnit,threshold,barcode
GRC-001,Brown Rice,Grains,100,kg,2.50,kg,20,8901234567890
GRC-002,White Basmati Rice,Grains,80,kg,3.75,kg,15,8901234567891
GRC-003,Long Grain Rice,Grains,120,kg,2.25,kg,25,8901234567892
FRT-001,Apples,Fruits,50,kg,1.99,kg,10,8901234567893
FRT-002,Bananas,Fruits,60,kg,1.50,kg,15,8901234567894
FRT-003,Oranges,Fruits,45,kg,2.25,kg,10,8901234567895
VEG-001,Tomatoes,Vegetables,40,kg,1.80,kg,8,8901234567896
VEG-002,Potatoes,Vegetables,100,kg,1.20,kg,20,8901234567897
VEG-003,Onions,Vegetables,80,kg,1.10,kg,15,8901234567898
DRY-001,Pasta,Dry Goods,60,pack,1.99,each,10,8901234567899
DRY-002,Flour,Dry Goods,40,kg,1.50,kg,8,8901234567900
DRY-003,Sugar,Dry Goods,50,kg,2.20,kg,10,8901234567901
BVG-001,Milk,Beverages,30,liter,2.50,liter,10,8901234567902
BVG-002,Orange Juice,Beverages,25,liter,3.75,liter,5,8901234567903
BVG-003,Coffee,Beverages,20,pack,8.50,each,5,8901234567904`;
    for (const csvPath of csvTemplatePaths) {
      try {
        await fs5.writeFile(csvPath, cleanCsvContent);
        console.log(`Reset CSV template at ${csvPath} to clean state`);
      } catch (error) {
        console.warn(`Could not reset CSV template at ${csvPath}:`, error);
      }
    }
  } catch (error) {
    console.error("Error resetting CSV template:", error);
  }
};
var updateCsvTemplate = async (item, isTestItem = false) => {
  try {
    if (isTestItem) {
      console.log(`Skipping test item ${item.sku} from CSV template update`);
      return;
    }
    const csvTemplatePaths = [
      path5.join(__dirname4, "../client/public/sample-inventory-import.csv"),
      path5.join(__dirname4, "../dist/public/sample-inventory-import.csv")
    ];
    const csvRow = `${item.sku},${item.name},${item.category},,${item.unit},${item.price},${item.priceUnit},${item.threshold},${item.barcode || ""}`;
    for (const csvPath of csvTemplatePaths) {
      try {
        await fs5.appendFile(csvPath, "\n" + csvRow);
        console.log(`Added item ${item.sku} to CSV template at ${csvPath}`);
      } catch (error) {
        console.warn(`Could not update CSV template at ${csvPath}:`, error);
      }
    }
  } catch (error) {
    console.error("Error updating CSV template:", error);
  }
};
var getCurrentUser = (req) => {
  try {
    const userInfoHeader = req.headers["user-info"];
    if (userInfoHeader && typeof userInfoHeader === "string") {
      try {
        const userData = JSON.parse(userInfoHeader);
        if (userData && typeof userData === "object" && "id" in userData && "username" in userData && "role" in userData) {
          if (!["Administrator", "Manager", "Cashier", "Stocker", "system"].includes(userData.role)) {
            console.warn(`Invalid role detected: ${userData.role}, defaulting to Cashier`);
            userData.role = "Cashier";
          }
          return userData;
        }
      } catch (parseError) {
        console.error("Error parsing user info from header:", parseError);
      }
    }
    return { id: 0, username: "system", role: "system" };
  } catch (error) {
    console.error("Error processing user information:", error);
    return { id: 0, username: "system", role: "system" };
  }
};
var isAdmin = (req, res, next) => {
  const currentUser = getCurrentUser(req);
  if (!currentUser || typeof currentUser.id !== "number" || currentUser.id === 0) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource"
    });
  }
  if (currentUser.role !== "Administrator") {
    console.warn(`Unauthorized admin access attempt by ${currentUser.username} (ID: ${currentUser.id}, Role: ${currentUser.role})`);
    return res.status(403).json({
      error: "Access denied",
      message: "Administrator permissions required for this operation"
    });
  }
  next();
};
async function registerRoutes(app2) {
  app2.use("/uploads", (req, res, next) => {
    if (req.path.includes("..")) {
      return res.status(403).send("Forbidden");
    }
    next();
  }, express.static(path5.join(__dirname4, "uploads")));
  app2.get("/api/stats", async (req, res) => {
    try {
      const stats2 = await fileStorage.getStats();
      res.json(stats2);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });
  app2.get("/api/inventory", async (req, res) => {
    try {
      const items = await fileStorage.getInventory();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });
  app2.get("/api/inventory/popular", async (req, res) => {
    try {
      const items = await fileStorage.getInventoryByPopularity();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory by popularity:", error);
      res.status(500).json({ error: "Failed to fetch inventory by popularity" });
    }
  });
  app2.get("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await fileStorage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ error: "Failed to fetch inventory item" });
    }
  });
  app2.get("/api/product-lookup/:barcode", async (req, res) => {
    try {
      const barcode = req.params.barcode;
      const productInfo = await lookupProductByBarcode(barcode);
      res.json(productInfo);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to lookup product information"
      });
    }
  });
  app2.post("/api/inventory", async (req, res) => {
    try {
      const requiredFields = ["name", "sku", "category", "stock", "unit", "price", "priceUnit", "threshold"];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }
      const newItem = await fileStorage.addInventoryItem(req.body);
      const isTestItem = /test/i.test(newItem.name) || /test/i.test(newItem.sku);
      await updateCsvTemplate(newItem, isTestItem);
      const currentUser = getCurrentUser(req);
      if (currentUser) {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.CREATE,
          `Added item: ${newItem.name} (SKU: ${newItem.sku}), Quantity: ${newItem.stock} ${newItem.unit}`
        );
      }
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to add inventory item" });
    }
  });
  app2.put("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const originalItem = await fileStorage.getInventoryItem(id);
      if (!originalItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      const currentUser = getCurrentUser(req);
      const hasProfitUpdates = req.body.costPrice !== void 0 || req.body.profitMargin !== void 0 || req.body.profitType !== void 0;
      if (hasProfitUpdates && !["Administrator", "Manager"].includes(currentUser.role)) {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.UPDATE,
          `Unauthorized profit update attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: You don't have permission to update profit settings" });
      }
      const hasPriceUpdate = req.body.price !== void 0;
      if (hasPriceUpdate && currentUser.role === "Stocker") {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.UPDATE,
          `Unauthorized price update attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: Stocker accounts cannot modify prices" });
      }
      let updateData = { ...req.body };
      if (req.body.stock !== void 0 || req.body.threshold !== void 0) {
        const newStock = req.body.stock !== void 0 ? req.body.stock : originalItem.stock;
        const newThreshold = req.body.threshold !== void 0 ? req.body.threshold : originalItem.threshold;
        updateData.status = newStock <= newThreshold ? "Low Stock" : "In Stock";
      }
      const updatedItem = await fileStorage.updateInventoryItem(id, updateData);
      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update item" });
      }
      if (req.body.stock !== void 0 || req.body.threshold !== void 0) {
        const oldStatus = originalItem.stock <= originalItem.threshold;
        const newStatus = updatedItem.stock <= updatedItem.threshold;
        if (oldStatus !== newStatus) {
          const stats2 = await fileStorage.getStats();
          if (oldStatus && !newStatus) {
            await fileStorage.updateStats({
              lowStockItems: Math.max(0, stats2.lowStockItems - 1)
            });
          } else if (!oldStatus && newStatus) {
            await fileStorage.updateStats({
              lowStockItems: stats2.lowStockItems + 1
            });
          }
        }
      }
      let details = `Updated item: ${originalItem.name} (ID: ${originalItem.id})`;
      if (req.body.stock !== void 0 && originalItem.stock !== req.body.stock) {
        details += `, Stock changed from ${originalItem.stock} to ${req.body.stock}`;
      }
      if (req.body.price !== void 0 && originalItem.price !== req.body.price) {
        details += `, Price changed from ${originalItem.price} to ${req.body.price}`;
      }
      if (req.body.threshold !== void 0 && originalItem.threshold !== req.body.threshold) {
        details += `, Threshold changed from ${originalItem.threshold} to ${req.body.threshold}`;
      }
      if (req.body.costPrice !== void 0) {
        const oldCost = originalItem.costPrice || "not set";
        details += `, Cost price changed from ${oldCost} to ${req.body.costPrice}`;
      }
      if (req.body.profitMargin !== void 0) {
        const oldMargin = originalItem.profitMargin || "not set";
        details += `, Profit margin changed from ${oldMargin} to ${req.body.profitMargin}`;
      }
      if (req.body.profitType !== void 0 && originalItem.profitType !== req.body.profitType) {
        details += `, Profit type changed from ${originalItem.profitType || "not set"} to ${req.body.profitType}`;
      }
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.UPDATE,
        details
      );
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ error: "Failed to update inventory item" });
    }
  });
  app2.delete("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = getCurrentUser(req);
      if (currentUser.role === "Stocker") {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.DELETE,
          `Unauthorized deletion attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: You don't have permission to delete inventory items" });
      }
      const item = await fileStorage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      const success = await fileStorage.deleteInventoryItem(id);
      if (!success) {
        return res.status(404).json({ error: "Failed to delete item" });
      }
      const details = `Deleted item: ${item.name} (ID: ${item.id}, SKU: ${item.sku}, Stock: ${item.stock})`;
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.DELETE,
        details
      );
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ error: "Failed to delete inventory item" });
    }
  });
  app2.post("/api/inventory/csv-upload", csvUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const csvItems = await processCsvFile(req.file.path);
      const normalizedItems = csvItems.map((item, index) => {
        const normalizedItem = {};
        Object.keys(item).forEach((key) => {
          const lowercaseKey = key.toLowerCase().trim();
          if (item[key] !== void 0 && item[key] !== null && item[key] !== "") {
            normalizedItem[lowercaseKey] = item[key];
          }
        });
        if (!normalizedItem.priceunit && (normalizedItem["price unit"] || normalizedItem.price_unit || normalizedItem["unit price"])) {
          normalizedItem.priceunit = normalizedItem["price unit"] || normalizedItem.price_unit || normalizedItem["unit price"];
        }
        return normalizedItem;
      });
      res.json({
        success: true,
        items: normalizedItems,
        message: `Successfully parsed ${normalizedItems.length} items from CSV`
      });
    } catch (error) {
      console.error("Error processing CSV file:", error);
      res.status(500).json({
        error: "Failed to process CSV file",
        message: error.message
      });
    }
  });
  app2.post("/api/inventory/image-upload", inventoryImageUpload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }
      const imageUrl = `/uploads/inventory/${req.file.filename}`;
      res.json({
        success: true,
        imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading inventory image:", error);
      res.status(500).json({
        error: "Failed to upload image",
        message: error.message
      });
    }
  });
  app2.post("/api/receipts/upload", receiptUpload.single("receipt"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No receipt uploaded" });
      }
      const receiptUrl = `/uploads/receipts/${req.file.filename}`;
      const currentUser = getCurrentUser(req);
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.CREATE,
        // Using CREATE action for receipt uploads
        `Uploaded receipt: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`
      );
      res.json({
        success: true,
        receiptUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message: "Receipt uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading receipt:", error);
      res.status(500).json({
        error: "Failed to upload receipt",
        message: error.message
      });
    }
  });
  app2.post("/api/settings/logo-upload", logoImageUpload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No logo image uploaded" });
      }
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      const storeSettings = await fileStorage.getStoreSettings();
      await fileStorage.updateStoreSettings({
        ...storeSettings,
        storeLogo: logoUrl
      });
      const currentUser = getCurrentUser(req);
      await ActivityLogger.logSettingsActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.SETTINGS.UPDATE,
        "Updated store logo"
      );
      res.json({
        success: true,
        logoUrl,
        message: "Store logo updated successfully"
      });
    } catch (error) {
      console.error("Error uploading store logo:", error);
      res.status(500).json({
        error: "Failed to upload store logo",
        message: error.message
      });
    }
  });
  app2.post("/api/inventory/bulk", async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Invalid or empty items array" });
      }
      const results = {
        updated: 0,
        created: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
      const inventoryItems = await fileStorage.getInventory();
      for (const item of items) {
        try {
          const normalizedItem = {};
          Object.keys(item).forEach((key) => {
            if (item[key] !== void 0 && item[key] !== null && item[key] !== "") {
              normalizedItem[key.toLowerCase()] = item[key];
            }
          });
          const requiredFields = ["sku", "name", "category", "unit", "price", "priceunit", "threshold"];
          const missingFields = requiredFields.filter(
            (field) => normalizedItem[field] === void 0 || normalizedItem[field] === null || normalizedItem[field] === ""
          );
          if (missingFields.length > 0) {
            results.failed++;
            results.errors.push(`Item with SKU ${normalizedItem.sku || "unknown"}: Missing required fields: ${missingFields.join(", ")}`);
            continue;
          }
          if (normalizedItem.stock === void 0 || normalizedItem.stock === null || normalizedItem.stock === "" || String(normalizedItem.stock).trim() === "") {
            console.log(`Skipping item with SKU ${normalizedItem.sku}: blank stock quantity`);
            results.skipped++;
            continue;
          }
          const cleanedItem = {
            sku: normalizedItem.sku,
            name: normalizedItem.name,
            category: normalizedItem.category,
            stock: parseFloat(normalizedItem.stock),
            unit: normalizedItem.unit,
            price: parseFloat(normalizedItem.price),
            priceUnit: normalizedItem.priceunit,
            // Map to correct field name
            threshold: parseFloat(normalizedItem.threshold),
            barcode: normalizedItem.barcode || ""
          };
          const existingItem = inventoryItems.find((i) => i.sku === cleanedItem.sku);
          if (existingItem) {
            const updatedItem = await fileStorage.updateInventoryItem(existingItem.id, {
              ...cleanedItem,
              status: cleanedItem.stock < cleanedItem.threshold ? "Low Stock" : "In Stock"
            });
            if (updatedItem) {
              results.updated++;
            } else {
              results.failed++;
              results.errors.push(`Failed to update item with SKU: ${cleanedItem.sku}`);
            }
          } else {
            const newItem = await fileStorage.addInventoryItem({
              ...cleanedItem,
              status: cleanedItem.stock < cleanedItem.threshold ? "Low Stock" : "In Stock"
            });
            if (newItem) {
              results.created++;
            } else {
              results.failed++;
              results.errors.push(`Failed to create item with SKU: ${cleanedItem.sku}`);
            }
          }
        } catch (error) {
          console.error(`Error processing item:`, error);
          results.failed++;
          results.errors.push(`Error processing item with SKU ${item.sku || "unknown"}: ${error.message || "Unknown error"}`);
        }
      }
      const currentUser = getCurrentUser(req);
      const details = `Bulk import: ${results.created} created, ${results.updated} updated, ${results.failed} failed, ${results.skipped} skipped (blank quantity)`;
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.BULK_IMPORT,
        details
      );
      res.json(results);
    } catch (error) {
      console.error("Error in bulk inventory import:", error);
      res.status(500).json({ error: "Failed to process bulk inventory import" });
    }
  });
  app2.get("/api/sales", async (req, res) => {
    try {
      const sales = await fileStorage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Failed to fetch sales data" });
    }
  });
  app2.get("/api/sales/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const sale = await fileStorage.getSale(id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ error: "Failed to fetch sale data" });
    }
  });
  app2.post("/api/sales/:id/refund", async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = getCurrentUser(req);
      const refundedSale = await fileStorage.refundSale(id, currentUser.username);
      if (!refundedSale) {
        return res.status(404).json({ error: "Sale not found or already refunded" });
      }
      const details = `Refunded transaction: ID ${id}, Total: $${refundedSale.amount.toFixed(2)}, Items returned to inventory`;
      await ActivityLogger.logSalesActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.SALES.REFUND,
        details
      );
      res.json(refundedSale);
    } catch (error) {
      console.error("Error refunding sale:", error);
      res.status(500).json({ error: "Failed to process refund" });
    }
  });
  app2.post("/api/sales", async (req, res) => {
    try {
      if (!req.body.cashier || !req.body.amount || !req.body.items || !Array.isArray(req.body.items)) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const newSale = await fileStorage.addSale(req.body);
      const saleDate = new Date(newSale.date);
      if (DateUtils.isTodayUTC(saleDate)) {
        const stats2 = await fileStorage.getStats();
        await fileStorage.updateStats({
          todaySales: stats2.todaySales + req.body.amount
        });
      }
      for (const item of req.body.items) {
        const inventoryItem = await fileStorage.getInventoryItem(item.productId);
        if (inventoryItem) {
          const newStock = Math.max(0, inventoryItem.stock - item.quantity);
          await fileStorage.updateInventoryItem(item.productId, {
            stock: newStock
          });
          if (inventoryItem.stock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
            await fileStorage.updateStats({
              lowStockItems: stats.lowStockItems + 1
            });
          }
        }
      }
      const userInfoHeader = req.headers["user-info"];
      let currentUser = { id: 0, username: "unknown" };
      if (userInfoHeader) {
        try {
          currentUser = JSON.parse(userInfoHeader);
        } catch (e) {
          console.error("Error parsing user info:", e);
        }
      }
      let itemsList = "";
      let totalItems = 0;
      newSale.items.forEach((item) => {
        totalItems += item.quantity;
      });
      const details = `Sale completed: ID ${newSale.id}, Total: $${newSale.amount.toFixed(2)}, Items: ${totalItems}`;
      await ActivityLogger.logSalesActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.SALES.CREATE,
        details
      );
      res.status(201).json(newSale);
    } catch (error) {
      console.error("Error adding sale:", error);
      res.status(500).json({ error: "Failed to add sale" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const users = await fileStorage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await fileStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const newUser = await fileStorage.createUser(req.body);
      const currentUser = getCurrentUser(req);
      const details = `Created new user: ${newUser.username} (ID: ${newUser.id}, Role: ${newUser.role})`;
      await ActivityLogger.logUserActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.USER.CREATE,
        details
      );
      const { pin, ...userWithoutPin } = newUser;
      res.status(201).json(userWithoutPin);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await fileStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updates = { ...req.body };
      if (updates.pin === "") {
        delete updates.pin;
      }
      const updatedUser = await fileStorage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user" });
      }
      const currentUser = getCurrentUser(req);
      let details = `Updated user: ${user.username} (ID: ${user.id})`;
      if (updates.pin !== void 0) {
        details += ", PIN was changed";
      }
      if (updates.role !== void 0 && user.role !== updates.role) {
        details += `, Role changed from ${user.role} to ${updates.role}`;
      }
      if (updates.status !== void 0 && user.status !== updates.status) {
        details += `, Status changed from ${user.status} to ${updates.status}`;
      }
      await ActivityLogger.logUserActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.USER.UPDATE,
        details
      );
      const { pin, ...userWithoutPin } = updatedUser;
      res.json(userWithoutPin);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await fileStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const success = await fileStorage.deleteUser(id);
      if (success) {
        const userInfoHeader = req.headers["user-info"];
        let currentUser = { id: 0, username: "unknown" };
        if (userInfoHeader) {
          try {
            currentUser = JSON.parse(userInfoHeader);
          } catch (e) {
            console.error("Error parsing user info:", e);
          }
        }
        const details = `Deleted user: ${user.username} (ID: ${user.id}, Role: ${user.role})`;
        await ActivityLogger.logUserActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.USER.DELETE,
          details
        );
        res.status(200).json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/losses", async (req, res) => {
    try {
      const losses = await fileStorage.getLosses();
      res.json(losses);
    } catch (error) {
      console.error("Error fetching losses:", error);
      res.status(500).json({ error: "Failed to fetch losses" });
    }
  });
  app2.get("/api/losses/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const loss = await fileStorage.getLoss(id);
      if (!loss) {
        return res.status(404).json({ error: "Loss record not found" });
      }
      res.json(loss);
    } catch (error) {
      console.error("Error fetching loss:", error);
      res.status(500).json({ error: "Failed to fetch loss record" });
    }
  });
  app2.post("/api/losses", async (req, res) => {
    try {
      const requiredFields = ["inventoryItemId", "itemName", "quantity", "reason", "recordedBy", "value"];
      for (const field of requiredFields) {
        if (req.body[field] === void 0) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }
      const currentUser = getCurrentUser(req);
      const detailsMessage = `Recorded loss of ${req.body.quantity} ${req.body.itemName} | Reason: "${req.body.reason}" | Value: $${req.body.value.toFixed(2)}`;
      await ActivityLogger.logLossActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.LOSSES.CREATE,
        detailsMessage
      );
      const newLoss = await fileStorage.addLoss(req.body);
      const inventoryItem = await fileStorage.getInventoryItem(req.body.inventoryItemId);
      if (inventoryItem) {
        const newStock = Math.max(0, inventoryItem.stock - req.body.quantity);
        await fileStorage.updateInventoryItem(req.body.inventoryItemId, {
          stock: newStock
        });
        if (inventoryItem.stock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
          const stats2 = await fileStorage.getStats();
          await fileStorage.updateStats({
            lowStockItems: stats2.lowStockItems + 1
          });
        }
      }
      res.status(201).json(newLoss);
    } catch (error) {
      console.error("Error adding loss:", error);
      res.status(500).json({ error: error.message || "Failed to record loss" });
    }
  });
  app2.put("/api/losses/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      if (!id) {
        return res.status(400).json({ error: "Loss ID is required" });
      }
      const currentUser = getCurrentUser(req);
      const originalLoss = await fileStorage.getLoss(id);
      let detailsMessage = `Updated loss record with ID: ${id}`;
      if (originalLoss) {
        if (updates.quantity !== void 0 && updates.quantity !== originalLoss.quantity) {
          detailsMessage += ` | Changed quantity from ${originalLoss.quantity} to ${updates.quantity}`;
        }
        if (updates.reason !== void 0 && updates.reason !== originalLoss.reason) {
          detailsMessage += ` | Updated reason: "${updates.reason}"`;
        }
        if (updates.itemName) {
          detailsMessage += ` | Item: ${originalLoss.itemName}`;
        }
      }
      await ActivityLogger.logLossActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.LOSSES.UPDATE,
        detailsMessage
      );
      const updatedLoss = await fileStorage.updateLoss(id, updates);
      if (!updatedLoss) {
        return res.status(404).json({ error: `Loss record with ID ${id} not found` });
      }
      res.status(200).json(updatedLoss);
    } catch (error) {
      console.error("Error updating loss record:", error);
      res.status(500).json({ error: error.message || "Failed to update loss record" });
    }
  });
  app2.get("/api/alerts/low-stock", async (req, res) => {
    try {
      const items = await fileStorage.getInventory();
      const lowStockItems = items.filter((item) => {
        if (typeof item.stock === "number" && typeof item.threshold === "number") {
          return item.stock < item.threshold;
        }
        return false;
      });
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });
  app2.get("/api/settings", async (req, res) => {
    try {
      const settings = await fileStorage.getStoreSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching store settings:", error);
      res.status(500).json({ error: "Failed to fetch store settings" });
    }
  });
  app2.get("/api/settings/favicon", async (req, res) => {
    try {
      const settings = await fileStorage.getStoreSettings();
      if (settings.storeLogo) {
        const base64Data = settings.storeLogo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        res.set("Content-Type", "image/png");
        res.send(buffer);
      } else {
        res.sendFile(path5.join(__dirname4, "..", "client", "public", "favicon.ico"));
      }
    } catch (error) {
      console.error("Error serving favicon:", error);
      res.status(500).send("Error generating favicon");
    }
  });
  app2.put("/api/settings", async (req, res) => {
    try {
      const { storeName, storeAddress, storePhone, thankYouMessage } = req.body;
      if (!storeName || !storeAddress || !storePhone || !thankYouMessage) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const updatedSettings = await fileStorage.updateStoreSettings(req.body);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating store settings:", error);
      res.status(500).json({ error: "Failed to update store settings" });
    }
  });
  app2.get("/api/logs", isAdmin, async (req, res) => {
    try {
      const category = req.query.category;
      const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
      let logs;
      if (category) {
        logs = await logStorage.getLogsByCategory(category);
      } else if (userId) {
        logs = await logStorage.getLogsByUser(userId);
      } else {
        logs = await logStorage.getLogs();
      }
      logs = logs.filter((log2) => {
        if (log2.username === "system" && log2.details && log2.details.includes("System startup")) {
          return false;
        }
        if (log2.category === "authentication" || log2.category === "system") {
          return false;
        }
        return true;
      });
      res.json(logs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch logs",
        details: errorMessage
      });
    }
  });
  app2.get("/api/logs/categories", isAdmin, async (req, res) => {
    try {
      const filteredCategories = Object.values(LOG_CATEGORIES).filter(
        (category) => category !== "authentication" && category !== "system"
      );
      res.json(filteredCategories);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch log categories",
        details: errorMessage
      });
    }
  });
  app2.get("/api/logs/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid log ID format" });
      }
      const log2 = await logStorage.getLogById(id);
      if (!log2) {
        return res.status(404).json({ error: "Log not found" });
      }
      res.json(log2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch log",
        details: errorMessage,
        logId: req.params.id
      });
    }
  });
  app2.post("/api/admin/reset-csv-template", isAdmin, async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      await resetCsvTemplate();
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.BULK_IMPORT,
        "Reset CSV template to clean state"
      );
      res.json({ message: "CSV template reset to clean state successfully" });
    } catch (error) {
      console.error("Error resetting CSV template:", error);
      res.status(500).json({ error: "Failed to reset CSV template" });
    }
  });
  app2.post("/api/admin/reset-daily-stats", isAdmin, async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      await dailyStatsResetManager.manualReset();
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.UPDATE,
        "Manual daily stats reset triggered by administrator"
      );
      res.json({ message: "Daily stats reset completed successfully" });
    } catch (error) {
      console.error("Error resetting daily stats:", error);
      res.status(500).json({ error: "Failed to reset daily stats" });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const { username, pin } = req.body;
      if (!username || !pin) {
        await ActivityLogger.logAuthActivity(
          0,
          username || "unknown",
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Missing credentials"
        );
        return res.status(400).json({ error: "Username and PIN are required" });
      }
      const user = await fileStorage.getUserByUsername(username);
      if (!user || user.pin !== pin) {
        await ActivityLogger.logAuthActivity(
          0,
          username,
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Invalid credentials"
        );
        return res.status(401).json({ error: "Invalid username or PIN" });
      }
      if (user.status === "Inactive") {
        await ActivityLogger.logAuthActivity(
          user.id,
          username,
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Inactive account"
        );
        return res.status(403).json({ error: "Your account is inactive. Please contact an administrator." });
      }
      const now = /* @__PURE__ */ new Date();
      const sessionValidUntil = new Date(now);
      sessionValidUntil.setHours(sessionValidUntil.getHours() + 2);
      await fileStorage.updateUser(user.id, {
        lastActive: now.toISOString(),
        sessionValidUntil: sessionValidUntil.toISOString()
      });
      await ActivityLogger.logAuthActivity(
        user.id,
        username,
        LOG_ACTIONS.AUTHENTICATION.LOGIN,
        "User logged in successfully"
      );
      const { pin: _, ...userWithoutPin } = user;
      res.json({
        success: true,
        user: {
          ...userWithoutPin,
          sessionValidUntil: sessionValidUntil.toISOString()
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      await ActivityLogger.logSystemActivity(
        LOG_ACTIONS.SYSTEM.ERROR,
        `Error during login: ${error}`
      );
      res.status(500).json({ error: "Login failed" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs6 from "fs";
import path7 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path6 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    ...process.env.NODE_ENV !== "production" ? [
      runtimeErrorOverlay(),
      ...process.env.REPL_ID !== void 0 ? [
        await import("@replit/vite-plugin-cartographer").then(
          (m) => m.cartographer()
        )
      ] : []
    ] : []
  ],
  resolve: {
    alias: {
      "@": path6.resolve(import.meta.dirname, "src"),
      "@shared": path6.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path6.resolve(import.meta.dirname, "..", "attached_assets")
    }
  },
  root: path6.resolve(import.meta.dirname),
  build: {
    outDir: path6.resolve(import.meta.dirname, "..", "dist/public"),
    emptyOutDir: true,
    // Production optimizations
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-toast"],
          router: ["wouter"],
          utils: ["clsx", "tailwind-merge", "date-fns"]
        },
        // Optimize chunk naming for caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    // Increase chunk size warning limit for large vendor chunks
    chunkSizeWarningLimit: 1e3
  },
  // Production environment configuration
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
  },
  // Development server configuration
  server: {
    port: 5173,
    host: true,
    strictPort: false
  },
  // Preview server configuration (for production testing)
  preview: {
    port: 4173,
    host: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path7.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs6.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path7.resolve(import.meta.dirname, "public");
  if (!fs6.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path7.resolve(distPath, "index.html"));
  });
}

// server/init.ts
import fs7 from "fs";
import path8 from "path";
async function initializeAppStorage() {
  const dataDir = path8.join(process.cwd(), "server", "data");
  if (!fs7.existsSync(dataDir)) {
    fs7.mkdirSync(dataDir, { recursive: true });
  }
  const requiredFiles = {
    "users.json": { users: [
      {
        id: 1,
        username: "admin",
        pin: "1234",
        name: "Admin User",
        role: "Administrator",
        lastActive: (/* @__PURE__ */ new Date()).toISOString(),
        status: "Active"
      }
    ] },
    "inventory.json": { items: [] },
    "sales.json": { sales: [] },
    "losses.json": { losses: [] },
    "stats.json": {
      totalInventoryItems: 0,
      todaySales: 0,
      lowStockItems: 0,
      activeUsers: 1,
      totalInventoryValue: 0
    },
    "settings.json": {
      storeName: "Inventory Pro",
      storeAddress: "123 Main Street",
      storePhone: "(555) 123-4567",
      thankYouMessage: "Thank you for shopping with us!",
      nextTransactionId: 1
    },
    "popularity.json": { products: [] },
    "activity_logs.json": { logs: [] }
  };
  for (const [fileName, defaultContent] of Object.entries(requiredFiles)) {
    const filePath = path8.join(dataDir, fileName);
    if (!fs7.existsSync(filePath)) {
      fs7.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    }
  }
  return dataDir;
}

// server/index.ts
init_dailyStatsReset();
import helmet from "helmet";
var app = express3();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      // Required for development
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      // Allow data URLs for base64 encoded images and blob
      fontSrc: ["'self'", "data:"],
      // Allow data URLs for base64 encoded fonts
      connectSrc: ["'self'", "blob:"]
      // Allow blob for file uploads
    }
  },
  // Production security: hide X-Powered-By header
  hidePoweredBy: true
}));
app.use(express3.json({ limit: "10mb" }));
app.use(express3.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
    return next();
  }
  const start = Date.now();
  const path9 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path9.startsWith("/api")) {
      let logLine = `${req.method} ${path9} ${res.statusCode} in ${duration}ms`;
      if (config.nodeEnv !== "production" && capturedJsonResponse) {
        const safeResponse = { ...capturedJsonResponse };
        if (safeResponse.password) safeResponse.password = "[REDACTED]";
        if (safeResponse.token) safeResponse.token = "[REDACTED]";
        logLine += ` :: ${JSON.stringify(safeResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    await initializeAppStorage();
    await dailyStatsResetManager.start();
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = config.nodeEnv === "production" ? "Internal Server Error" : err.message || "Internal Server Error";
      log(`Error: ${err.message || "Unknown error"}`, "error");
      res.status(status).json({
        message,
        // Only include error details in development
        ...config.nodeEnv !== "production" && { details: err.stack }
      });
    });
    if (config.nodeEnv === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = config.port;
    const host = config.nodeEnv === "production" ? "localhost" : "0.0.0.0";
    server.listen(port, host, () => {
      log(`Server started and listening on ${host}:${port}`);
    });
    const shutdown = () => {
      log("Shutting down server gracefully...", "server");
      dailyStatsResetManager.stop();
      server.close(() => {
        log("Server shutdown complete", "server");
        process.exit(0);
      });
      setTimeout(() => {
        log("Server shutdown timed out, forcing exit", "server");
        process.exit(1);
      }, 1e4);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
