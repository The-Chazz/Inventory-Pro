/**
 * Product Lookup Service
 * 
 * Uses multiple APIs to search for product information by barcode
 * Includes caching and rate limiting for optimal performance
 */

interface ProductInfo {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  success: boolean;
  source?: string;
}

// Simple in-memory cache with TTL
interface CacheEntry {
  data: ProductInfo;
  timestamp: number;
  ttl: number;
}

class ProductCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  get(key: string): ProductInfo | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: ProductInfo, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Rate limiter to avoid overwhelming APIs
class RateLimiter {
  private lastCall = 0;
  private readonly minInterval = 100; // Minimum 100ms between calls

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      const delay = this.minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastCall = Date.now();
  }
}

// Global instances
const productCache = new ProductCache();
const rateLimiter = new RateLimiter();

/**
 * Search for product information using Open Food Facts API (free)
 * Enhanced to search multiple name fields and better image selection
 */
async function searchOpenFoodFacts(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      
      // Try multiple name fields for better coverage
      const name = product.product_name || 
                  product.product_name_en || 
                  product.product_name_fr || 
                  product.product_name_es || 
                  product.abbreviated_product_name ||
                  product.generic_name || 
                  product.generic_name_en;
      
      // Try multiple description fields
      const description = product.generic_name || 
                         product.generic_name_en || 
                         product.ingredients_text_en || 
                         product.ingredients_text;
      
      // Better image selection
      const imageUrl = product.image_front_url || 
                      product.image_url || 
                      product.image_front_small_url ||
                      (product.selected_images && product.selected_images.front && product.selected_images.front.display && product.selected_images.front.display.en);
      
      if (name) {
        return {
          name: name.trim(),
          description: description ? description.trim() : undefined,
          brand: product.brands,
          category: product.categories || product.categories_tags?.[0],
          imageUrl: imageUrl,
          success: true,
          source: 'Open Food Facts'
        };
      }
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using UPC Database API (free)
 */
async function searchUPCDatabase(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    const data = await response.json();
    
    if (data.code === 'OK' && data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        name: item.title,
        description: item.description,
        brand: item.brand,
        category: item.category,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
        success: true,
        source: 'UPC Database'
      };
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using Barcode Spider API (free)
 */
async function searchBarcodeSpider(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const response = await fetch(`https://api.barcodespider.com/v1/lookup?token=free&upc=${barcode}`);
    const data = await response.json();
    
    if (data.item_response && data.item_response.message === 'success') {
      const item = data.item_response.item_attributes;
      return {
        name: item.title,
        description: item.description,
        brand: item.brand,
        category: item.category,
        imageUrl: item.image,
        success: true,
        source: 'Barcode Spider'
      };
    }
  } catch (error) {
    // Continue to next method
  }
  
  return { success: false };
}

/**
 * Search for product information using Barcode Lookup API (free)
 */
async function searchBarcodeLookup(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const response = await fetch(`https://www.barcodelookup.com/${barcode}`);
    const text = await response.text();
    
    // Parse HTML to extract product information
    const nameMatch = text.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const imageMatch = text.match(/<meta property="og:image" content="([^"]+)"/i);
    const descMatch = text.match(/<meta property="og:description" content="([^"]+)"/i);
    
    if (nameMatch && nameMatch[1]) {
      return {
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : undefined,
        imageUrl: imageMatch ? imageMatch[1].trim() : undefined,
        success: true,
        source: 'Barcode Lookup'
      };
    }
  } catch (error) {
    // Continue to next method
  }
  
  return { success: false };
}

/**
 * Search for product information using Google Product Search API
 * Note: Requires Google Custom Search API key and Search Engine ID
 */
async function searchGoogleProducts(barcode: string): Promise<ProductInfo> {
  try {
    // For now, this is a placeholder implementation
    // To use this, you would need to:
    // 1. Get a Google Custom Search API key from Google Cloud Console
    // 2. Create a Custom Search Engine focused on product catalogs
    // 3. Set environment variables: GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID
    
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      // Return unsuccessful if not configured
      return { success: false };
    }
    
    const query = `product barcode ${barcode}`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
    
    await rateLimiter.throttle();
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        name: item.title,
        description: item.snippet,
        imageUrl: item.pagemap?.cse_image?.[0]?.src,
        success: true,
        source: 'Google Product Search'
      };
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using Amazon Product API
 * Note: Requires Amazon Product Advertising API credentials
 */
async function searchAmazonProducts(barcode: string): Promise<ProductInfo> {
  try {
    // For now, this is a placeholder implementation
    // To use this, you would need to:
    // 1. Register for Amazon Associates program
    // 2. Get Product Advertising API credentials
    // 3. Set environment variables: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG
    
    const accessKey = process.env.AMAZON_ACCESS_KEY;
    const secretKey = process.env.AMAZON_SECRET_KEY;
    const associateTag = process.env.AMAZON_ASSOCIATE_TAG;
    
    if (!accessKey || !secretKey || !associateTag) {
      // Return unsuccessful if not configured
      return { success: false };
    }
    
    // Amazon Product API requires complex signature authentication
    // This would need a proper implementation with AWS signature v4
    // For now, we'll try a simple search approach (which may not work without proper auth)
    
    await rateLimiter.throttle();
    // This is a simplified placeholder - real implementation would require proper AWS signing
    return { success: false };
    
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}
/**
 * Search for product information using EAN Search API (free)
 */
async function searchEANSearch(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const response = await fetch(`https://www.ean-search.org/api?op=barcode-lookup&format=json&ean=${barcode}`);
    const data = await response.json();
    
    if (data && data.length > 0 && data[0].name) {
      const product = data[0];
      return {
        name: product.name,
        description: product.description,
        category: product.categoryText,
        imageUrl: product.image,
        success: true,
        source: 'EAN Search'
      };
    }
  } catch (error) {
    // Continue to next method
  }
  
  return { success: false };
}

/**
 * Main function to lookup product information by barcode
 * Includes caching, rate limiting, and expanded API sources
 */
export async function lookupProductByBarcode(barcode: string): Promise<ProductInfo> {
  // Clean the barcode (remove any non-numeric characters)
  const cleanBarcode = barcode.replace(/\D/g, '');
  
  if (!cleanBarcode || cleanBarcode.length < 8) {
    return { success: false };
  }
  
  // Check cache first
  const cacheKey = `barcode_${cleanBarcode}`;
  const cached = productCache.get(cacheKey);
  if (cached) {
    return { ...cached, source: `${cached.source} (cached)` };
  }
  
  // Try different barcode formats if original doesn't work
  const barcodeVariants = [
    cleanBarcode,
    // Add leading zeros for UPC-A format (12 digits)
    cleanBarcode.length === 11 ? '0' + cleanBarcode : null,
    // Try without leading zeros for EAN-13 format
    cleanBarcode.startsWith('0') && cleanBarcode.length === 13 ? cleanBarcode.substring(1) : null,
    // Try both with and without check digit
    cleanBarcode.length > 8 ? cleanBarcode.substring(0, cleanBarcode.length - 1) : null
  ].filter(Boolean) as string[];
  
  // Try each API in priority order (most reliable first)
  const apis = [
    searchOpenFoodFacts,      // Most comprehensive for food products
    searchUPCDatabase,        // Good general product database
    searchGoogleProducts,     // Configurable with API key
    searchAmazonProducts,     // Configurable with API credentials
    searchEANSearch,          // Good for European products
    searchBarcodeSpider,      // Additional source
    searchBarcodeLookup       // Web scraping fallback
  ];
  
  // Try each barcode variant with each API for maximum coverage
  for (const barcodeVariant of barcodeVariants) {
    for (const api of apis) {
      try {
        const result = await api(barcodeVariant);
        if (result.success) {
          // Cache successful results
          productCache.set(cacheKey, result);
          return result;
        }
      } catch (error) {
        // Continue to next API/variant combination
        console.warn(`API ${api.name} failed for barcode ${barcodeVariant}:`, error);
        continue;
      }
    }
  }
  
  // Cache unsuccessful results for a shorter time to avoid repeated failed lookups
  const failedResult = { success: false };
  productCache.set(cacheKey, failedResult, 60 * 60 * 1000); // 1 hour TTL for failures
  
  return failedResult;
}