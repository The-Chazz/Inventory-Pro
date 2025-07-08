/**
 * Inventory Pro Initialization
 * 
 * This file handles initializing the application's file storage system.
 * It creates necessary directories and default data files if they don't exist.
 */
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

/**
 * Initialize the application storage
 * This function ensures all necessary directories and data files exist.
 */
export async function initializeAppStorage() {
  console.log('Initializing file storage system...');
  
  // Define data directory path
  const dataDir = path.join(process.cwd(), 'server', 'data');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    console.log(`Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Create uploads directory structure
  const uploadsDir = path.join(process.cwd(), 'dist', 'uploads');
  const uploadSubdirs = ['inventory', 'logos', 'csv'];
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  for (const subdir of uploadSubdirs) {
    const subdirPath = path.join(uploadsDir, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }
  
  // List of required data files with default content
  const requiredFiles = {
    'users.json': { users: [
      {
        id: 1,
        username: 'admin',
        pin: '1234',
        name: 'Admin User',
        userRole: 'Administrator',
        lastActive: new Date().toISOString(),
        status: 'Active'
      }
    ]},
    'inventory.json': { items: [] },
    'sales.json': { sales: [] },
    'losses.json': { losses: [] },
    'stats.json': { 
      totalInventoryItems: 0,
      todaySales: 0,
      lowStockItems: 0,
      activeUsers: 1,
      totalInventoryValue: 0
    },
    'settings.json': { 
      storeName: 'Inventory Pro',
      storeAddress: '123 Main Street',
      storePhone: '(555) 123-4567',
      thankYouMessage: 'Thank you for shopping with us!',
      nextTransactionId: 1
    },
    'popularity.json': { products: [] },
    'activity_logs.json': { logs: [] }
  };
  
  // Create each required file if it doesn't exist
  for (const [fileName, defaultContent] of Object.entries(requiredFiles)) {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`Creating file: ${fileName}`);
      fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    } else {
      console.log(`File exists: ${filePath}`);
    }
  }
  
  console.log(`Using data directory: ${dataDir}`);
  return dataDir;
}
