import React, { useEffect, useState } from 'react';
import './privatePage.css';


const PrivateEndpoints = () => {
    



    const baseUrl = 'https://192.168.0.104:5000';
    const [getDataHeaders, setGetDataHeaders] = useState([{ name: '', value: '' }]);
    const [postDataHeaders, setPostDataHeaders] = useState([{ name: '', value: '' }]);
    const [postData, setPostData] = useState('');
    const [getDataResult, setGetDataResult] = useState('');
    const [postDataResult, setPostDataResult] = useState('');
    const [error, setError] = useState('');

    const displayResult = (result, isError = false) => {
        return isError ? (
            <span className="error-message">Error: {JSON.stringify(result)}</span>
        ) : (
            <span>Response: {JSON.stringify(result)}</span>
        );
    };

    const makeRequest = async (endpoint, method, data = null, customHeaders = {}) => {
        const url = `${baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...customHeaders,
        };

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : null,
            });
            const result = await response.json();
            if (!response.ok) throw result;
            return result;
        } catch (err) {
            throw err;
        }
    };

    const handleGetData = async () => {
        try {
            const customHeaders = getDataHeaders.reduce((acc, { name, value }) => {
                if (name && value) acc[name] = value;
                return acc;
            }, {});
            const result = await makeRequest('/private/data', 'GET', null, customHeaders);
            setGetDataResult(displayResult(result));
        } catch (err) {
            setGetDataResult(displayResult(err, true));
        }
    };

    const handlePostData = async (e) => {
        e.preventDefault();
        try {
            const customHeaders = postDataHeaders.reduce((acc, { name, value }) => {
                if (name && value) acc[name] = value;
                return acc;
            }, {});
            const data = { content: postData };
            const result = await makeRequest('/private/data', 'POST', data, customHeaders);
            setPostDataResult(displayResult(result));
        } catch (err) {
            setPostDataResult(displayResult(err, true));
        }
    };

    const addHeaderInput = (type) => {
        if (type === 'get') setGetDataHeaders([...getDataHeaders, { name: '', value: '' }]);
        if (type === 'post') setPostDataHeaders([...postDataHeaders, { name: '', value: '' }]);
    };

    const updateHeader = (type, index, field, value) => {
        const headers = type === 'get' ? [...getDataHeaders] : [...postDataHeaders];
        headers[index][field] = value;
        if (type === 'get') setGetDataHeaders(headers);
        if (type === 'post') setPostDataHeaders(headers);
    };

    useEffect(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const params = {};
        urlParams.forEach((value, key) => {
            params[key] = value;
        });
        if (params.code) {
            navigator.serviceWorker.controller.postMessage({
                type: 'STORE_CODE',
                data: { session_state: params.session_state, code: params.code },
            });
        }
    }, []);

    return (
        <div className="container mt-5">
            <h1 className="mb-4">API Private Endpoints</h1>

            {/* GET /private/data */}
            <div className="endpoint">
                <h2>GET /private/data</h2>
                <div className="custom-headers">
                    <h4>Custom Headers</h4>
                    {getDataHeaders.map((header, index) => (
                        <div className="header-pair" key={index}>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Header Name"
                                value={header.name}
                                onChange={(e) => updateHeader('get', index, 'name', e.target.value)}
                            />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Header Value"
                                value={header.value}
                                onChange={(e) => updateHeader('get', index, 'value', e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                <button onClick={() => addHeaderInput('get')} className="btn btn-secondary mt-2">
                    Add Header
                </button>
                <button onClick={handleGetData} className="btn btn-primary mt-2">
                    Get Data
                </button>
                <p className="mt-2">{getDataResult}</p>
            </div>

            {/* POST /private/data */}
            <div className="endpoint">
                <h2>POST /private/data</h2>
                <form onSubmit={handlePostData}>
                    <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter data to post"
                        value={postData}
                        onChange={(e) => setPostData(e.target.value)}
                    ></textarea>
                    <div className="custom-headers">
                        <h4>Custom Headers</h4>
                        {postDataHeaders.map((header, index) => (
                            <div className="header-pair" key={index}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Header Name"
                                    value={header.name}
                                    onChange={(e) => updateHeader('post', index, 'name', e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Header Value"
                                    value={header.value}
                                    onChange={(e) => updateHeader('post', index, 'value', e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={() => addHeaderInput('post')} className="btn btn-secondary mt-2">
                        Add Header
                    </button>
                    <button type="submit" className="btn btn-primary mt-2">
                        Post Data
                    </button>
                </form>
                <p className="mt-2">{postDataResult}</p>
            </div>

            <a href="/" className="btn btn-secondary">
                Back to Public Endpoints
            </a>
        </div>
    );
};

export default PrivateEndpoints;
