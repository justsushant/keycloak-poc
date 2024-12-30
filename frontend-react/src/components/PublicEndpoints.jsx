import React from 'react';
import './publicPage.css';
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: "https://192.168.0.104:8443/",
    realm: "test",
    clientId: "qwerty"
});


const PublicEndpoints = () => {
    const baseUrl = 'https://192.168.0.104:5000';

    const displayResult = (elementId, response, isError = false) => {
        const element = document.getElementById(elementId);
        element.classList.remove('error-message');
        if (isError) element.classList.add('error-message');
        element.textContent = isError
            ? `Error: ${JSON.stringify(response)}`
            : `Response: ${JSON.stringify(response)}`;
    };

    const makeRequest = async (endpoint, method, data = null) => {
        const url = `${baseUrl}${endpoint}`;
        const headers = { 'Content-Type': 'application/json' };

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : null,
            });
            const result = await response.json();
            if (!response.ok) throw result;
            return result;
        } catch (error) {
            throw error;
        }
    };

    const handlePing = async () => {
        try {
            const response = await makeRequest('/public/ping', 'GET');
            displayResult('pingResult', response);
        } catch (error) {
            displayResult('pingResult', error, true);
        }
    };

    function generateCodeVerifier() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    async function generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }


    async function getKeycloakLoginPageURL() {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const clientId = 'qwerty';
        const redirectUri = 'https://192.168.0.104:3000/play';
        const scope = 'openid';
        const loginPageUrl = `https://192.168.0.104:8443/realms/test/protocol/openid-connect/auth?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        navigator.serviceWorker.controller.postMessage({
            type: 'STORE_DETAILS',
            data: {
                code_verifier: codeVerifier,
                code_challenge: codeChallenge,
                redirect_uri: redirectUri,
            }
        });
        return loginPageUrl;
    }

    async function usingKcJs() {
        keycloak.init({
            onLoad: 'login-required',
            pkceMethod: 'S256',  // Use PKCE (Proof Key for Code Exchange) with S256
            enableLogging: true,
            checkLoginIframe: false,  // Disable iframe for login check (optional)
            flow: 'standard',  // Standard Authorization Code Flow
            redirectUri: `https://192.168.0.104:3000/play`,
            scope: "openid",
          }).then(authenticated => {
            console.log(authenticated ? 'Authenticated' : 'Not Authenticated');
            if (authenticated) {
              // You can now access Keycloak user info and access token
              console.log(keycloak.token);
              console.log(keycloak.tokenParsed);
            }
          }).catch(error => {
            console.error("Keycloak initialization failed", error);
          });
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        // const loginPageURL = await getKeycloakLoginPageURL();
        // window.location.replace(loginPageURL);

        usingKcJs();
    };

    return (
        <div className="container mt-5">
            <h1 className="mb-4">API Public Endpoints</h1>
            <div className="endpoint">
                <h2>GET /public/ping on backend</h2>
                <button onClick={handlePing} className="btn btn-primary">Ping</button>
                <p id="pingResult" className="mt-2"></p>
            </div>
            <div className="endpoint">
                <h2>Login With Keycloak</h2>
                <form onSubmit={handleLogin}>
                    <button type="submit" className="btn btn-primary">Login</button>
                </form>
                <p id="loginResult" className="mt-2"></p>
            </div>
        </div>
    );
};

export default PublicEndpoints;
