import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-50 to-white">
      <div className="w-[420px] p-8 bg-white rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <LogIn className="w-8 h-8" />
          <h1 className="text-2xl font-semibold">Connexion administrateur</h1>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <input name="email" value={form.email} onChange={onChange}
            placeholder="Email" className="w-full px-4 py-3 border rounded-lg" />
          <input name="password" value={form.password} onChange={onChange}
            placeholder="Mot de passe" type="password" className="w-full px-4 py-3 border rounded-lg" />

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-60">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}