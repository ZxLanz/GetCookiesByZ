import React, { useState, useEffect } from 'react';
import { Trash2, Loader, Copy, Check, Download, Upload, Heart, CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { cookieService } from '../../services/cookieService';
import { parseAnyCookieFormat, convertToCookieString } from '../../utils/cookieParser';

function CookieList({ stores, selectedStore, setSelectedStore }) {
  const [cookies, setCookies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importFormat, setImportFormat] = useState('cookie-string');
  const [exportFormat, setExportFormat] = useState('cookie-string');
  const [copiedId, setCopiedId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cookieToDelete, setCookieToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  useEffect(() => {
    if (selectedStore) {
      fetchCookies(selectedStore);
    } else {
      setCookies([]);
    }
  }, [selectedStore]);

  const fetchCookies = async (storeId) => {
    try {
      setLoading(true);
      const data = await cookieService.getByStore(storeId);
      setCookies(data);
    } catch (error) {
      console.error('Fetch cookies error:', error);
      toast.error('Gagal memuat cookies: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    if (!selectedStore) {
      toast.error('Pilih toko terlebih dahulu!');
      return;
    }

    if (cookies.length === 0) {
      toast.error('Tidak ada cookies untuk dicek!');
      return;
    }

    setHealthCheckLoading(true);
    const loadingToast = toast.loading('🔍 Mengecek kesehatan cookies...');

    try {
      const result = await cookieService.healthCheck(selectedStore);
      
      if (result.success && result.data) {
        await fetchCookies(selectedStore);
        
        const { validCookies, expiredCookies, totalCookies } = result.data;
        toast.success(
          `✅ Health check selesai!\n🟢 ${validCookies} valid • 🔴 ${expiredCookies} expired (dari ${totalCookies} cookies)`,
          { duration: 5000, id: loadingToast }
        );
      } else {
        toast.error(result.message || 'Gagal mengecek health cookies', { id: loadingToast });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan saat health check';
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setHealthCheckLoading(false);
    }
  };

  const handleImportCookies = async () => {
    if (!selectedStore) {
      toast.error('Pilih toko terlebih dahulu!');
      return;
    }

    if (!importInput.trim()) {
      toast.error('Input tidak boleh kosong!');
      return;
    }

    try {
      let parsedCookies;

      const selectedStoreData = stores.find(s => s._id === selectedStore);
      const defaultDomain = selectedStoreData?.domain || '.kasirpintar.co.id';

      if (importFormat === 'cookie-string') {
        parsedCookies = parseAnyCookieFormat(importInput, defaultDomain);
      } else {
        parsedCookies = JSON.parse(importInput);
        if (!Array.isArray(parsedCookies)) {
          toast.error('Format JSON harus berupa array!');
          return;
        }
      }

      if (parsedCookies.length === 0) {
        toast.error('Tidak ada cookies yang valid untuk diimport!');
        return;
      }

      const loadingToast = toast.loading(`Mengimport ${parsedCookies.length} cookies...`);
      await cookieService.importCookies(selectedStore, parsedCookies);
      await fetchCookies(selectedStore);
      setImportInput('');
      setShowImportModal(false);
      toast.dismiss(loadingToast);
      toast.success(`${parsedCookies.length} cookies berhasil diimport!`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Format tidak valid! Pastikan format sesuai dengan pilihan.');
      } else {
        toast.error(error.message || 'Gagal import cookies');
      }
    }
  };

  const handleExportCookies = () => {
    if (cookies.length === 0) {
      toast.error('Tidak ada cookies untuk diekspor!');
      return;
    }

    try {
      let dataStr;
      let fileName;
      const storeName = stores.find(s => s._id === selectedStore)?.name || 'unknown';
      const timestamp = Date.now();

      if (exportFormat === 'cookie-string') {
        dataStr = cookies
          .map(cookie => `${cookie.name}=${cookie.value}`)
          .join('; ');
        
        fileName = `cookies-${storeName}-${timestamp}.txt`;
      } else {
        dataStr = JSON.stringify(cookies, null, 2);
        fileName = `cookies-json-${storeName}-${timestamp}.json`;
      }

      const dataBlob = new Blob([dataStr], { 
        type: exportFormat === 'cookie-string' ? 'text/plain' : 'application/json' 
      });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${cookies.length} cookies berhasil diekspor sebagai ${exportFormat === 'cookie-string' ? 'Cookie String' : 'JSON'}!`);
    } catch (error) {
      toast.error('Gagal export cookies: ' + error.message);
    }
  };

  const handleCopyCookie = (value, id) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    toast.success('Cookie value berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteCookie = (cookie) => {
    setCookieToDelete(cookie);
    setShowDeleteModal(true);
  };

  const confirmDeleteCookie = async () => {
    if (!cookieToDelete) return;

    try {
      const loadingToast = toast.loading('Menghapus cookie...');
      await cookieService.delete(cookieToDelete._id);
      await fetchCookies(selectedStore);
      setShowDeleteModal(false);
      setCookieToDelete(null);
      toast.dismiss(loadingToast);
      toast.success(`Cookie "${cookieToDelete.name}" berhasil dihapus!`);
    } catch (error) {
      toast.error('Gagal menghapus cookie: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteAllCookies = () => {
    if (!selectedStore) {
      toast.error('Pilih toko terlebih dahulu!');
      return;
    }

    if (cookies.length === 0) {
      toast.error('Tidak ada cookies untuk dihapus!');
      return;
    }

    setShowDeleteAllModal(true);
  };

  const confirmDeleteAllCookies = async () => {
    try {
      const loadingToast = toast.loading('Menghapus semua cookies...');
      await cookieService.deleteAll(selectedStore);
      await fetchCookies(selectedStore);
      setShowDeleteAllModal(false);
      toast.dismiss(loadingToast);
      toast.success('Semua cookies berhasil dihapus!');
    } catch (error) {
      toast.error('Gagal menghapus cookies: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatExpiry = (expirationDate) => {
    if (!expirationDate) return '-';
    
    let date;
    
    if (typeof expirationDate === 'number') {
      date = new Date(expirationDate * 1000);
    } else if (expirationDate instanceof Date) {
      date = expirationDate;
    } else if (typeof expirationDate === 'string') {
      date = new Date(expirationDate);
    } else {
      return '-';
    }
    
    if (isNaN(date.getTime())) {
      return <span className="text-gray-400">Invalid Date</span>;
    }
    
    const now = new Date();
    const isExpired = date < now;
    
    return (
      <span className={isExpired ? 'text-error' : 'text-success'}>
        {formatDate(date)}
        {isExpired && ' (Expired)'}
      </span>
    );
  };

  const renderHealthBadge = (cookie) => {
    if (cookie.isValid === undefined) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
          <Clock size={10} />
          Unknown
        </span>
      );
    }

    if (cookie.isValid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-green-100 text-green-700">
          <CheckCircle2 size={10} />
          Valid
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-red-100 text-red-700">
        <XCircle size={10} />
        Expired
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-primary mb-2">Kelola Cookies</h2>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Pilih Toko</option>
            {stores.map(store => (
              <option key={store._id} value={store._id}>{store.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleHealthCheck}
            disabled={!selectedStore || cookies.length === 0 || healthCheckLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
              selectedStore && cookies.length > 0 && !healthCheckLoading
                ? 'bg-[#6b0504] text-white hover:bg-[#8b0605] hover:shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {healthCheckLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Heart size={16} />
                Check Health
              </>
            )}
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            disabled={!selectedStore}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
              selectedStore
                ? 'bg-[#a0ddff] text-gray-800 hover:bg-[#8dcbff] hover:shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Upload size={16} />
            Import
          </button>

          <button
            onClick={handleExportCookies}
            disabled={!selectedStore || cookies.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
              selectedStore && cookies.length > 0
                ? 'bg-[#5da399] text-white hover:bg-[#4d8c82] hover:shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Download size={16} />
            Export
          </button>

          <button
            onClick={handleDeleteAllCookies}
            disabled={!selectedStore || cookies.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
              selectedStore && cookies.length > 0
                ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Trash2 size={16} />
            Hapus Semua
          </button>
        </div>
      </div>

      {healthCheckLoading && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center gap-3">
            <Loader size={20} className="text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                🔍 Mengecek kesehatan cookies...
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Proses ini memakan waktu ~0.5 detik per cookie
              </p>
            </div>
          </div>
        </div>
      )}

      {!selectedStore ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">Pilih toko untuk melihat cookies</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <Loader size={32} className="animate-spin text-accent mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading cookies...</p>
        </div>
      ) : cookies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">Belum ada cookies. Import cookies untuk memulai!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-3 py-3 text-left text-primary font-semibold">Name</th>
                <th className="px-3 py-3 text-left text-primary font-semibold">Value</th>
                <th className="px-3 py-3 text-left text-primary font-semibold">Domain</th>
                <th className="px-3 py-3 text-left text-primary font-semibold">Expires</th>
                <th className="px-3 py-3 text-center text-primary font-semibold">Status</th>
                <th className="px-3 py-3 text-left text-primary font-semibold">Created At</th>
                <th className="px-3 py-3 text-left text-primary font-semibold">Last Update</th>
                <th className="px-3 py-3 text-center text-primary font-semibold">Flags</th>
                <th className="px-3 py-3 text-center text-primary font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cookies.map(cookie => (
                <tr key={cookie._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-3 text-primary font-mono">{cookie.name}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-gray-100 rounded text-xs max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap inline-block">
                        {cookie.value}
                      </code>
                      <button
                        onClick={() => handleCopyCookie(cookie.value, cookie._id)}
                        className={`p-1 transition-colors ${
                          copiedId === cookie._id ? 'text-success' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Copy value"
                      >
                        {copiedId === cookie._id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{cookie.domain}</td>
                  <td className="px-3 py-3">{formatExpiry(cookie.expirationDate)}</td>
                  <td className="px-3 py-3 text-center">
                    {renderHealthBadge(cookie)}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    <span className="text-[10px]">📅 {formatDate(cookie.createdAt)}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    <span className="text-[10px]">🔄 {formatDate(cookie.updatedAt)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {cookie.httpOnly && (
                        <span className="px-1.5 py-0.5 bg-accent text-white rounded text-[10px]">HTTP</span>
                      )}
                      {cookie.secure && (
                        <span className="px-1.5 py-0.5 bg-success text-white rounded text-[10px]">Secure</span>
                      )}
                      {cookie.sameSite && (
                        <span className="px-1.5 py-0.5 bg-warning text-white rounded text-[10px]">{cookie.sameSite}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleDeleteCookie(cookie)}
                      className="p-1.5 bg-error text-white rounded hover:bg-red-700 transition-colors"
                      title="Delete cookie"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CookieList;