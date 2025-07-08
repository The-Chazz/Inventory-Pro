import { useState, useEffect } from "./../../node_modules/.vite/deps_temp_343513f7/react";
import Header from "./src/components/Header";
import { useAppContext } from "./src/context/AppContext";
import BarcodeScanner from "./src/components/BarcodeScanner";
import { BarcodeFormat } from '@zxing/library';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./src/lib/queryClient";
import { queryClient } from "./src/lib/queryClient";
import { useToast } from "./src/hooks/use-toast";
import PrintReceipt from "./src/components/PrintReceipt";

// Define types for inventory and cart
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  priceUnit: string;
  threshold: number;
  status: string;
  image?: string;
  barcode?: string;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

const PointOfSale: React.FC = () => {
  const { currentPage } = useAppContext();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: "Admin User", username: "admin" }); // Default to Admin User
  const { toast } = useToast();
  
  // Fetch current user information
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('/api/users');
      if (response && response instanceof Response) {
        return await response.json();
      }
      return [];
    }
  });
  
  // Set the current user to the first admin user in the list
  useEffect(() => {
    if (users && users.length > 0) {
      // In a real app, this would use authentication to determine the current user
      // For now, we'll just use the first admin user
      const adminUser = users.find((user: any) => user.user.role === 'admin') || users[0];
      if (adminUser) {
        setCurrentUser({ 
          name: adminUser.name,
          username: adminUser.username 
        });
      }
    }
  }, [users]);
  
  // Fetch inventory data sorted by popularity
  const { data: inventoryItems } = useQuery({
    queryKey: ['/api/inventory/popular'],
    queryFn: async () => {
      // Use the new endpoint that returns inventory sorted by popularity
      const response = await apiRequest('/api/inventory/popular');
      if (response && response instanceof Response) {
        return await response.json() as InventoryItem[];
      }
      return [] as InventoryItem[];
    }
  });
  
  // Filter inventory items based on search term
  const filteredItems = inventoryItems?.filter((item: InventoryItem) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate cart totals
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    const item = inventoryItems?.find(item => 
      item.barcode === barcode || item.sku === barcode
    );
    
    if (item) {
      addToCart(item);
      toast({
        title: "Item Added",
        description: `${item.name} added to cart`,
      });
    } else {
      toast({
        title: "Item Not Found",
        description: `No item with barcode ${barcode} found`,
        variant: "destructive"
      });
    }
  };
  
  // Add item to cart
  const addToCart = (item: InventoryItem) => {
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex !== -1) {
      // Item already in cart, update quantity
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      updatedCart[existingItemIndex].subtotal = 
        updatedCart[existingItemIndex].price * updatedCart[existingItemIndex].quantity;
      setCart(updatedCart);
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        unit: item.unit,
        subtotal: item.price
      };
      setCart([...cart, newItem]);
    }
  };
  
  // Remove item from cart
  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };
  
  // Update item quantity
  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return;
    
    const updatedCart = cart.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          subtotal: item.price * quantity
        };
      }
      return item;
    });
    
    setCart(updatedCart);
  };
  
  // Clear cart
  const clearCart = () => {
    setCart([]);
  };
  
  // Show receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Cannot process an empty sale",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
          subtotal: item.subtotal
        })),
        cashier: currentUser.name, // Use the current user's name from state
        amount: cartTotal,
        status: "Completed"
      };
      
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(saleData)
      });
      
      if (response.ok) {
        toast({
          title: "Sale Complete",
          description: `Total: $${cartTotal.toFixed(2)}`,
        });
        
        // Show receipt modal for printing
        setShowReceiptModal(true);
        
        // Invalidate queries to update dashboard, inventory, etc.
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        queryClient.invalidateQueries({ queryKey: ['/api/inventory/popular'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/alerts/low-stock'] });
      } else {
        throw new Error("Failed to process sale");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process sale",
        variant: "destructive"
      });
    }
  };
  
  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Barcode Scanner Modal */}
        {isScanning && (
          <BarcodeScanner 
            isActive={true}
            onScan={handleBarcodeScan}
            onClose={() => setIsScanning(false)}
            onError={(error) => {
              console.error("Scanner error:", error);
              toast({
                title: "Scanner Error",
                description: "There was an error with the barcode scanner",
                variant: "destructive",
              });
              setIsScanning(false);
            }}
          />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Products */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Products</h3>
                <div className="flex space-x-2">
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsScanning(true)} 
                    className="px-4 py-2 rounded-md font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    Scan Barcode
                  </button>
                </div>
              </div>
              
              {/* Barcode Scanner is now in a modal, only shown when isScanning is true */}
              
              {/* Product Grid - with popular items appearing more prominently */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredItems && filteredItems.length > 0 ? (
                  filteredItems.map((item: InventoryItem, index: number) => {
                    // Use a special style for the first 4 items (most popular)
                    const isPopular = index < 4;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`border ${isPopular ? 'border-blue-300 shadow-md' : 'border-gray-200'} 
                          rounded-md p-3 flex flex-col items-center cursor-pointer 
                          ${isPopular ? 'hover:bg-blue-50' : 'hover:bg-gray-50'}
                          ${isPopular ? 'transition-transform hover:scale-105' : ''}`}
                        onClick={() => addToCart(item)}
                      >
                        {isPopular && (
                          <div className="absolute top-0 right-0 -mt-2 -mr-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Popular
                            </span>
                          </div>
                        )}
                        <div className="h-16 w-16 mb-2">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                          ) : (
                            <div className={`h-full w-full ${isPopular ? 'bg-blue-100' : 'bg-gray-200'} flex items-center justify-center text-gray-500 rounded-md`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <h4 className={`text-sm font-medium ${isPopular ? 'text-blue-800' : 'text-gray-800'} truncate`}>{item.name}</h4>
                          <p className="text-sm text-gray-500">${item.price}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-8 text-center text-gray-500">
                    {searchTerm ? 'No matching products found.' : 'No products available.'}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Cart */}
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Cart</h3>
                <button 
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
              </div>
              
              {/* Cart Items */}
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-800">{item.name}</h4>
                        <p className="text-xs text-gray-500">${item.price} per {item.unit}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="text-sm font-medium w-16 text-right">${item.subtotal.toFixed(2)}</span>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>Your cart is empty</p>
                  </div>
                )}
              </div>
              
              {/* Cart Summary */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{itemCount}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={processSale}
                  disabled={cart.length === 0}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Print Receipt Modal */}
      <PrintReceipt 
        isOpen={showReceiptModal} 
        onClose={() => {
          setShowReceiptModal(false);
          clearCart(); // Clear cart after printing/closing receipt
        }}
        cart={cart}
        cartTotal={cartTotal}
        cashier={currentUser.username}
        transactionId={undefined} // Will be generated by the receipt component from settings
      />
    </>
  );
};

export default PointOfSale;
