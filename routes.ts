import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { fileStorage } from "./fileStorage";
import { logStorage } from "./logStorage";
import { ActivityLogger, LOG_ACTIONS, LOG_CATEGORIES } from "./logger";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  inventoryImageUpload,
  logoImageUpload,
  csvUpload,
  processCsvFile,
  saveBase64Image,
  getImageUrl,
  deleteImage
} from "./fileUpload";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getCurrentUser = (req: Request) => {
  try {
    const userInfoHeader = req.headers['user-info'];
    if (userInfoHeader && typeof userInfoHeader === 'string') {
      try {
        const userData = JSON.parse(userInfoHeader);
        if (userData && typeof userData === 'object' && 'id' in userData && 'username' in userData && 'user' in userData) {
          if (!['Administrator', 'Manager', 'Cashier', 'Stocker', 'system'].includes(userData.user.role)) {
            console.warn(`Invalid user role detected: ${userData.user.role}, defaulting to Cashier`);
            userData.user.role = 'Cashier';
          }
          return userData;
        }
      } catch (parseError) {
        console.error("Error parsing user info from header:", parseError);
      }
    }
    return { id: 0, username: "system", user: { role: "system" } };
  } catch (error) {
    console.error("Error processing user information:", error);
    return { id: 0, username: "system", user: { role: "system" } };
  }
};

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const currentUser = getCurrentUser(req);
  if (!currentUser || typeof currentUser.id !== 'number' || currentUser.id === 0) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource"
    });
  }
  if (currentUser.user.role !== 'Administrator') {
    console.warn(`Unauthorized admin access attempt by ${currentUser.username} (ID: ${currentUser.id}, Role: ${currentUser.user.role})`);
    return res.status(403).json({
      error: "Access denied",
      message: "Administrator permissions required for this operation"
    });
  }
  next();
};

const isAdminOrManager = (req: Request, res: Response, next: NextFunction) => {
  const currentUser = getCurrentUser(req);
  if (!currentUser || typeof currentUser.id !== 'number' || currentUser.id === 0) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource"
    });
  }
  if (currentUser.user.role !== 'Administrator' && currentUser.user.role !== 'Manager') {
    console.warn(`Unauthorized management access attempt by ${currentUser.username} (ID: ${currentUser.id}, Role: ${currentUser.user.role})`);
    return res.status(403).json({
      error: "Access denied",
      message: "Administrator or Manager permissions required for this operation"
    });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Static file serving with security check
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.includes('..')) {
      return res.status(403).send('Forbidden');
    }
    next();
  }, express.static(path.join(__dirname, 'uploads')));

  // Dashboard stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await fileStorage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", async (req: Request, res: Response) => {
    try {
      const items = await fileStorage.getInventory();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/inventory/popular", async (req: Request, res: Response) => {
    try {
      const items = await fileStorage.getInventoryByPopularity();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory by popularity:", error);
      res.status(500).json({ error: "Failed to fetch inventory by popularity" });
    }
  });

  app.get("/api/inventory/:id", async (req: Request, res: Response) => {
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

  app.post("/api/inventory", async (req: Request, res: Response) => {
    try {
      const requiredFields = ['name', 'sku', 'category', 'stock', 'unit', 'price', 'priceUnit', 'threshold'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }

      const newItem = await fileStorage.addInventoryItem(req.body);
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
      console.error("Error adding inventory item:", error);
      res.status(500).json({ error: "Failed to add inventory item" });
    }
  });

  app.put("/api/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const originalItem = await fileStorage.getInventoryItem(id);
      if (!originalItem) {
        return res.status(404).json({ error: "Item not found" });
      }

      const currentUser = getCurrentUser(req);
      console.log("Inventory update attempted by:", currentUser);

      // Check profit update permissions
      const hasProfitUpdates = req.body.costPrice !== undefined || 
                              req.body.profitMargin !== undefined || 
                              req.body.profitType !== undefined;
      
      if (hasProfitUpdates && !["Administrator", "Manager"].includes(currentUser.user.role)) {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.UPDATE,
          `Unauthorized profit update attempt for item ID: ${id}`
        );
        return res.status(403).json({
          error: "Access denied: You don't have permission to update profit settings"
        });
      }

      // Check price update permissions
      const hasPriceUpdate = req.body.price !== undefined;
      if (hasPriceUpdate && currentUser.user.role === "Stocker") {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.UPDATE,
          `Unauthorized price update attempt for item ID: ${id}`
        );
        return res.status(403).json({
          error: "Access denied: Stocker accounts cannot modify prices"
        });
      }

      const updatedItem = await fileStorage.updateInventoryItem(id, req.body);
      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update item" });
      }

      // Log changes
      let details = `Updated item: ${originalItem.name} (ID: ${originalItem.id})`;
      if (req.body.stock !== undefined && originalItem.stock !== req.body.stock) {
        details += `, Stock changed from ${originalItem.stock} to ${req.body.stock}`;
      }
      if (req.body.price !== undefined && originalItem.price !== req.body.price) {
        details += `, Price changed from ${originalItem.price} to ${req.body.price}`;
      }
      if (req.body.threshold !== undefined && originalItem.threshold !== req.body.threshold) {
        details += `, Threshold changed from ${originalItem.threshold} to ${req.body.threshold}`;
      }
      if (req.body.costPrice !== undefined) {
        const oldCost = originalItem.costPrice || "not set";
        details += `, Cost price changed from ${oldCost} to ${req.body.costPrice}`;
      }
      if (req.body.profitMargin !== undefined) {
        const oldMargin = originalItem.profitMargin || "not set";
        details += `, Profit margin changed from ${oldMargin} to ${req.body.profitMargin}`;
      }
      if (req.body.profitType !== undefined && originalItem.profitType !== req.body.profitType) {
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

  app.delete("/api/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = getCurrentUser(req);

      if (currentUser.user.role === "Stocker") {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.DELETE,
          `Unauthorized deletion attempt for item ID: ${id}`
        );
        return res.status(403).json({
          error: "Access denied: You don't have permission to delete inventory items"
        });
      }

      const item = await fileStorage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const success = await fileStorage.deleteInventoryItem(id);
      if (!success) {
        return res.status(404).json({ error: "Failed to delete item" });
      }

      console.log("Inventory delete performed by:", currentUser);
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

  // CSV Upload
  app.post("/api/inventory/csv-upload", csvUpload.single('file'), async (req: Request, res: Response) => {
    try {
      console.log("CSV upload request received");
      if (!req.file) {
        console.log("No CSV file received in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("CSV file received:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      });

      const csvItems = await processCsvFile(req.file.path);
      const normalizedItems = csvItems.map((item: any, index) => {
        const normalizedItem: any = {};
        Object.keys(item).forEach(key => {
          const lowercaseKey = key.toLowerCase().trim();
          if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
            normalizedItem[lowercaseKey] = item[key];
          }
        });

        if (!normalizedItem.priceunit && (normalizedItem['price unit'] || normalizedItem.price_unit || normalizedItem['unit price'])) {
          normalizedItem.priceunit = normalizedItem['price unit'] || normalizedItem.price_unit || normalizedItem['unit price'];
        }

        console.log(`Item ${index + 1} normalized fields:`, Object.keys(normalizedItem));
        return normalizedItem;
      });

      console.log(`Successfully processed ${normalizedItems.length} items from CSV`);
      res.json({
        success: true,
        items: normalizedItems,
        message: `Successfully parsed ${normalizedItems.length} items from CSV`
      });
    } catch (error: any) {
      console.error("Error processing CSV file:", error);
      res.status(500).json({
        error: "Failed to process CSV file",
        message: error.message
      });
    }
  });

  // Image Upload
  app.post("/api/inventory/image-upload", inventoryImageUpload.single('image'), async (req: Request, res: Response) => {
    try {
      console.log("Inventory image upload request received");
      if (!req.file) {
        console.log("No file received in request");
        return res.status(400).json({ error: "No image uploaded" });
      }

      console.log("File received:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      });

      const imageUrl = `/uploads/inventory/${req.file.filename}`;
      console.log("Generated image URL:", imageUrl);

      res.json({
        success: true,
        imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (error: any) {
      console.error("Error uploading inventory image:", error);
      res.status(500).json({
        error: "Failed to upload image",
        message: error.message
      });
    }
  });

  // Logo Upload
  app.post("/api/settings/logo-upload", logoImageUpload.single('logo'), async (req: Request, res: Response) => {
    try {
      console.log("Store logo upload request received");
      if (!req.file) {
        console.log("No logo file received in request");
        return res.status(400).json({ error: "No logo image uploaded" });
      }

      console.log("Logo file received:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      });

      const logoUrl = `/uploads/logos/${req.file.filename}`;
      console.log("Generated logo URL:", logoUrl);

      const storeSettings = await fileStorage.getStoreSettings();
      console.log("Current store settings:", storeSettings);

      await fileStorage.updateStoreSettings({
        ...storeSettings,
        storeLogo: logoUrl
      });
      console.log("Updated store settings with new logo");

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
    } catch (error: any) {
      console.error("Error uploading store logo:", error);
      res.status(500).json({
        error: "Failed to upload store logo",
        message: error.message
      });
    }
  });

  // Bulk Import
  app.post("/api/inventory/bulk", async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Invalid or empty items array" });
      }

      const results: { updated: number; created: number; failed: number; errors: string[]; } = {
        updated: 0,
        created: 0,
        failed: 0,
        errors: []
      };

      const inventoryItems = await fileStorage.getInventory();

      for (const item of items) {
        try {
          const requiredFields = ['sku', 'name', 'category', 'stock', 'unit', 'price', 'priceUnit', 'threshold'];
          const missingFields = requiredFields.filter(field => item[field] === undefined);

          if (missingFields.length > 0) {
            results.failed++;
            results.errors.push(`Item with SKU ${item.sku || 'unknown'}: Missing required fields: ${missingFields.join(', ')}`);
            continue;
          }

          const existingItem = inventoryItems.find(i => i.sku === item.sku);
          
          if (existingItem) {
            const updatedItem = await fileStorage.updateInventoryItem(existingItem.id, {
              ...item,
              status: item.stock < item.threshold ? 'Low Stock' : 'In Stock'
            });
            
            if (updatedItem) {
              results.updated++;
            } else {
              results.failed++;
              results.errors.push(`Failed to update item with SKU: ${item.sku}`);
            }
          } else {
            const newItem = await fileStorage.addInventoryItem({
              ...item,
              status: item.stock < item.threshold ? 'Low Stock' : 'In Stock'
            });
            
            if (newItem) {
              results.created++;
            } else {
              results.failed++;
              results.errors.push(`Failed to create item with SKU: ${item.sku}`);
            }
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Error processing item with SKU ${item.sku || 'unknown'}: ${error.message || 'Unknown error'}`);
        }
      }

      const currentUser = getCurrentUser(req);
      const details = `Bulk import: ${results.created} created, ${results.updated} updated, ${results.failed} failed`;
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

  // Sales routes
  app.get("/api/sales", async (req: Request, res: Response) => {
    try {
      const sales = await fileStorage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Failed to fetch sales data" });
    }
  });

  app.get("/api/sales/:id", async (req: Request, res: Response) => {
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

  app.post("/api/sales/:id/refund", async (req: Request, res: Response) => {
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

  app.post("/api/sales", async (req: Request, res: Response) => {
    try {
      if (!req.body.cashier || !req.body.amount || !req.body.items || !Array.isArray(req.body.items)) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newSale = await fileStorage.addSale(req.body);
      const stats = await fileStorage.getStats();
      
      await fileStorage.updateStats({
        todaySales: stats.todaySales + req.body.amount
      });

      // Update inventory
      for (const item of req.body.items) {
        const inventoryItem = await fileStorage.getInventoryItem(item.productId);
        if (inventoryItem) {
          const newStock = Math.max(0, inventoryItem.stock - item.quantity);
          await fileStorage.updateInventoryItem(item.productId, { stock: newStock });
          
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
          currentUser = JSON.parse(userInfoHeader as string);
        } catch (e) {
          console.error("Error parsing user info:", e);
        }
      }

      let totalItems = 0;
      newSale.items.forEach(item => {
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

  // User management routes
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const users = await fileStorage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
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

  app.put("/api/users/:id", async (req: Request, res: Response) => {
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
      console.log("User update performed by:", currentUser);

      let details = `Updated user: ${user.username} (ID: ${user.id})`;
      if (updates.pin !== undefined) {
        details += ", PIN was changed";
      }
      if (updates.user?.role !== undefined && user.user.role !== updates.user.role) {
        details += `, Role changed from ${user.user.role} to ${updates.user.role}`;
      }
      if (updates.status !== undefined && user.status !== updates.status) {
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

  app.delete("/api/users/:id", async (req: Request, res: Response) => {
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
            currentUser = JSON.parse(userInfoHeader as string);
          } catch (e) {
            console.error("Error parsing user info:", e);
          }
        }

        const details = `Deleted user: ${user.username} (ID: ${user.id}, Role: ${user.user.role})`;
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

  // Loss tracking routes
  app.get("/api/losses", async (req: Request, res: Response) => {
    try {
      const losses = await fileStorage.getLosses();
      res.json(losses);
    } catch (error) {
      console.error("Error fetching losses:", error);
      res.status(500).json({ error: "Failed to fetch losses" });
    }
  });

  app.get("/api/losses/:id", async (req: Request, res: Response) => {
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

  app.post("/api/losses", async (req: Request, res: Response) => {
    try {
      const requiredFields = ['inventoryItemId', 'itemName', 'quantity', 'reason', 'recordedBy', 'value'];
      for (const field of requiredFields) {
        if (req.body[field] === undefined) {
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

      // Update inventory
      const inventoryItem = await fileStorage.getInventoryItem(req.body.inventoryItemId);
      if (inventoryItem) {
        const newStock = Math.max(0, inventoryItem.stock - req.body.quantity);
        await fileStorage.updateInventoryItem(req.body.inventoryItemId, { stock: newStock });
        
        if (inventoryItem.stock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
          const stats = await fileStorage.getStats();
          await fileStorage.updateStats({
            lowStockItems: stats.lowStockItems + 1
          });
        }
      }

      res.status(201).json(newLoss);
    } catch (error: any) {
      console.error("Error adding loss:", error);
      res.status(500).json({ error: error.message || "Failed to record loss" });
    }
  });

  app.put("/api/losses/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Loss ID is required' });
      }

      const currentUser = getCurrentUser(req);
      const originalLoss = await fileStorage.getLoss(id);
      
      let detailsMessage = `Updated loss record with ID: ${id}`;
      if (originalLoss) {
	if (updates.quantity !== undefined && updates.quantity !== originalLoss.quantity) {
          detailsMessage += ` | Changed quantity from ${originalLoss.quantity} to ${updates.quantity}`;
        }
        if (updates.reason !== undefined && updates.reason !== originalLoss.reason) {
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
    } catch (error: any) {
      console.error("Error updating loss record:", error);
      res.status(500).json({ 
        error: error.message || "Failed to update loss record" 
      });
    }
  });

  // Get low stock alerts
  app.get("/api/alerts/low-stock", async (req: Request, res: Response) => {
    try {
      const items = await fileStorage.getInventory();
      const lowStockItems = items.filter(item => {
        if (typeof item.stock === 'number' && typeof item.threshold === 'number') {
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

  // Get store settings
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await fileStorage.getStoreSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching store settings:", error);
      res.status(500).json({ error: "Failed to fetch store settings" });
    }
  });

  // Update store settings
  app.put("/api/settings", async (req: Request, res: Response) => {
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

  // Get logs (admin only)
  app.get("/api/logs", isAdmin, async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      let logs;
      if (category) {
        logs = await logStorage.getLogsByCategory(category);
      } else if (userId) {
        logs = await logStorage.getLogsByUser(userId);
      } else {
        logs = await logStorage.getLogs();
      }
      
      // Filter out system startup and authentication logs
      logs = logs.filter(log => {
        if (log.username === "system" && log.details && log.details.includes("System startup")) {
          return false;
        }
        if (log.category === "authentication" || log.category === "system") {
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

  // Get log categories (admin only)
  app.get("/api/logs/categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const filteredCategories = Object.values(LOG_CATEGORIES).filter(
        category => category !== 'authentication' && category !== 'system'
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

  // Get specific log by ID (admin only)
  app.get("/api/logs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid log ID format" });
      }
      
      const log = await logStorage.getLogById(id);
      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }
      
      res.json(log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to fetch log", 
        details: errorMessage,
        logId: req.params.id 
      });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
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
      
      if (user.status === 'Inactive') {
        await ActivityLogger.logAuthActivity(
          user.id,
          username,
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Inactive account"
        );
        return res.status(403).json({ 
          error: "Your account is inactive. Please contact an administrator." 
        });
      }
      
      const now = new Date();
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

  // Create HTTP server and return it
  const httpServer = createServer(app);
  return httpServer;
}