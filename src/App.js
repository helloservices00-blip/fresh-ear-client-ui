import React from 'react';
import { ShoppingCart } from 'lucide-react'; // Example import

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl text-center">
        <ShoppingCart size={48} className="mx-auto mb-4 text-emerald-500" />
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
          Fresh Eats Client UI
        </h1>
        <p className="text-gray-600">
          Deployment successful! Start building your application here.
        </p>
      </div>
    </div>
  );
}

export default App;
