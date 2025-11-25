import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { FilterBar } from './components/FilterBar';
import { PackageList } from './components/PackageList';
import { DetailPanel } from './components/DetailPanel';

const AppContent = () => {
  const { selectedPackage } = useApp();
  return (
    <Layout>
      <div className="content-wrapper">
        <div className="package-view">
          <FilterBar />
          <PackageList />
        </div>
        {selectedPackage && <DetailPanel />}
      </div>
    </Layout>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
