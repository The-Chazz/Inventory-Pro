/**
 * Product Lookup Service
 * 
 * Uses multiple APIs to search for product information by barcode
 * Includes international databases, region detection, and multi-language support
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
  region?: string;
  language?: string;
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
 * Enhanced to search multiple name fields and better image selection
 * Now includes multi-language support
 */
async function searchOpenFoodFacts(barcode: string): Promise<ProductInfo> {
  try {
    await rateLimiter.throttle();
    const region = detectRegion(barcode);
    const languages = getRegionLanguages(region);
    
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      
      // Try multiple name fields for better coverage, prioritizing regional languages
      let name = '';
      let description = '';
      
      // Try language-specific names first
      for (const lang of languages) {
        if (!name && product[`product_name_${lang}`]) {
          name = product[`product_name_${lang}`];
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
               product.generic_name_en;
      }
      
      // Try language-specific descriptions
      for (const lang of languages) {
        if (!description && product[`generic_name_${lang}`]) {
          description = product[`generic_name_${lang}`];
          break;
        }
      }
      
      // Fallback descriptions
      if (!description) {
        description = product.generic_name || 
                     product.generic_name_en || 
                     product.ingredients_text_en || 
                     product.ingredients_text;
      }
      
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
          source: 'Open Food Facts',
          region: region,
          language: languages[0]
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
  
  // Try each API in priority order (most reliable first, region-specific prioritization)
  const region = detectRegion(cleanBarcode);
  let apis = [
    searchOpenFoodFacts,      // Most comprehensive for food products
    searchUPCDatabase,        // Good general product database
    searchGS1GEPIR,          // Global GS1 database
    searchEANSearch,         // Good for European products
    searchGoogleProducts,    // Configurable with API key
    searchAmazonProducts,    // Configurable with API credentials
    searchBarcodeSpider,     // Additional source
    searchBarcodeLookup      // Web scraping fallback
  ];
  
  // Prioritize region-specific APIs
  if (region === 'CHINA' || cleanBarcode.startsWith('69')) {
    apis = [searchChinaGBT, searchGS1GEPIR, ...apis];
  } else if (region === 'CARICOM' || ['740', '741', '742', '743', '744', '745', '746'].includes(cleanBarcode.substring(0, 3))) {
    apis = [searchGS1Caribbean, searchCARICOMRegional, searchGS1GEPIR, ...apis];
  }
  
  // Try each barcode variant with each API for maximum coverage
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