import React, { useState, useEffect } from 'react';
import { Settings, Download, Info, AlertTriangle, Trash2, Loader, BarChart3, Database, Package, Cookie, Activity, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { storeService } from '../../services/storeService';
import { cookieService } from '../../services/cookieService';

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalStores: 0,
    totalCookies: 0,
    validCookies: 0,
    expiredCookies: 0,
    activeSessions: 0
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Fetch all stores
      const stores = await storeService.getAll();
      
      // Fetch all cookies
      let allCookies = [];
      try {
        allCookies = await cookieService.getAll();
      } catch (err) {
        console.log('Cookie service getAll not available');
      }
      
      // Calculate stats
      const validCookies = allCookies.filter(c => c.isValid !== false).length;
      const expiredCookies = allCookies.filter(c => c.isValid === false).length;
      const activeSessions = stores.filter(s => s.isActive).length;
      
      setStats({
        totalStores: stores?.length || 0,
        totalCookies: allCookies?.length || 0,
        validCookies,
        expiredCookies,
        activeSessions
      });
      
      console.log('📊 Stats loaded:', {
        totalStores: stores?.length || 0,
        totalCookies: allCookies?.length || 0,
        validCookies,
        expiredCookies,
        activeSessions
      });
      
    } catch (error) {
      console.error('Failed to load statistics:', error);
      toast.error('Gagal memuat statistik');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      setExportLoading(true);
      const loadingToast = toast.loading('📦 Mengekspor database...');
      
      // Fetch all data
      const stores = await storeService.getAll();
      const allCookies = await cookieService.getAll();
      
      // Group cookies by store
      const cookiesByStore = {};
      allCookies.forEach(cookie => {
        const storeId = cookie.storeId || cookie.store;
        if (!cookiesByStore[storeId]) {
          cookiesByStore[storeId] = [];
        }
        cookiesByStore[storeId].push(cookie);
      });
      
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        application: 'Cookie Manager',
        database: 'MongoDB',
        statistics: stats,
        stores: stores.map(store => ({
          id: store._id,
          name: store.name,
          url: store.url,
          isActive: store.isActive,
          cookieCount: cookiesByStore[store._id]?.length || 0
        })),
        cookies: allCookies.map(cookie => ({
          id: cookie._id,
          storeId: cookie.storeId || cookie.store,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          isValid: cookie.isValid,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite
        }))
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `cookie-manager-backup-${timestamp}.json`;
      
      link.click();
      URL.revokeObjectURL(url);
      
      toast.dismiss(loadingToast);
      toast.success('✅ Database berhasil diekspor!');
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ Gagal ekspor: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearAllCookies = async () => {
    const confirm1 = window.confirm(
      '⚠️ PERINGATAN!\n\n' +
      'Ini akan menghapus SEMUA COOKIES dari database.\n' +
      'Stores akan tetap ada.\n\n' +
      'Lanjutkan?'
    );
    
    if (!confirm1) return;
    
    try {
      setDeleteLoading(true);
      const loadingToast = toast.loading('🗑️ Menghapus semua cookies...');
      
      const allCookies = await cookieService.getAll();
      
      for (const cookie of allCookies) {
        try {
          await cookieService.delete(cookie._id);
        } catch (err) {
          console.error('Failed to delete cookie:', err);
        }
      }
      
      toast.dismiss(loadingToast);
      toast.success(`✅ ${allCookies.length} cookies berhasil dihapus!`);
      
      // Refresh statistics
      await loadStatistics();
      
    } catch (error) {
      console.error('Delete cookies error:', error);
      toast.error('❌ Gagal menghapus cookies: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClearAllData = async () => {
    const confirm1 = window.confirm(
      '🚨 PERINGATAN KERAS!\n\n' +
      'Ini akan menghapus:\n' +
      '- Semua Stores\n' +
      '- Semua Cookies\n' +
      '- Semua Data Permanen\n\n' +
      'DATA TIDAK DAPAT DIKEMBALIKAN!\n\n' +
      'Lanjutkan?'
    );
    
    if (!confirm1) return;
    
    const confirm2 = window.confirm(
      '⚠️ KONFIRMASI TERAKHIR!\n\n' +
      'Apakah Anda YAKIN ingin menghapus SEMUA DATA?\n\n' +
      'Klik OK untuk melanjutkan.'
    );
    
    if (!confirm2) return;
    
    try {
      setDeleteLoading(true);
      const loadingToast = toast.loading('🗑️ Menghapus semua data...');
      
      // Delete all stores (will cascade delete cookies if backend supports it)
      const stores = await storeService.getAll();
      
      for (const store of stores) {
        try {
          await storeService.delete(store._id);
        } catch (err) {
          console.error('Failed to delete store:', err);
        }
      }
      
      // Delete remaining cookies (if any)
      try {
        const remainingCookies = await cookieService.getAll();
        for (const cookie of remainingCookies) {
          await cookieService.delete(cookie._id);
        }
      } catch (err) {
        console.log('No remaining cookies to delete');
      }
      
      toast.dismiss(loadingToast);
      toast.success('✅ Semua data berhasil dihapus!');
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Delete all data error:', error);
      toast.error('❌ Gagal menghapus data: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center py-12">
          <Loader size={32} className="animate-spin text-[#018790] mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  // Stats cards matching Dashboard exactly
  const statsCards = [
    {
      id: 'stores',
      label: 'Total Stores',
      value: stats.totalStores,
      icon: Package,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      id: 'cookies',
      label: 'Total Cookies',
      value: stats.totalCookies,
      icon: Cookie,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      id: 'valid',
      label: 'Valid Cookies',
      value: stats.validCookies,
      icon: CheckCircle,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      id: 'expired',
      label: 'Expired Cookies',
      value: stats.expiredCookies,
      icon: Activity,
      bgColor: 'bg-red-100',
      textColor: 'text-red-600'
    }
  ];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#018790]/10 rounded-lg">
            <Settings className="text-[#018790]" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Pengaturan</h2>
            <p className="text-sm text-gray-500">Kelola aplikasi Cookie Manager</p>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard - MATCHING DASHBOARD STYLE */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-[#018790]" />
          Statistik Database
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={stat.textColor} size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Database Management */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Database size={20} className="text-[#018790]" />
          Database Management
        </h3>
        
        <div className="space-y-3">
          <button
            onClick={handleExportDatabase}
            disabled={exportLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#018790] text-white rounded-lg text-sm font-medium hover:bg-[#016670] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <Download size={18} />
                Export Database ke JSON
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 flex items-start gap-1">
            <span className="mt-0.5">💡</span>
            <span>Backup mencakup semua stores dan cookies dalam format JSON</span>
          </p>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 shadow-sm mb-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Info size={20} className="text-[#018790]" />
          Informasi Sistem
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Aplikasi</span>
            <span className="text-sm font-semibold text-gray-800">Cookie Manager</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Versi</span>
            <span className="text-sm font-mono font-semibold text-gray-800">v1.0.0</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Database</span>
            <span className="text-sm font-semibold text-[#018790]">MongoDB Atlas</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Runtime</span>
            <span className="text-sm font-mono font-semibold text-gray-800">Node.js v24.11.1</span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600">Backend API</span>
            <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-1 rounded">
              {import.meta.env.VITE_API_URL || 'localhost:5000'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-red-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} />
            Danger Zone
          </h3>
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline transition-colors"
          >
            {showDangerZone ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>

        {showDangerZone && (
          <div className="space-y-4 pt-4 border-t border-red-200">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 font-medium mb-3">
                ⚠️ Peringatan: Tindakan di bawah ini tidak dapat dibatalkan!
              </p>
              
              {/* Clear All Cookies */}
              <div className="mb-4">
                <button
                  onClick={handleClearAllCookies}
                  disabled={deleteLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Hapus Semua Cookies
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-600 mt-2">
                  Menghapus semua cookies dari database. Stores tetap ada.
                </p>
              </div>
              
              {/* Clear All Data */}
              <div>
                <button
                  onClick={handleClearAllData}
                  disabled={deleteLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Hapus Semua Data (Stores + Cookies)
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-600 mt-2">
                  Menghapus semua stores dan cookies. Data tidak dapat dikembalikan.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;