import { useState, useEffect } from 'react';
import { Users, Shield, ShieldOff, UserX, UserCheck, Trash2, AlertCircle } from 'lucide-react';
import { usersAPI } from '../../services/api';
import type { User } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Kullanıcılar alınamadı:', error);
      setError('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (userId: number) => {
    try {
      setError('');
      setSuccess('');
      const result = await usersAPI.toggleAdmin(userId);
      setSuccess(result.message);
      fetchUsers();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'İşlem başarısız');
      } else {
        setError('İşlem başarısız');
      }
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      setError('');
      setSuccess('');
      const result = await usersAPI.toggleActive(userId);
      setSuccess(result.message);
      fetchUsers();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'İşlem başarısız');
      } else {
        setError('İşlem başarısız');
      }
    }
  };

  const handleDelete = async (userId: number, username: string) => {
    if (!confirm(`"${username}" kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await usersAPI.delete(userId);
      setSuccess('Kullanıcı silindi');
      fetchUsers();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'Silme işlemi başarısız');
      } else {
        setError('Silme işlemi başarısız');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-dark-50 flex items-center gap-3">
          <Users className="w-8 h-8 text-primary-400" />
          Kullanıcı Yönetimi
        </h1>
        <p className="text-dark-400 mt-1">Sistem kullanıcılarını yönetin</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-accent-500/10 border border-accent-500/30 rounded-lg flex items-center gap-3 text-accent-400">
          <UserCheck className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-dark-400 text-sm">Toplam Kullanıcı</p>
          <p className="font-display text-2xl font-bold text-dark-50">{users.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-dark-400 text-sm">Admin Sayısı</p>
          <p className="font-display text-2xl font-bold text-primary-400">
            {users.filter(u => u.is_admin).length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-dark-400 text-sm">Aktif Kullanıcı</p>
          <p className="font-display text-2xl font-bold text-accent-400">
            {users.filter(u => u.is_active).length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-dark-400 text-sm">Pasif Kullanıcı</p>
          <p className="font-display text-2xl font-bold text-red-400">
            {users.filter(u => !u.is_active).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left p-4">Kullanıcı</th>
                <th className="text-left p-4">E-posta</th>
                <th className="text-center p-4">Rol</th>
                <th className="text-center p-4">Durum</th>
                <th className="text-left p-4">Kayıt Tarihi</th>
                <th className="text-center p-4">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.is_admin ? 'bg-primary-500/20' : 'bg-dark-700'
                      }`}>
                        {user.is_admin ? (
                          <Shield className="w-5 h-5 text-primary-400" />
                        ) : (
                          <Users className="w-5 h-5 text-dark-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-dark-100 font-medium">
                          {user.full_name || user.username}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-primary-400">(Siz)</span>
                          )}
                        </p>
                        <p className="text-dark-500 text-sm">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-dark-300">{user.email}</td>
                  <td className="p-4 text-center">
                    <span className={`badge ${user.is_admin ? 'badge-warning' : 'badge-info'}`}>
                      {user.is_admin ? 'Admin' : 'Kullanıcı'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                      {user.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-4 text-dark-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {user.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleToggleAdmin(user.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.is_admin
                                ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                                : 'bg-dark-700 text-dark-400 hover:bg-dark-600 hover:text-primary-400'
                            }`}
                            title={user.is_admin ? 'Admin yetkisini kaldır' : 'Admin yap'}
                          >
                            {user.is_admin ? (
                              <ShieldOff className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.is_active
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                : 'bg-accent-500/10 text-accent-400 hover:bg-accent-500/20'
                            }`}
                            title={user.is_active ? 'Devre dışı bırak' : 'Aktif et'}
                          >
                            {user.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Kullanıcıyı sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

