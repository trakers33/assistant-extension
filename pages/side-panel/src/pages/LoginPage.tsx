import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { GOOGLE_CLIENT_ID } from '@extension/env';
import { SupabaseSession, supabaseSessionStorage } from '@extension/storage';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const saveSessionToCache = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            await supabaseSessionStorage.set(data.session as SupabaseSession);
        }
    };

    const handleClassicLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
            await saveSessionToCache();
        } else {
            setError(error.message);
        }
        setLoading(false);
    };

    const loginWithGoogleChrome = async () => {
        const manifest = chrome.runtime.getManifest();
        const url = new URL('https://accounts.google.com/o/oauth2/auth');
        console.log('GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID);
        url.searchParams.set('client_id', manifest.oauth2?.client_id || '');
        url.searchParams.set('response_type', 'id_token');
        url.searchParams.set('access_type', 'offline');
        url.searchParams.set('redirect_uri', `https://${chrome.runtime.id}.chromiumapp.org`);
        url.searchParams.set('scope', manifest.oauth2?.scopes?.join(' ') || '');
        console.log('redirect_uri', `https://${chrome.runtime.id}.chromiumapp.org`);
        console.log('url', url.href);
        chrome.identity.launchWebAuthFlow(
            {
                url: url.href,
                interactive: true,
            },
            async (redirectedTo?: string) => {
                if (chrome.runtime.lastError || !redirectedTo) {
                    // auth was not successful
                    return;
                }
                // auth was successful, extract the ID token from the redirectedTo URL
                const url = new URL(redirectedTo);
                const params = new URLSearchParams(url.hash.replace('#', ''));
                const idToken = params.get('id_token');
                console.log('idToken', idToken);
                if (idToken) {
                    try {
                        const { data, error } = await supabase.auth.signInWithIdToken({
                            provider: 'google',
                            token: idToken,
                        });
                        if (!error) {
                            await saveSessionToCache();
                        } else {
                            console.error('Error signing in with ID token', error);
                        }
                    } catch (error) {
                        console.error('Error signing in with ID token', error);
                    }
                }
            },
        );
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <h2 className="text-2xl font-semibold mb-4">Sign in to continue</h2>
            <button
                onClick={loginWithGoogleChrome}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
                disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>
            <form onSubmit={handleClassicLogin} className="w-full max-w-xs flex flex-col gap-2">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="border px-3 py-2 rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="border px-3 py-2 rounded"
                    required
                />
                <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded mt-2" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>
            </form>
            {error && <div className="text-red-600 mt-4">{error}</div>}
        </div>
    );
};
