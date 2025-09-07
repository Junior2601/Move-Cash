import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/auth.service';
import { Lock } from 'lucide-react';

export default function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLogin({ email, password });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 rounded">
            <Lock />
          </div>
          <h1 className="text-2xl font-semibold">Admin — Connexion</h1>
        </div>

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm">Email</label>
            <input required value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded" placeholder="admin@exemple.com" />
          </div>
          <div>
            <label className="block text-sm">Mot de passe</label>
            <input required type="password" value={password} onChange={e=>setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded" placeholder="••••••••" />
          </div>
          <button disabled={loading}
            className="w-full py-2 rounded bg-indigo-600 text-white font-medium">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
