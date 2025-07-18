/**
 * File Storage Configuration
 * 
 * This module replaces the original database connection code with file storage only.
 * The application now exclusively uses local JSON files for data persistence.
 */
import { config } from "./config";

// Always use file storage
export const usingFileStorageOnly = true;

// Initialize the application
export async function seedDatabase() {
  // No database operations to perform
  return;
}