import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import AppFooter from './components/layout/Footer';
import Dashboard from './components/dashboard/Dashboard';
import StoreList from './components/stores/StoreList';
import CookieList from './components/cookies/CookieList';
import SettingsPage from './components/settings/SettingsPage';
import LoginPage from './pages/LoginPage';
import { authService } from './services/authService';
import { storeService } from './services/storeService';
import { cookieService } from './services/cookieService';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || 'dashboard';
  });
  const [user, setUser] = useState(null);
  // ✅ FIXED: Only show loading screen for initial auth check
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  
  const [stores, setStores] = useState([]);
  const [cookies, setCookies] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [stats, setStats] = useState({
    totalStores: 0,
    totalCookies: 0,
    activeSessions: 0,
    systemStatus: 'Online'
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        const userData = JSON.parse(userStr);
        setUser({
          username: userData.username,
          email: userData.email,
          id: userData.id,
          token: token
        });
        // ✅ Set loading false immediately for logged in users
        setIsLoading(false);
        // ✅ Fetch data in background
        fetchInitialData();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setIsFetchingData(true);
      
      const storesData = await storeService.getAll();
      setStores(storesData || []);
      
      let cookiesData = [];
      try {
        const allCookies = await cookieService.getAll();
        
        const uniqueByKey = new Map();
        allCookies.forEach(cookie => {
          const storeIdStr = typeof cookie.storeId === 'object' 
            ? cookie.storeId._id 
            : cookie.storeId;
          const key = `${storeIdStr}_${cookie.name}_${cookie.domain}`;
          if (!uniqueByKey.has(key)) {
            uniqueByKey.set(key, cookie);
          }
        });
        
        cookiesData = Array.from(uniqueByKey.values());
        setCookies(cookiesData);
        
      } catch (err) {
        console.error('Error fetching cookies:', err);
      }
      
      // ✅ FIXED: Change from s.isActive to s.status === 'active'
      setStats({
        totalStores: storesData?.length || 0,
        totalCookies: cookiesData.length,
        activeSessions: storesData?.filter(s => s.status === 'active')?.length || 0,
        systemStatus: 'Online'
      });
      
      setIsFetchingData(false);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setIsFetchingData(false);
    }
  };

  const handleLogin = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        const userData = JSON.parse(userStr);
        setUser({
          username: userData.username,
          email: userData.email,
          id: userData.id,
          token: token
        });
        await fetchInitialData();
      }
    } catch (error) {
      console.error('Error in handleLogin:', error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentPage('dashboard');
    localStorage.removeItem('currentPage');
    setStores([]);
    setCookies([]);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navigateToPage = (page) => {
    setCurrentPage(page);
  };

  const refreshData = async () => {
    await fetchInitialData();
  };

  // ✅ Only show loading for initial auth check (very fast)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 16px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  // ✅ Show app immediately, data fetches in background
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          isOpen={sidebarOpen}
          currentPage={currentPage}
          onNavigate={navigateToPage}
        />

        <TopBar
          onToggleSidebar={toggleSidebar}
          username={user.username}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
        />

        <main
          className="transition-all duration-300 pt-16"
          style={{ marginLeft: sidebarOpen ? '240px' : '0' }}
        >
          <div className="p-6">
            {/* ✅ Optional: Show loading indicator in corner while fetching */}
            {isFetchingData && (
              <div className="fixed top-20 right-6 bg-white px-4 py-2 rounded-lg shadow-md border border-gray-200 flex items-center gap-2 z-50">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600">Refreshing data...</span>
              </div>
            )}
            
            <div 
              key={currentPage}
              className="animate-fadeIn"
            >
              {currentPage === 'dashboard' && (
                <Dashboard stats={stats} onNavigate={navigateToPage} />
              )}
              
              {currentPage === 'stores' && (
                <StoreList
                  stores={stores}
                  onRefresh={refreshData}
                />
              )}
              
              {currentPage === 'cookies' && (
                <CookieList
                  cookies={cookies}
                  stores={stores}
                  selectedStore={selectedStore}
                  setSelectedStore={setSelectedStore}
                  onRefresh={refreshData}
                />
              )}
              
              {currentPage === 'settings' && (
                <SettingsPage />
              )}
            </div>
          </div>

          <AppFooter />
        </main>
      </div>
    </>
  );
}

export default App;