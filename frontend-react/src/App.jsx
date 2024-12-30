import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicEndpoints from './components/PublicEndpoints';
import PrivateEndpoints from './components/PrivateEndpoints';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/home" element={<PublicEndpoints />} />
                <Route path="/play" element={<PrivateEndpoints />} />
            </Routes>
        </Router>
    );
};

export default App;
