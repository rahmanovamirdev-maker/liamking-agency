import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import Teams from './pages/Teams';
import Statistics from './pages/Statistics';
import Leads from './pages/Leads';
import Archive from './pages/Archive';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import HRPanel from './pages/HRPanel';
import CuratorPanel from './pages/CuratorPanel';
import PostDetail from './pages/PostDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="teams" element={<Teams />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="leads" element={
          <ProtectedRoute roles={['owner', 'admin', 'scout']}><Leads /></ProtectedRoute>
        } />
        <Route path="archive" element={
          <ProtectedRoute roles={['owner', 'admin', 'curator', 'hr']}><Archive /></ProtectedRoute>
        } />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin-panel" element={
          <ProtectedRoute roles={['owner']}><AdminPanel /></ProtectedRoute>
        } />
        <Route path="hr-panel" element={
          <ProtectedRoute roles={['owner', 'hr']}><HRPanel /></ProtectedRoute>
        } />
        <Route path="curator-panel" element={
          <ProtectedRoute roles={['owner', 'curator']}><CuratorPanel /></ProtectedRoute>
        } />
        <Route path="posts/:id" element={<PostDetail />} />
      </Route>
    </Routes>
  );
}
