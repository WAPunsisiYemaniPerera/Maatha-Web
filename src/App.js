import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/SuperAdmin/Dashboard';
import AddMOHAdmin from './pages/SuperAdmin/AddMOHAdmin';
import AddHospitalAdmin from './pages/SuperAdmin/AddHospitalAdmin';
import ManageMidwives from './pages/SuperAdmin/ManageMidwives';
import ManageMothers from './pages/SuperAdmin/ManageMothers';
import MOHDashboard from './pages/MOHAdmin/MOHDashboard';
import AddMidwife from './pages/MOHAdmin/AddMidwife';
import ManageMidwivesMOH from './pages/MOHAdmin/ManageMidwives';
import AreaMothers from './pages/MOHAdmin/AreaMothers';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Super Admin Routes */}
        <Route path="/super-admin/dashboard" element={<Dashboard />} />
        <Route path="/super-admin/add-moh" element={<AddMOHAdmin />} />
        <Route path="/super-admin/add-hospital" element={<AddHospitalAdmin />} />
        <Route path="/super-admin/manage-midwives" element={<ManageMidwives />} />
        <Route path="/super-admin/manage-mothers" element={<ManageMothers />} />

        {/* MOH Admin Routes */}
        <Route path="/moh-admin/dashboard" element={<MOHDashboard />} />
        <Route path="/moh-admin/add-midwife" element={<AddMidwife />} />
        <Route path="/moh-admin/manage-midwives" element={<ManageMidwivesMOH />} />
        <Route path="/moh-admin/area-mothers" element={<AreaMothers />} />
        

        {/* වෙබ් අඩවියට පිවිසෙන ඕනෑම කෙනෙක්ව ස්වයංක්‍රීයව Login පිටුවට යොමු කරයි */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;