import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { storeService } from '../../services/storeService';

function StoreForm({ store, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        domain: store.domain || '',
        status: store.status || 'active'
      });
    }
  }, [store]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama toko harus diisi';
    }

    if (!formData.domain.trim()) {
      newErrors.domain = 'Domain harus diisi';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/.test(formData.domain.trim())) {
      newErrors.domain = 'Format domain tidak valid (contoh: example.com)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Periksa kembali form input!');
      return;
    }

    try {
      setLoading(true);
      
      // ✅ FIXED: Use storeService instead of manual fetch
      if (store) {
        await storeService.update(store._id, formData);
      } else {
        await storeService.create(formData);
      }

      toast.success(`Toko "${formData.name}" berhasil ${store ? 'diperbarui' : 'ditambahkan'}!`);
      onSubmit();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Gagal menyimpan toko';
      toast.error(`Gagal menyimpan toko: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold text-gray-800">
            {store ? 'Edit Toko' : 'Tambah Toko Baru'}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nama Toko */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Toko <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Contoh: RL BANDUNG"
              className={`w-full px-4 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <span>⚠️</span> {errors.name}
              </p>
            )}
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              placeholder="Contoh: id.kasirpintar.co.id"
              className={`w-full px-4 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.domain ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.domain && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <span>⚠️</span> {errors.domain}
              </p>
            )}
            {!errors.domain && (
              <p className="mt-1 text-xs text-gray-500">
                Contoh: example.com atau subdomain.example.com
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                store ? 'Perbarui Toko' : 'Tambah Toko'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoreForm;