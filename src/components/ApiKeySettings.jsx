import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ApiKeySettings = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('Figma Plugin Key');
  const [showNewKey, setShowNewKey] = useState(null);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const generateApiKey = async () => {
    if (!user) {
      alert('Please sign in to generate an API key');
      return;
    }
    
    setIsGenerating(true);
    try {
      console.log('Generating API key for user:', user.id);
      console.log('User object:', user);
      console.log('Supabase auth user:', await supabase.auth.getUser());
      
      // Generate API key client-side
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const base64Key = btoa(String.fromCharCode(...randomBytes))
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/=/g, '');
      const newApiKey = `frag_${base64Key}`;

      console.log('Generated API key:', newApiKey.substring(0, 10) + '...');
      console.log('Insert payload:', {
        user_id: user.id,
        api_key: newApiKey,
        name: newKeyName
      });

      // Insert directly into user_api_keys table using RPC function to bypass RLS
      const { data, error } = await supabase.rpc('create_api_key', {
        p_api_key: newApiKey,
        p_name: newKeyName
      });

      console.log('Insert response - data:', data, 'error:', error);

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('API key inserted successfully:', data);
      // The RPC function returns the key ID, but we use our generated key
      setShowNewKey(newApiKey);
      setNewKeyName('Figma Plugin Key');
      await fetchApiKeys();
    } catch (error) {
      console.error('Error generating API key:', error);
      alert('Failed to generate API key: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteApiKey = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key: ' + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="bg-[#0f1419] rounded-lg p-6">
        <p className="text-gray-400">Please sign in to manage API keys.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1419] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">API Keys</h2>
          <p className="text-gray-400 text-sm">
            Generate API keys to authenticate your Figma plugin with your token library.
          </p>
        </div>
      </div>

      {/* Generate New Key */}
      <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-3">Generate New API Key</h3>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Figma Plugin Key)"
            className="flex-1 px-3 py-2 bg-[#0f1419] border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#3ecf8e]"
          />
          <button
            onClick={generateApiKey}
            disabled={isGenerating || !newKeyName.trim()}
            className="px-4 py-2 bg-[#3ecf8e] text-black font-medium rounded-md hover:bg-[#2db574] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Key'}
          </button>
        </div>
      </div>

      {/* Show newly generated key */}
      {showNewKey && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
          <h3 className="text-lg font-medium text-green-400 mb-2">New API Key Generated</h3>
          <p className="text-sm text-green-300 mb-3">
            Copy this key now - you won't be able to see it again!
          </p>
          <div className="flex items-center gap-2 p-3 bg-[#0f1419] rounded border border-green-600">
            <code className="flex-1 text-green-400 font-mono text-sm break-all">
              {showNewKey}
            </code>
            <button
              onClick={() => copyToClipboard(showNewKey)}
              className="px-3 py-1 bg-green-700 text-white text-sm rounded hover:bg-green-600"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setShowNewKey(null)}
            className="mt-3 text-sm text-green-400 hover:text-green-300"
          >
            I've copied the key, hide it
          </button>
        </div>
      )}

      {/* Existing API Keys */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Your API Keys</h3>
        {apiKeys.length === 0 ? (
          <p className="text-gray-400 text-sm">No API keys generated yet.</p>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="p-4 bg-[#1a1a1a] rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{key.name}</h4>
                    <div className="text-sm text-gray-400 mt-1">
                      <span>Created: {formatDate(key.created_at)}</span>
                      {key.last_used_at && (
                        <span className="ml-4">
                          Last used: {formatDate(key.last_used_at)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <code className="bg-[#0f1419] px-2 py-1 rounded">
                        {key.api_key.substring(0, 12)}...{key.api_key.substring(key.api_key.length - 4)}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      key.is_active 
                        ? 'bg-green-900/30 text-green-400 border border-green-700' 
                        : 'bg-red-900/30 text-red-400 border border-red-700'
                    }`}>
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="px-3 py-1 bg-red-900/30 text-red-400 border border-red-700 rounded hover:bg-red-900/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <h3 className="text-lg font-medium text-blue-400 mb-2">How to use your API key</h3>
        <ol className="text-sm text-blue-300 space-y-1">
          <li>1. Copy your API key from above</li>
          <li>2. Open the Fragmento Sync plugin in Figma</li>
          <li>3. Paste your API key in the Authentication section</li>
          <li>4. Click "Save Key" to authenticate</li>
          <li>5. You can now fetch and push tokens securely</li>
        </ol>
      </div>
    </div>
  );
};

export default ApiKeySettings;
