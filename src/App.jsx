import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, query, setLogLevel } from 'firebase/firestore';
import { ShoppingBag, Loader2, Menu, XCircle, Utensils, AlertTriangle } from 'lucide-react';

// ----------------------
// 1. FIREBASE SETUP
// ----------------------

// Fallback configuration for external (Render) deployment
// This allows the app to load and attempt to read data from the default app ID path.
const FALLBACK_FIREBASE_CONFIG = {
    apiKey: "MOCK_API_KEY", 
    authDomain: "mock-auth-domain.firebaseapp.com",
    projectId: "mock-project-id",
    storageBucket: "mock-storage-bucket.appspot.com",
    messagingSenderId: "MOCK_SENDER_ID",
    appId: "MOCK_APP_ID"
};

const DEFAULT_APP_ID = 'fresh-eats-admin-dev'; // IMPORTANT: We use the ADMIN DEV ID here to read the products created by the Admin App!

// Check for Canvas variables first, then fallback
const appId = typeof __app_id !== 'undefined' ? __app_id : DEFAULT_APP_ID;

let firebaseConfig;
try {
    firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config 
        ? JSON.parse(__firebase_config) 
        : FALLBACK_FIREBASE_CONFIG;
} catch (e) {
    firebaseConfig = FALLBACK_FIREBASE_CONFIG;
}

// The collection path for public data (products)
const getProductCollectionPath = (appId) => `/artifacts/${appId}/public/data/products`;

setLogLevel('error'); // Set log level to reduce console noise unless debugging

let app;
let db;
let auth;

// ----------------------
// 2. MAIN APP COMPONENT
// ----------------------

const App = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Track if we are using the fallback config
  const isFallback = firebaseConfig === FALLBACK_FIREBASE_CONFIG;


  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    if (!firebaseConfig || !firebaseConfig.projectId) {
        setError("Initialization Failed: Firebase configuration is missing or invalid.");
        setIsAuthReady(true);
        return;
    }
    
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);

      // Listen for auth state changes to ensure user is authenticated
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          // Sign in anonymously for client side
          await signInAnonymously(auth).catch(e => {
            console.error("Anonymous Auth Error:", e);
            // Ignore error for fallback mode as we only need the db instance
          });
        }
        setIsAuthReady(true);
      });

      return () => unsubscribeAuth();
    } catch (e) {
      console.error("Firebase Init Error:", e);
      setError(`Initialization Error: ${e.message}`);
      setIsAuthReady(true);
    }
  }, []);

  // --- Firestore Listener (Fetch Products) ---
  useEffect(() => {
    // Only proceed if Firebase is initialized and Auth is ready
    if (!isAuthReady || !db || error) return;

    // Use the hardcoded DEV app ID (fresh-eats-admin-dev) if using the fallback config 
    // to read the data that was written by the Admin App (which also uses fresh-eats-admin-dev fallback ID).
    const dataAppId = isFallback ? DEFAULT_APP_ID : appId; 
    
    const productsRef = collection(db, getProductCollectionPath(dataAppId));
    const productsQuery = query(productsRef);

    // Set up real-time listener for products
    const unsubscribeSnapshot = onSnapshot(productsQuery, (snapshot) => {
      try {
        const productList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productList.filter(p => p.available)); // Only show available products
        setLoading(false);

        // Extract and set unique categories for filtering
        const uniqueCategories = ['All', ...new Set(productList.map(p => p.category).filter(Boolean))].sort();
        setCategories(uniqueCategories);

      } catch (e) {
        console.error("Firestore Snapshot Error:", e);
        setError(`Data fetch failed: ${e.message}. Please verify Firestore rules.`);
        setLoading(false);
      }
    }, (e) => {
      console.error("onSnapshot failed:", e);
      setError(`Real-time data error: ${e.message}. Please verify Firestore rules.`);
      setLoading(false);
    });

    // Cleanup function
    return () => unsubscribeSnapshot();
  }, [isAuthReady, error, isFallback]);

  // --- Filtering and Display Logic ---

  const filteredProducts = products.filter(product => 
    activeCategory === 'All' || product.category === activeCategory
  );

  const productsGroupedByCategory = filteredProducts.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});


  // --- Render Functions ---

  const renderHeader = () => (
    <header className="bg-white shadow-lg sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Fresh Eats Delivery</h1>
        </div>
        {/* Placeholder for future Cart Button */}
        <button 
            className="flex items-center space-x-2 p-2 bg-emerald-500 text-white rounded-full shadow-md hover:bg-emerald-600 transition"
            aria-label="View Shopping Cart"
        >
            <span className="font-semibold text-sm">Cart ($0.00)</span>
        </button>
      </div>
    </header>
  );
  
  const renderCategoryFilter = () => (
    <div className="bg-white sticky top-[68px] z-10 shadow-inner py-3 border-b">
        <div className="max-w-4xl mx-auto px-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`inline-block px-4 py-1 mx-1 rounded-full text-sm font-medium transition duration-200 
                        ${activeCategory === cat 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    </div>
  );

  const renderProductList = () => {
    if (loading) {
      return (
        <div className="text-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
          <p className="font-semibold">Loading the delicious menu...</p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="p-8 mx-auto max-w-lg mt-12 bg-red-100 border border-red-400 text-red-700 rounded-xl flex items-start space-x-3">
                <XCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold">Connection Error</h3>
                    <p className="text-sm">{error}</p>
                    {isFallback && (
                         <div className="mt-4 text-xs flex items-center space-x-1 text-red-600">
                             <AlertTriangle className="w-3 h-3" />
                             <span>Reading from Mock Database ID: {DEFAULT_APP_ID}.</span>
                         </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (products.length === 0) {
      return (
        <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl mx-auto max-w-md mt-12">
          <Menu className="w-10 h-10 mx-auto mb-4" />
          <h3 className="text-xl font-bold">Menu Empty</h3>
          <p>The restaurant hasn't added any items yet. </p>
          {isFallback && (
              <p className="text-xs mt-4 text-indigo-500">
                Data can only be added via the Admin App when run inside the Canvas environment.
              </p>
          )}
        </div>
      );
    }

    return (
        <div className="space-y-12">
            {Object.entries(productsGroupedByCategory).map(([category, items]) => (
                <section key={category}>
                    <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-emerald-400 pb-2">
                        {category}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {items.map(product => (
                            <div key={product.id} className="bg-white p-5 rounded-xl shadow-lg flex justify-between items-center transition duration-200 hover:shadow-xl hover:scale-[1.01]">
                                <div className="pr-4">
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                                    <p className="text-2xl font-extrabold text-emerald-600">
                                        ${product.price ? product.price.toFixed(2) : '0.00'}
                                    </p>
                                </div>
                                {/* Placeholder for a product image (using an icon for now) */}
                                <div className="flex-shrink-0 w-24 h-24 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <Utensils className="w-10 h-10 text-emerald-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
  };


  // --- Main Render ---

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {renderHeader()}
      {categories.length > 1 && renderCategoryFilter()}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {renderProductList()}
      </main>
    </div>
  );
};

export default App;
