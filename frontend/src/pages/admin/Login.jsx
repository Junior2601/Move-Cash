import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [form, setForm] = useState({ 
    email: '', 
    password: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const onChange = (e) => {
    setForm(prev => ({ 
      ...prev, 
      [e.target.name]: e.target.value 
    }));
    // Effacer l'erreur quand l'utilisateur tape
    if (error) setError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Validation basique
    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await login(form.email, form.password);
      // La redirection se fera via le useEffect si user change
    } catch (err) {
      console.error('Erreur détaillée:', err);
      setError(
        err?.response?.data?.message || 
        err?.message || 
        'Erreur de connexion. Vérifiez vos identifiants.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Si déjà connecté, ne pas afficher le formulaire
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-50 to-white">
      <div className="w-[420px] p-8 bg-white rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <LogIn className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-semibold">Connexion administrateur</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input 
              name="email" 
              value={form.email} 
              onChange={onChange}
              placeholder="Email" 
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          <div>
            <input 
              name="password" 
              value={form.password} 
              onChange={onChange}
              placeholder="Mot de passe" 
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}