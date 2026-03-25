import { Routes, Route, Navigate } from 'react-router-dom';
import { SearchProvider } from '@/components/search/SearchProvider';
import { CopyUrlProvider } from '@/components/docs/CopyUrlProvider';
import { AppShell } from '@/components/layout/AppShell';
import DocPage from '@/pages/DocPage';

export default function App() {
  return (
    <SearchProvider>
      <CopyUrlProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/docs/overview" replace />} />
          <Route path="/docs" element={<Navigate to="/docs/overview" replace />} />
          <Route path="/docs/*" element={<DocPage />} />
          <Route path="*" element={<Navigate to="/docs/overview" replace />} />
        </Route>
      </Routes>
      </CopyUrlProvider>
    </SearchProvider>
  );
}
