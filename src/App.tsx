import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Calendar from '@/pages/Calendar';
import Meetings from '@/pages/Meetings';
import CreateMeeting from '@/pages/CreateMeeting';
import Devices from '@/pages/Devices';
import Inspections from '@/pages/Inspections';
import Faults from '@/pages/Faults';
import Reports from '@/pages/Reports';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/meetings/create" element={<CreateMeeting />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/faults" element={<Faults />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
}
