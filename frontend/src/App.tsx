import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { Layout } from '@/components/layout/Layout';

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  );
}
