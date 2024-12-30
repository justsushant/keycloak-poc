const clientId = 'qwerty';
const scope = 'openid';

let tokens = {};

// to update the worker if changed
self.addEventListener('install', event => {
    console.log('Service Worker Installed');
    event.waitUntil(self.skipWaiting());
});

// to allow the worker to take control asap
self.addEventListener('activate', event => {
    console.log('Service Worker Activated');
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
        ])
    );
});


// // Listen for messages from the main thread
// self.addEventListener('message', async (event) => {
//     const { action, type, data } = event.data;
//     if (action === 'initiateLogin') {
//         const { codeVerifier, codeChallenge } = await generatePKCECodes();
//         tokens.codeVerifier = codeVerifier;
//         const redirectUri = encodeURIComponent('http://192.168.0.104:8080/play');
//         const authorizationEndpoint = 'http://192.168.0.104:8080/auth/realms/test/protocol/openid-connect/auth';
//         const authUrl = `${authorizationEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
//         window.location.replace(authUrl);
//     } else if (type === 'STORE_CODE') {
//         tokens = { ...tokens, ...data };
//         await setIndexedDB("tokenDB", "tokenStore", "token", tokens);
//         const tokenEndpoint = new URL('http://192.168.0.104:8080/auth/realms/test/protocol/openid-connect/token');
//         const tokenEndpointParams = {
//             grant_type: "authorization_code",
//             code: data.code,
//             redirect_uri: tokens.redirect_uri,
//             client_id: "qwerty",
//             code_verifier: tokens.codeVerifier,
//         };
//         for (paramKey in tokenEndpointParams) {
//             tokenEndpoint.searchParams.append(paramKey, tokenEndpointParams[paramKey])
//         }
//         const response = await fetch(tokenEndpoint, {
//             method: "POST",
//             headers: { "Content-type": "application/x-www-form-urlencoded" },
//             // body: tokenEndpointParams.toString(),
//         });
//         const tokenData = await response.json();
//         tokens.accessToken = tokenData.access_token;
//         tokens.refreshToken = tokenData.refresh_token;
//         await setIndexedDB("tokenDB", "tokenStore", "token", tokens);
//         const allClients = await self.clients.matchAll();
//         allClients.forEach(client => client.postMessage({ action: 'loginSuccess', tokens }));
//     }
// });

function getIndexedDB(dbName, storeName, key) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);

        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const getRequest = store.get(key);

            getRequest.onerror = () => {
                reject(new Error('Failed to retrieve data'));
            };

            getRequest.onsuccess = () => {
                resolve(getRequest.result);
            };
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
    });
}

function setIndexedDB(dbName, storeName, key, data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);

        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const putRequest = store.put(data, key);

            putRequest.onerror = () => {
                reject(new Error('Failed to store data'));
            };

            putRequest.onsuccess = () => {
                resolve();
            };
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
    });
}

// to receive tokens from client and save them
self.addEventListener('message', async (event) => {
    console.log("inside event message")
    const {type, data} = event.data;
    if (type == 'STORE_CODE') {
        console.log("Inside store code")
        // save auth code 
        tokens = {
            ...tokens,
            ...data,
        };

        await setIndexedDB("tokenDB", "tokenStore", "token", tokens)
        console.log("inside set indexed db store code")

       
        // get tokens from keycloak
        const tokenEndpoint = new URL("https://192.168.0.104:8443/realms/test/protocol/openid-connect/token")
        const tokenEndpointParams = {
            grant_type: "authorization_code",
            code: data.code,
            redirect_uri: tokens.redirect_uri,
            client_id: "qwerty",
            code_verifier: tokens.code_verifier,
        }
        for (paramKey in tokenEndpointParams) {
            tokenEndpoint.searchParams.append(paramKey, tokenEndpointParams[paramKey])
        }
        console.log("token endpoint before making fetch request: ", tokenEndpoint.toString())
        console.log("token endpoint before making fetch request: ", tokenEndpoint.toJSON())

        const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-type": "application/x-www-form-urlencoded",
                // "Access-Control-Allow-Origin": "*",
            },
            // mode: 'no-cors'
        })

        console.log("RESPONSE: ", response)
        console.log("RESPONSE: ", await response.json())
        tokens = {
            ...tokens,
            ...response,
        }
        await setIndexedDB("tokenDB", "tokenStore", "token", tokens)

        console.log("response: ", response)
        console.log("token: ", token)
    }

    if (type == 'STORE_DETAILS') {
        const token = await getIndexedDB("tokenDB", "tokenStore", "token")
        console.log(token)
        tokens = {
            ...token,
            ...data,
        }

        await setIndexedDB("tokenDB", "tokenStore", "token", tokens)
        console.log("inside set indexed db store details")
    }
    const token = await getIndexedDB("tokenDB", "tokenStore", "token")
    console.log("final cache: ", token)
}); 

// to intercept the outbound api calls
// self.addEventListener('fetch', async (event) => {
//     event.respondWith(
//         (async () => {
//             const token = await getIndexedDB("tokenDB", "tokenStore", "token")
//             if (event.request.url.startsWith('https://192.168.0.104:3000/private')) {
//                 // console.log("token from fetch: ", token)

//                 // if (token.accessToken && event.request.url.startsWith('https://192.168.0.104:3000/private')) {
//                 const modifiedRequest = new Request(event.request, {
//                     headers: new Headers({
//                         ...event.request.headers,
//                         Authorization: `Bearer ${token.accessToken}`,
//                     }),
//                 });

//                 return fetch(modifiedRequest);
//             }

//             return fetch(event.request);
//         })()
//     )
// });