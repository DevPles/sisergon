import { Outlet } from 'react-router-dom';
import TopNav from '@/components/TopNav';

const AppLayout = () => {
  return (
    <div className="min-h-screen" style={{ background: '#dde2e8' }}>
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
