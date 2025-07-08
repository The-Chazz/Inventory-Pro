import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  pin: z.string(),
  name: z.string(),
  userRole: z.string(),
  lastActive: z.string().optional(),
  status: z.string(),
  sessionValidUntil: z.string().optional(),
});

// Activity log schema
export const activityLogSchema = z.object({
  id: z.number(),
  userId: z.number(),
  username: z.string(),
  action: z.string(),
  category: z.string(), // 'user', 'inventory', 'sales', 'settings', etc.
  details: z.string().optional(),
  timestamp: z.date().or(z.string()),
});

// Insert schemas (used for validation when creating new entities)
export const insertUserSchema = userSchema.omit({ 
  id: true,
  lastActive: true,
  sessionValidUntil: true
});

export const insertLogSchema = activityLogSchema.omit({
  id: true,
  timestamp: true
});

export const pinSchema = z.string().length(4).regex(/^\d{4}$/, "PIN must be 4 digits");

// Type exports
export type User = z.infer<typeof userSchema>;
export type ActivityLog = z.infer<typeof activityLogSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLog = z.infer<typeof insertLogSchema>;
