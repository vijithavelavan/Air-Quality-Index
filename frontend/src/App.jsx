import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PredictPage from './pages/PredictPage';
import ForecastPage from './pages/ForecastPage';
import ModelEvaluationPage from './pages/ModelEvaluationPage';
import DatasetPage from './pages/DatasetPage';
import StandardsPage from './pages/StandardsPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePredictionDone = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            key={`dash-${refreshTrigger}`} 
            onNavigateToPredict={() => setActiveTab('predict')} 
          />
        );
      case 'predict':
        return (
          <PredictPage 
            onPredictionComplete={handlePredictionDone} 
          />
        );
      case 'forecast':
        return <ForecastPage key={`forecast-${refreshTrigger}`} />;
      case 'evaluation':
        return <ModelEvaluationPage key={`eval-${refreshTrigger}`} />;
      case 'dataset':
        return <DatasetPage key={`dataset-${refreshTrigger}`} onModelRetrained={handlePredictionDone} />;
      case 'standards':
        return <StandardsPage />;
      default:
        return <Dashboard onNavigateToPredict={() => setActiveTab('predict')} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
