// frontend/src/components/modals/GenerateCookieModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Cookie, Lock, Loader, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { storeService } from '../../services/storeService';

function GenerateCookieModal({ 
  isOpen, 
  onClose, 
  store, 
  onSuccess 
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cookieCount, setCookieCount] = useState(0);

  // Reset form when modal opens/closes or store changes
  useEffect(() => {
    if (isOpen && store) {
      setEmail('');
      setPassword('');
      setIsGenerating(false);
      setIsSuccess(false);
      setCookieCount(0);
    }
  }, [isOpen, store]);

  const handleGenerate = async () => {
    if (!email || !password) {
      toast.error('Email dan password harus diisi!');
      return;
    }

    try {
      setIsGenerating(true);
      
      const result = await storeService.generateCookies(
        store._id,
        email,
        password
      );

      if (result.success) {
        setCookieCount(result.count);
        setIsSuccess(true);
        
        // Close modal after 2 seconds and call onSuccess
        setTimeout(() => {
          onClose();
          onSuccess?.();
        }, 2000);
      } else {
        toast.error(result.message || 'Gagal generate cookies');
        setIsGenerating(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      toast.error('Gagal generate cookies: ' + errorMsg);
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  if (!isOpen || !store) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all">
        {/* Header with Store-specific Icon */}
        <div className="relative p-6 pb-4 border-b border-gray-100">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Cookie className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Auto Generate Cookies
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {store.name}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSuccess ? (
            // Success State
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Cookies Generated Successfully!
              </h4>
              <p className="text-sm text-gray-600">
                {cookieCount} cookies have been added to <span className="font-semibold">{store.name}</span>
              </p>
            </div>
          ) : isGenerating ? (
            // Loading State
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader className="text-blue-600 animate-spin" size={32} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Generating Cookies...
              </h4>
              <p className="text-sm text-gray-600">
                Logging in to {store.domain} and extracting cookies
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This may take 30-60 seconds
              </p>
            </div>
          ) : (
            // Form State
            <>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Kasir Pintar
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && email && password) {
                        handleGenerate();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && email && password) {
                        handleGenerate();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <div className="flex gap-3">
                  <Lock className="text-blue-600 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Secure & Encrypted
                    </p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Your credentials will be encrypted (AES-256) and stored securely for automatic sync feature.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!email || !password}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
                >
                  Generate Cookies
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default GenerateCookieModal;