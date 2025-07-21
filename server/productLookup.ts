/**
 * Product Lookup Service
 * 
 * Uses free APIs to search for product information by barcode
 * Focus on Open Food Facts (no key required) and UPC Database (free tier)
 * Includes caching, rate limiting, error handling and logging
 */

import { z } from "zod";

// Zod schemas for API response validation
export const ProductInfoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  success: z.boolean(),
  source: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const OpenFoodFactsProductSchema = z.object({
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
    ingredients_text_en: z.string().optional(),
  }).partial().optional(),
}).partial();

export const UPCDatabaseResponseSchema = z.object({
  code: z.string(),
  items: z.array(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    images: z.array(z.string().url()).optional(),
  }).partial()).optional(),
}).partial();

export type ProductInfo = z.infer<typeof ProductInfoSchema>;
export type OpenFoodFactsProduct = z.infer<typeof OpenFoodFactsProductSchema>;
export type UPCDatabaseResponse = z.infer<typeof UPCDatabaseResponseSchema>;

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

// Enhanced rate limiter with per-API limits
class RateLimiter {
  private lastCalls = new Map<string, number>();
  private readonly defaultMinInterval = 100; // 100ms general rate limit
  private readonly upcDatabaseInterval = 1000; // 1 second for UPC Database free tier
  private readonly openFoodFactsInterval = 200; // 200ms for Open Food Facts to be respectful

  async throttle(apiName: string = 'default'): Promise<void> {
    const now = Date.now();
    const lastCall = this.lastCalls.get(apiName) || 0;
    
    const minInterval = this.getMinInterval(apiName);
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall < minInterval) {
      const delay = minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastCalls.set(apiName, Date.now());
  }
  
  private getMinInterval(apiName: string): number {
    switch (apiName) {
      case 'upcDatabase':
        return this.upcDatabaseInterval;
      case 'openFoodFacts':
        return this.openFoodFactsInterval;
      default:
        return this.defaultMinInterval;
    }
  }
}

// Enhanced logging for barcode lookup operations
class BarcodeLogger {
  private static instance: BarcodeLogger;
  
  static getInstance(): BarcodeLogger {
    if (!BarcodeLogger.instance) {
      BarcodeLogger.instance = new BarcodeLogger();
    }
    return BarcodeLogger.instance;
  }
  
  logAttempt(barcode: string, apiName: string): void {
    console.log(`[ProductLookup] Attempting ${apiName} for barcode: ${barcode}`);
  }
  
  logSuccess(barcode: string, apiName: string, productName?: string): void {
    console.log(`[ProductLookup] SUCCESS ${apiName} for barcode ${barcode}: ${productName || 'Found product'}`);
  }
  
  logError(barcode: string, apiName: string, error: any): void {
    console.warn(`[ProductLookup] ERROR ${apiName} for barcode ${barcode}:`, error.message || error);
  }
  
  logCacheHit(barcode: string): void {
    console.log(`[ProductLookup] Cache HIT for barcode: ${barcode}`);
  }
  
  logCacheMiss(barcode: string): void {
    console.log(`[ProductLookup] Cache MISS for barcode: ${barcode}`);
  }
}

// Global instances
const productCache = new ProductCache();
const rateLimiter = new RateLimiter();
const logger = BarcodeLogger.getInstance();

/**
 * Detect region based on barcode prefix
 * Different regions use different barcode number ranges
 */
function detectRegion(barcode: string): string {
  const prefix = barcode.substring(0, 3);
  const numPrefix = parseInt(prefix);
  
  // GS1 country codes (simplified)
  if (numPrefix >= 0 && numPrefix <= 19) return 'US_CANADA';
  if (numPrefix >= 20 && numPrefix <= 29) return 'RESTRICTED';
  if (numPrefix >= 30 && numPrefix <= 39) return 'US_DRUGS';
  if (numPrefix >= 40 && numPrefix <= 49) return 'RESTRICTED';
  if (numPrefix >= 50 && numPrefix <= 59) return 'COUPONS';
  if (numPrefix >= 60 && numPrefix <= 99) return 'US_CANADA';
  if (numPrefix >= 100 && numPrefix <= 139) return 'US_CANADA';
  if (numPrefix >= 200 && numPrefix <= 299) return 'RESTRICTED';
  if (numPrefix >= 300 && numPrefix <= 379) return 'FRANCE';
  if (numPrefix >= 380 && numPrefix <= 380) return 'BULGARIA';
  if (numPrefix >= 383 && numPrefix <= 383) return 'SLOVENIA';
  if (numPrefix >= 385 && numPrefix <= 385) return 'CROATIA';
  if (numPrefix >= 387 && numPrefix <= 387) return 'BOSNIA_HERZEGOVINA';
  if (numPrefix >= 400 && numPrefix <= 440) return 'GERMANY';
  if (numPrefix >= 450 && numPrefix <= 459) return 'JAPAN';
  if (numPrefix >= 460 && numPrefix <= 469) return 'RUSSIA';
  if (numPrefix >= 470 && numPrefix <= 470) return 'KYRGYZSTAN';
  if (numPrefix >= 471 && numPrefix <= 471) return 'TAIWAN';
  if (numPrefix >= 474 && numPrefix <= 474) return 'ESTONIA';
  if (numPrefix >= 475 && numPrefix <= 475) return 'LATVIA';
  if (numPrefix >= 476 && numPrefix <= 476) return 'AZERBAIJAN';
  if (numPrefix >= 477 && numPrefix <= 477) return 'LITHUANIA';
  if (numPrefix >= 478 && numPrefix <= 478) return 'UZBEKISTAN';
  if (numPrefix >= 479 && numPrefix <= 479) return 'SRI_LANKA';
  if (numPrefix >= 480 && numPrefix <= 480) return 'PHILIPPINES';
  if (numPrefix >= 481 && numPrefix <= 481) return 'BELARUS';
  if (numPrefix >= 482 && numPrefix <= 482) return 'UKRAINE';
  if (numPrefix >= 484 && numPrefix <= 484) return 'MOLDOVA';
  if (numPrefix >= 485 && numPrefix <= 485) return 'ARMENIA';
  if (numPrefix >= 486 && numPrefix <= 486) return 'GEORGIA';
  if (numPrefix >= 487 && numPrefix <= 487) return 'KAZAKHSTAN';
  if (numPrefix >= 488 && numPrefix <= 488) return 'TAJIKISTAN';
  if (numPrefix >= 489 && numPrefix <= 489) return 'HONG_KONG';
  if (numPrefix >= 490 && numPrefix <= 499) return 'JAPAN';
  if (numPrefix >= 500 && numPrefix <= 509) return 'UK';
  if (numPrefix >= 520 && numPrefix <= 521) return 'GREECE';
  if (numPrefix >= 528 && numPrefix <= 528) return 'LEBANON';
  if (numPrefix >= 529 && numPrefix <= 529) return 'CYPRUS';
  if (numPrefix >= 530 && numPrefix <= 530) return 'ALBANIA';
  if (numPrefix >= 531 && numPrefix <= 531) return 'MACEDONIA';
  if (numPrefix >= 535 && numPrefix <= 535) return 'MALTA';
  if (numPrefix >= 539 && numPrefix <= 539) return 'IRELAND';
  if (numPrefix >= 540 && numPrefix <= 549) return 'BELGIUM_LUXEMBOURG';
  if (numPrefix >= 560 && numPrefix <= 560) return 'PORTUGAL';
  if (numPrefix >= 569 && numPrefix <= 569) return 'ICELAND';
  if (numPrefix >= 570 && numPrefix <= 579) return 'DENMARK';
  if (numPrefix >= 590 && numPrefix <= 590) return 'POLAND';
  if (numPrefix >= 594 && numPrefix <= 594) return 'ROMANIA';
  if (numPrefix >= 599 && numPrefix <= 599) return 'HUNGARY';
  if (numPrefix >= 600 && numPrefix <= 601) return 'SOUTH_AFRICA';
  if (numPrefix >= 603 && numPrefix <= 603) return 'GHANA';
  if (numPrefix >= 604 && numPrefix <= 604) return 'SENEGAL';
  if (numPrefix >= 608 && numPrefix <= 608) return 'BAHRAIN';
  if (numPrefix >= 609 && numPrefix <= 609) return 'MAURITIUS';
  if (numPrefix >= 611 && numPrefix <= 611) return 'MOROCCO';
  if (numPrefix >= 613 && numPrefix <= 613) return 'ALGERIA';
  if (numPrefix >= 615 && numPrefix <= 615) return 'NIGERIA';
  if (numPrefix >= 616 && numPrefix <= 616) return 'KENYA';
  if (numPrefix >= 617 && numPrefix <= 617) return 'CAMEROON';
  if (numPrefix >= 618 && numPrefix <= 618) return 'IVORY_COAST';
  if (numPrefix >= 619 && numPrefix <= 619) return 'TUNISIA';
  if (numPrefix >= 620 && numPrefix <= 620) return 'TANZANIA';
  if (numPrefix >= 621 && numPrefix <= 621) return 'SYRIA';
  if (numPrefix >= 622 && numPrefix <= 622) return 'EGYPT';
  if (numPrefix >= 623 && numPrefix <= 623) return 'BRUNEI';
  if (numPrefix >= 624 && numPrefix <= 624) return 'LIBYA';
  if (numPrefix >= 625 && numPrefix <= 625) return 'JORDAN';
  if (numPrefix >= 626 && numPrefix <= 626) return 'IRAN';
  if (numPrefix >= 627 && numPrefix <= 627) return 'KUWAIT';
  if (numPrefix >= 628 && numPrefix <= 628) return 'SAUDI_ARABIA';
  if (numPrefix >= 629 && numPrefix <= 629) return 'UAE';
  if (numPrefix >= 640 && numPrefix <= 649) return 'FINLAND';
  if (numPrefix >= 690 && numPrefix <= 695) return 'CHINA';
  if (numPrefix >= 700 && numPrefix <= 709) return 'NORWAY';
  if (numPrefix >= 729 && numPrefix <= 729) return 'ISRAEL';
  if (numPrefix >= 730 && numPrefix <= 739) return 'SWEDEN';
  if (numPrefix >= 740 && numPrefix <= 740) return 'GUATEMALA';
  if (numPrefix >= 741 && numPrefix <= 741) return 'EL_SALVADOR';
  if (numPrefix >= 742 && numPrefix <= 742) return 'HONDURAS';
  if (numPrefix >= 743 && numPrefix <= 743) return 'NICARAGUA';
  if (numPrefix >= 744 && numPrefix <= 744) return 'COSTA_RICA';
  if (numPrefix >= 745 && numPrefix <= 745) return 'PANAMA';
  if (numPrefix >= 746 && numPrefix <= 746) return 'DOMINICAN_REPUBLIC';
  if (numPrefix >= 750 && numPrefix <= 750) return 'MEXICO';
  if (numPrefix >= 754 && numPrefix <= 755) return 'CANADA';
  if (numPrefix >= 759 && numPrefix <= 759) return 'VENEZUELA';
  if (numPrefix >= 760 && numPrefix <= 769) return 'SWITZERLAND';
  if (numPrefix >= 770 && numPrefix <= 771) return 'COLOMBIA';
  if (numPrefix >= 773 && numPrefix <= 773) return 'URUGUAY';
  if (numPrefix >= 775 && numPrefix <= 775) return 'PERU';
  if (numPrefix >= 777 && numPrefix <= 777) return 'BOLIVIA';
  if (numPrefix >= 778 && numPrefix <= 779) return 'ARGENTINA';
  if (numPrefix >= 780 && numPrefix <= 780) return 'CHILE';
  if (numPrefix >= 784 && numPrefix <= 784) return 'PARAGUAY';
  if (numPrefix >= 786 && numPrefix <= 786) return 'ECUADOR';
  if (numPrefix >= 789 && numPrefix <= 790) return 'BRAZIL';
  if (numPrefix >= 800 && numPrefix <= 839) return 'ITALY';
  if (numPrefix >= 840 && numPrefix <= 849) return 'SPAIN';
  if (numPrefix >= 850 && numPrefix <= 850) return 'CUBA';
  if (numPrefix >= 858 && numPrefix <= 858) return 'SLOVAKIA';
  if (numPrefix >= 859 && numPrefix <= 859) return 'CZECH_REPUBLIC';
  if (numPrefix >= 860 && numPrefix <= 860) return 'YUGOSLAVIA';
  if (numPrefix >= 865 && numPrefix <= 865) return 'MONGOLIA';
  if (numPrefix >= 867 && numPrefix <= 867) return 'NORTH_KOREA';
  if (numPrefix >= 868 && numPrefix <= 869) return 'TURKEY';
  if (numPrefix >= 870 && numPrefix <= 879) return 'NETHERLANDS';
  if (numPrefix >= 880 && numPrefix <= 880) return 'SOUTH_KOREA';
  if (numPrefix >= 884 && numPrefix <= 884) return 'CAMBODIA';
  if (numPrefix >= 885 && numPrefix <= 885) return 'THAILAND';
  if (numPrefix >= 888 && numPrefix <= 888) return 'SINGAPORE';
  if (numPrefix >= 890 && numPrefix <= 890) return 'INDIA';
  if (numPrefix >= 893 && numPrefix <= 893) return 'VIETNAM';
  if (numPrefix >= 896 && numPrefix <= 896) return 'PAKISTAN';
  if (numPrefix >= 899 && numPrefix <= 899) return 'INDONESIA';
  if (numPrefix >= 900 && numPrefix <= 919) return 'AUSTRIA';
  if (numPrefix >= 930 && numPrefix <= 939) return 'AUSTRALIA';
  if (numPrefix >= 940 && numPrefix <= 949) return 'NEW_ZEALAND';
  if (numPrefix >= 950 && numPrefix <= 950) return 'GS1_GLOBAL';
  if (numPrefix >= 951 && numPrefix <= 951) return 'EPC_GLOBAL';
  if (numPrefix >= 955 && numPrefix <= 955) return 'MALAYSIA';
  if (numPrefix >= 958 && numPrefix <= 958) return 'MACAU';
  
  // Caribbean/CARICOM regions
  if (numPrefix >= 740 && numPrefix <= 750) return 'CARICOM';
  
  return 'UNKNOWN';
}

/**
 * Get appropriate language codes for a region
 */
function getRegionLanguages(region: string): string[] {
  const languageMap: Record<string, string[]> = {
    'CHINA': ['zh', 'zh-CN', 'en'],
    'JAPAN': ['ja', 'en'],
    'FRANCE': ['fr', 'en'],
    'GERMANY': ['de', 'en'],
    'SPAIN': ['es', 'en'],
    'ITALY': ['it', 'en'],
    'NETHERLANDS': ['nl', 'en'],
    'SWEDEN': ['sv', 'en'],
    'NORWAY': ['no', 'en'],
    'FINLAND': ['fi', 'en'],
    'DENMARK': ['da', 'en'],
    'RUSSIA': ['ru', 'en'],
    'BRAZIL': ['pt', 'en'],
    'MEXICO': ['es', 'en'],
    'CARICOM': ['en', 'es', 'fr'],
    'SOUTH_KOREA': ['ko', 'en'],
    'THAILAND': ['th', 'en'],
    'VIETNAM': ['vi', 'en'],
    'INDIA': ['hi', 'en'],
    'TURKEY': ['tr', 'en'],
    'ARABIC': ['ar', 'en']
  };
  
  return languageMap[region] || ['en'];
}

/**
 * Search for product information using GS1 GEPIR system
 * Global database for product information
 */
async function searchGS1GEPIR(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    
    // GS1 GEPIR API endpoint (this is a placeholder - actual implementation would require API access)
    const response = await fetch(`https://gepir.gs1.org/index.php/search-by-gtin/${barcode}`);
    const text = await response.text();
    
    // Parse HTML response (simplified parsing)
    const nameMatch = text.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const companyMatch = text.match(/Company Name:<\/strong>\s*([^<]+)/i);
    
    if (nameMatch && nameMatch[1]) {
      return {
        name: nameMatch[1].trim(),
        brand: companyMatch ? companyMatch[1].trim() : undefined,
        success: true,
        source: 'GS1 GEPIR',
        region: region
      };
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using China GB/T barcode system
 * Supports Chinese product databases
 */
async function searchChinaGBT(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    
    // Only process Chinese barcodes
    if (!region.includes('CHINA') && !barcode.startsWith('69')) {
      return { success: false };
    }
    
    // China Article Numbering Center API (placeholder)
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
        source: 'China GB/T',
        region: 'CHINA',
        language: 'zh-CN'
      };
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using GS1 Caribbean Database
 * Regional database for Caribbean countries
 */
async function searchGS1Caribbean(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    
    // Check if barcode is from Caribbean region
    const caribbeanPrefixes = ['740', '741', '742', '743', '744', '745', '746'];
    const prefix = barcode.substring(0, 3);
    
    if (!caribbeanPrefixes.includes(prefix) && region !== 'CARICOM') {
      return { success: false };
    }
    
    // GS1 Caribbean API (placeholder - would need actual API access)
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
        source: 'GS1 Caribbean',
        region: 'CARICOM',
        language: 'en'
      };
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using CARICOM regional databases
 * Supports multiple Caribbean Community countries
 */
async function searchCARICOMRegional(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    
    // CARICOM countries database search
    const caricomApis = [
      { url: 'https://api.jamaicatradepoint.gov.jm/products', country: 'Jamaica' },
      { url: 'https://api.ttbs.org.tt/products', country: 'Trinidad & Tobago' },
      { url: 'https://api.barbados.gov.bb/products', country: 'Barbados' },
      { url: 'https://api.guyana.gov.gy/products', country: 'Guyana' }
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
            region: 'CARICOM',
            language: 'en'
          };
        }
      } catch (apiError) {
        // Try next CARICOM API
        continue;
      }
    }
  } catch (error) {
    // Continue to next API
  }
  
  return { success: false };
}

/**
 * Search for product information using Open Food Facts API (free)
 * Enhanced with better error handling, logging, and response validation
 * Supports multi-language search based on barcode region
 */
async function searchOpenFoodFacts(barcode: string): Promise<ProductInfo> {
  const apiName = 'openFoodFacts';
  
  try {
    logger.logAttempt(barcode, 'Open Food Facts');
    await rateLimiter.throttle(apiName);
    
    const region = detectRegion(barcode);
    const languages = getRegionLanguages(region);
    
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Inventory-Pro/1.0.0 (Product Lookup Service)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const rawData = await response.json();
    
    // Validate response structure
    const validationResult = OpenFoodFactsProductSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(`Invalid API response structure: ${validationResult.error.message}`);
    }
    
    const data = validationResult.data;
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      
      // Try multiple name fields for better coverage, prioritizing regional languages
      let name = '';
      let description = '';
      
      // Try language-specific names first
      for (const lang of languages) {
        const langField = `product_name_${lang}` as keyof typeof product;
        if (!name && product[langField]) {
          name = product[langField] as string;
          break;
        }
      }
      
      // Fallback to general names
      if (!name) {
        name = product.product_name || 
               product.product_name_en || 
               product.product_name_fr || 
               product.product_name_es || 
               product.abbreviated_product_name ||
               product.generic_name || 
               product.generic_name_en || '';
      }
      
      // Try language-specific descriptions
      for (const lang of languages) {
        const langField = `generic_name_${lang}` as keyof typeof product;
        if (!description && product[langField]) {
          description = product[langField] as string;
          break;
        }
      }
      
      // Fallback descriptions
      if (!description) {
        description = product.generic_name || 
                     product.generic_name_en || 
                     product.ingredients_text_en || 
                     product.ingredients_text || '';
      }
      
      // Better image selection with URL validation
      let imageUrl = product.image_front_url || 
                    product.image_url || 
                    product.image_front_small_url || '';
      
      // Validate image URL
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = '';
      }
      
      if (name.trim()) {
        const result: ProductInfo = {
          name: name.trim(),
          description: description ? description.trim() : undefined,
          brand: product.brands || undefined,
          category: product.categories || product.categories_tags?.[0] || undefined,
          imageUrl: imageUrl || undefined,
          success: true,
          source: 'Open Food Facts',
          region: region,
          language: languages[0]
        };
        
        logger.logSuccess(barcode, 'Open Food Facts', result.name);
        return result;
      }
    }
    
    // Product not found in Open Food Facts
    return { 
      success: false, 
      errorMessage: 'Product not found in Open Food Facts database' 
    };
    
  } catch (error: any) {
    logger.logError(barcode, 'Open Food Facts', error);
    return { 
      success: false, 
      errorMessage: `Open Food Facts API error: ${error.message}` 
    };
  }
}

/**
 * Search for product information using UPC Database API (free tier)
 * Enhanced with proper rate limiting for free tier and error handling
 * Free tier allows 100 requests per day, 1 request per second
 * Optional: Set UPC_DATABASE_API_KEY environment variable for paid tier
 */
async function searchUPCDatabase(barcode: string): Promise<ProductInfo> {
  const apiName = 'upcDatabase';
  
  try {
    logger.logAttempt(barcode, 'UPC Database');
    await rateLimiter.throttle(apiName); // Enforces 1 second delay for free tier
    
    // Use API key if available, otherwise use free trial endpoint
    const apiKey = process.env.UPC_DATABASE_API_KEY;
    const baseUrl = apiKey 
      ? 'https://api.upcitemdb.com/prod/trial/lookup' 
      : 'https://api.upcitemdb.com/prod/trial/lookup';
    
    const url = `${baseUrl}?upc=${barcode}`;
    
    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Inventory-Pro/1.0.0 (Product Lookup Service)',
        ...(apiKey && { 'user_key': apiKey })
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const rawData = await response.json();
    
    // Validate response structure
    const validationResult = UPCDatabaseResponseSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(`Invalid API response structure: ${validationResult.error.message}`);
    }
    
    const data = validationResult.data;
    
    if (data.code === 'OK' && data.items && data.items.length > 0) {
      const item = data.items[0];
      
      const result: ProductInfo = {
        name: item.title || undefined,
        description: item.description || undefined,
        brand: item.brand || undefined,
        category: item.category || undefined,
        imageUrl: (item.images && item.images.length > 0) ? item.images[0] : undefined,
        success: true,
        source: apiKey ? 'UPC Database (API Key)' : 'UPC Database (Free)'
      };
      
      logger.logSuccess(barcode, 'UPC Database', result.name);
      return result;
    } else if (data.code === 'RATE_LIMIT_EXCEEDED') {
      throw new Error('Rate limit exceeded for UPC Database free tier');
    }
    
    return { 
      success: false, 
      errorMessage: 'Product not found in UPC Database' 
    };
    
  } catch (error: any) {
    logger.logError(barcode, 'UPC Database', error);
    return { 
      success: false, 
      errorMessage: `UPC Database API error: ${error.message}` 
    };
  }
}










/**
 * Main function to lookup product information by barcode
 * Updated to focus on free APIs with proper error handling and logging
 */
export async function lookupProductByBarcode(barcode: string): Promise<ProductInfo> {
  // Clean the barcode (remove any non-numeric characters)
  const cleanBarcode = barcode.replace(/\D/g, '');
  
  if (!cleanBarcode || cleanBarcode.length < 8) {
    logger.logError(cleanBarcode, 'Validation', new Error('Invalid barcode length'));
    return { 
      success: false, 
      errorMessage: 'Invalid barcode: must be at least 8 digits' 
    };
  }
  
  // Check cache first
  const cacheKey = `barcode_${cleanBarcode}`;
  const cached = productCache.get(cacheKey);
  if (cached) {
    logger.logCacheHit(cleanBarcode);
    return { ...cached, source: `${cached.source} (cached)` };
  }
  
  logger.logCacheMiss(cleanBarcode);
  
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
  
  // Focus on free APIs only
  const region = detectRegion(cleanBarcode);
  const freeApis = [
    searchOpenFoodFacts,    // Comprehensive free food product database
    searchUPCDatabase,      // General product database with free tier
  ];
  
  // Add regional APIs if they might be accessible
  let apis = [...freeApis];
  
  // Prioritize region-specific APIs if they exist and might work
  if (region === 'CHINA' || cleanBarcode.startsWith('69')) {
    apis = [searchChinaGBT, searchGS1GEPIR, ...apis];
  } else if (region === 'CARICOM' || ['740', '741', '742', '743', '744', '745', '746'].includes(cleanBarcode.substring(0, 3))) {
    apis = [searchGS1Caribbean, searchCARICOMRegional, searchGS1GEPIR, ...apis];
  } else {
    // Add GS1 GEPIR as it might work for some regions
    apis = [searchGS1GEPIR, ...apis];
  }
  
  const errors: string[] = [];
  
  // Try each barcode variant with each API
  for (const barcodeVariant of barcodeVariants) {
    for (const api of apis) {
      try {
        const result = await api(barcodeVariant);
        if (result.success) {
          // Cache successful results
          productCache.set(cacheKey, result);
          
          // Add region detection info if not already present
          if (!result.region) {
            result.region = region;
          }
          
          return result;
        } else if (result.errorMessage) {
          errors.push(result.errorMessage);
        }
      } catch (error: any) {
        // Log error and continue to next API/variant combination
        logger.logError(barcodeVariant, api.name, error);
        errors.push(`${api.name}: ${error.message}`);
        continue;
      }
    }
  }
  
  // Cache unsuccessful results for a shorter time to avoid repeated failed lookups
  const failedResult: ProductInfo = { 
    success: false,
    errorMessage: `Product not found. Tried ${apis.length} APIs. Errors: ${errors.join('; ')}`
  };
  productCache.set(cacheKey, failedResult, 60 * 60 * 1000); // 1 hour TTL for failures
  
  return failedResult;
}

/**
 * Test API availability for debugging and monitoring
 */
export async function testAPIAvailability(): Promise<Record<string, boolean>> {
  const testResults: Record<string, boolean> = {};
  
  // Test Open Food Facts with a known barcode (Coca Cola)
  try {
    const response = await fetch('https://world.openfoodfacts.org/api/v0/product/5449000000996.json', {
      timeout: 5000
    });
    testResults['openFoodFacts'] = response.ok;
  } catch {
    testResults['openFoodFacts'] = false;
  }
  
  // Test UPC Database with a simple ping (avoiding rate limits)
  try {
    const response = await fetch('https://api.upcitemdb.com/prod/trial/lookup?upc=test', {
      timeout: 5000
    });
    // Even an error response means the API is reachable
    testResults['upcDatabase'] = true;
  } catch {
    testResults['upcDatabase'] = false;
  }
  
  return testResults;
}

/**
 * Get configuration info about the barcode lookup service
 */
export function getServiceConfig(): Record<string, any> {
  return {
    freeAPIs: ['Open Food Facts', 'UPC Database (Free Tier)'],
    optionalAPIs: ['UPC Database (with API key)'],
    cacheEnabled: true,
    cacheTTL: '24 hours',
    rateLimiting: {
      openFoodFacts: '200ms',
      upcDatabase: '1000ms (free tier)',
      default: '100ms'
    },
    environmentVariables: {
      UPC_DATABASE_API_KEY: 'Optional - for paid UPC Database tier'
    }
  };
}