import { useState } from 'react';
import { Plus, AlertTriangle, X, Edit2, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import StoreForm from './StoreForm';
import { storeService } from '../../services/storeService';

const StoreList = ({ stores = [], setStores, loading, onRefresh }) => {
  const [loadingGenerate, setLoadingGenerate] = useState({});
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);

  // Handle edit store
  const handleEdit = (store) => {
    setEditingStore(store);
    setShowStoreForm(true);
  };

  // Handle delete store - show confirmation modal
  const handleDeleteClick = (store) => {
    setStoreToDelete(store);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!storeToDelete) return;

    try {
      // ✅ FIXED: Use storeService instead of manual fetch
      await storeService.delete(storeToDelete._id);
      toast.success(`Toko "${storeToDelete.name}" berhasil dihapus!`);
      setShowDeleteModal(false);
      setStoreToDelete(null);
      onRefresh?.();
    } catch (error) {
      console.error('Delete error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Gagal menghapus toko';
      toast.error(`Gagal menghapus toko: ${errorMsg}`);
    }
  };

  // Handle form submit
  const handleFormSubmit = () => {
    setShowStoreForm(false);
    setEditingStore(null);
    onRefresh?.();
  };

  // Handle generate cookies
  const handleGenerate = async (storeId) => {
    try {
      setLoadingGenerate(prev => ({ ...prev, [storeId]: true }));

      // ✅ FIXED: Use storeService instead of manual fetch
      const checkData = await storeService.hasCredentials(storeId);
      console.log('📋 Credentials check:', checkData);

      if (checkData.hasCredentials) {
        // ✅ Auto-generate with existing credentials
        const loadingToast = toast.loading('Auto generating cookies...');
        
        const data = await storeService.generateCookies(storeId);
        toast.dismiss(loadingToast);

        if (data.success) {
          toast.success(`Berhasil generate ${data.cookiesCount} cookies!`);
          await onRefresh?.();
        } else {
          toast.error(data.message || 'Gagal generate cookies');
        }
      } else {
        // ✅ Show modal to input credentials (first time)
        console.log('🔐 No credentials found, showing modal');
        const store = stores.find(s => s._id === storeId);
        setSelectedStore(store);
        setShowCredentialModal(true);
      }
    } catch (error) {
      console.error('Generate error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan';
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoadingGenerate(prev => ({ ...prev, [storeId]: false }));
    }
  };

  // Handle credential modal submit
  const handleCredentialSubmit = async () => {
    if (!credentials.email || !credentials.password) {
      toast.error('Email dan password harus diisi!');
      return;
    }

    try {
      const loadingToast = toast.loading('Generating cookies...');
      
      // ✅ FIXED: Use storeService instead of manual fetch
      const data = await storeService.generateCookies(
        selectedStore._id,
        credentials.email,
        credentials.password
      );
      
      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`Berhasil generate ${data.cookiesCount} cookies! Credentials telah disimpan.`);
        setShowCredentialModal(false);
        setCredentials({ email: '', password: '' });
        setSelectedStore(null);
        
        // ✅ PENTING: Refresh stores untuk update status & cookie count
        await onRefresh?.();
      } else {
        toast.error(data.message || 'Gagal generate cookies');
      }
    } catch (error) {
      console.error('Generate error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan';
      toast.error(`Error: ${errorMsg}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-gray-500 mt-2">Loading stores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Daftar Toko</h2>
        <button
          onClick={() => {
            setEditingStore(null);
            setShowStoreForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Tambah Toko
        </button>
      </div>

      {/* Store List */}
      {!stores || stores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">Belum ada toko. Tambahkan toko pertama Anda!</p>
          <button
            onClick={() => {
              setEditingStore(null);
              setShowStoreForm(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Tambah Toko Pertama
          </button>
        </div>
      ) : (
        stores.map((store) => (
          <div key={store._id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{store.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{store.domain}</p>
                <div className="flex gap-4 mt-2">
                  <p className="text-xs text-gray-500">
                    Status: <span className={store.status === 'active' ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {store.status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Cookies: <span className="font-medium text-blue-600">{store.cookies?.length || 0}</span>
                  </p>
                </div>
                {store.lastCookieUpdate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last update: {new Date(store.lastCookieUpdate).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(store._id)}
                  disabled={loadingGenerate[store._id]}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {loadingGenerate[store._id] ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Auto Generate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleEdit(store)}
                  className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  title="Edit Toko"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(store)}
                  className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  title="Hapus Toko"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Credential Input Modal */}
      {showCredentialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Credentials untuk {selectedStore?.name}
              </h3>
              <button
                onClick={() => {
                  setShowCredentialModal(false);
                  setCredentials({ email: '', password: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-email@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleCredentialSubmit()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && handleCredentialSubmit()}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCredentialModal(false);
                  setCredentials({ email: '', password: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCredentialSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
              >
                Generate Cookies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && storeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Hapus Toko
                </h3>
                <p className="text-sm text-gray-600">
                  Apakah Anda yakin ingin menghapus toko <strong>"{storeToDelete.name}"</strong>? 
                  Tindakan ini tidak dapat dibatalkan dan semua cookies terkait akan ikut terhapus.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setStoreToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors"
              >
                Ya, Hapus Toko
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Form Modal */}
      {showStoreForm && (
        <StoreForm
          store={editingStore}
          onClose={() => {
            setShowStoreForm(false);
            setEditingStore(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
};

export default StoreList;