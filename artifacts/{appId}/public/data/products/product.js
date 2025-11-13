import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, query, serverTimestamp } from 'firebase/firestore';

// Global variables provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Utility function for exponential backoff (necessary for API stability)
const retryFetch = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      console.log(`Fetch failed. Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState(null);

  // --- 1. FIREBASE INITIALIZATION AND AUTHENTICATION ---
  useEffect(() => {
    let app, firestore, authInstance;

    try {
      if (Object.keys(firebaseConfig).length === 0) {
        throw new Error("Firebase configuration is missing.");
      }
      
      app = initializeApp(firebaseConfig);
      firestore = getFirestore(app);
      authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      // Handle Authentication
      const authenticate = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(authInstance, initialAuthToken);
          } else {
            await signInAnonymously(authInstance);
          }
        } catch (e) {
          console.error("Firebase Auth Error:", e);
          setError("Authentication Failed. Check console for details.");
        } finally {
          setIsAuthReady(true);
        }
      };

      authenticate();

      // Listener to get the current user ID after sign-in
      const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(null); // Should not happen after forced sign-in but good practice
        }
      });

      return () => {
        unsubscribeAuth();
      };
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setError("Firebase Init Failed. Check console for details.");
      setLoading(false);
    }
  }, []);

  // --- 2. REAL-TIME DATA LISTENER (onSnapshot) ---
  useEffect(() => {
    if (!db || !isAuthReady || !userId) {
      if (isAuthReady) setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Define the public collection path
    const publicDataPath = `artifacts/${appId}/public/data/products`;
    const productsCollectionRef = collection(db, publicDataPath);
    
    // NOTE: Avoid using orderBy() in queries to prevent index requirement errors.
    const q = query(productsCollectionRef);

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const productList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Since we avoided orderBy, we sort by timestamp client-side
        productList.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt ? data.createdAt.toMillis() : 0 
        });
      });

      // Sort products by creation time (newest first)
      productList.sort((a, b) => b.createdAt - a.createdAt); 

      setProducts(productList);
      setLoading(false);
    }, (e) => {
      console.error("Firestore Snapshot Error:", e);
      setError("Failed to load products. Check console/security rules.");
      setLoading(false);
    });

    // Cleanup function
    return () => unsubscribeSnapshot();
  }, [db, isAuthReady, userId]);

  // --- 3. ADD PRODUCT FUNCTION ---
  const addProduct = async (e) => {
    e.preventDefault();
    if (!productName || !productPrice || !db || !userId) {
      setError("Please ensure all fields are filled and the database is ready.");
      return;
    }

    try {
      setLoading(true);
      const publicDataPath = `artifacts/${appId}/public/data/products`;
      
      const newProduct = {
        name: productName.trim(),
        price: parseFloat(productPrice),
        addedBy: userId,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, publicDataPath), newProduct);

      // Clear form fields on success
      setProductName('');
      setProductPrice('');
      setError(null);
    } catch (e) {
      console.error("Error adding product:", e);
      setError("Failed to add product. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- 4. RENDER UI ---

  const renderProductList = () => {
    if (loading) {
      return (
        <div className="text-center py-8 text-gray-400">
          <svg className="animate-spin h-5 w-5 mr-3 inline-block text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Product Catalog...
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-red-400 font-medium bg-red-900/50 rounded-lg p-4">
          Error: {error}
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          The catalog is empty. Add the first product above!
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="p-4 bg-gray-700 rounded-lg shadow-md flex justify-between items-center transition duration-200 hover:bg-gray-600 border-l-4 border-emerald-400">
            <div>
              <p className="text-xl font-semibold text-white">{product.name}</p>
              <p className="text-sm text-gray-400">
                Added by: {product.addedBy.substring(0, 8)}...
              </p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-400">
              ${product.price.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        
        <h1 className="text-4xl font-extrabold mb-2 text-center text-emerald-400 tracking-tight">
          Real-Time Product Catalog
        </h1>
        <p className="text-center mb-6 text-gray-400">
          Add and view items collaboratively. Data stored in Firestore.
        </p>

        {/* Display Current User ID */}
        <div className="mb-6 p-3 bg-gray-700 rounded-lg text-sm break-all">
            <span className="font-bold text-gray-300">User ID:</span> 
            <span className="ml-2 text-yellow-400">{userId || 'Authenticating...'}</span>
            <p className="text-xs mt-1 text-gray-400">
              App ID: {appId}
            </p>
        </div>


        {/* Add Product Form */}
        <form onSubmit={addProduct} className="bg-gray-700 p-6 rounded-xl shadow-inner mb-8 space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-2">
            Add New Product
          </h2>
          
          <div>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-300 mb-1">Product Name</label>
            <input
              id="productName"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Wireless Headset"
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:ring-emerald-500 focus:border-emerald-500"
              required
              disabled={!userId}
            />
          </div>
          
          <div>
            <label htmlFor="productPrice" className="block text-sm font-medium text-gray-300 mb-1">Price ($)</label>
            <input
              id="productPrice"
              type="number"
              step="0.01"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              placeholder="e.g., 99.99"
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:ring-emerald-500 focus:border-emerald-500"
              required
              disabled={!userId}
            />
          </div>
          
          <button
            type="submit"
            className={`w-full py-3 rounded-lg font-bold transition duration-300 
                        ${userId 
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/50' 
                          : 'bg-gray-500 cursor-not-allowed'}`}
            disabled={!userId || loading}
          >
            {loading && userId ? 'Adding...' : userId ? 'Add to Catalog' : 'Waiting for Authentication...'}
          </button>
        </form>

        {/* Product List Display */}
        <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-2">
          Shared Catalog Items
        </h2>
        {renderProductList()}

      </div>
    </div>
  );
};

export default ProductCatalog;
