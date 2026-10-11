import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  HelpCircle, 
  Database, 
  Cpu, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ScatterChart, 
  Scatter, 
  Line 
} from 'recharts';
import { fetchModelMetrics } from '../services/api';

export default function ModelEvaluationPage() {
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchModelMetrics();
      setMetricsData(res.metrics || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics.');
    } finally {
      setLoading(false);
    }
  };

  const featureImportanceList = metricsData?.feature_importances
    ? Object.entries(metricsData.feature_importances)
        .map(([feature, importance]) => ({
          feature,
          importance: Number((importance * 100).toFixed(2)),
          raw: importance
        }))
        .sort((a, b) => b.importance - a.importance)
    : [];

  const actualVsPred = metricsData?.actual_vs_predicted || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Machine Learning Model Evaluation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Quantitative performance benchmarks, holdout error metrics, and feature importance of the Random Forest Regressor.
        </p>
      </div>

      {metricsData?.is_synthetic_dataset && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Dataset Notice: </span>
            Currently trained on the <strong>{metricsData.dataset_note}</strong>.
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-medium text-slate-500">Loading model evaluation metrics...</span>
        </div>
      ) : metricsData ? (
        <>
          {/* Key Regression Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Mean Absolute Error (MAE)
              </span>
              <div className="text-3xl font-black font-heading text-slate-900 mt-2">
                {metricsData.test_mae}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Average absolute deviation in AQI points on unseen test records
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Root Mean Squared Error (RMSE)
              </span>
              <div className="text-3xl font-black font-heading text-slate-900 mt-2">
                {metricsData.test_rmse}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Penalizes large outlier forecast errors
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Coefficient of Determination (R²)
              </span>
              <div className="text-3xl font-black font-heading text-emerald-600 mt-2">
                {metricsData.test_r2}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Variance explained by the Random Forest model on holdout set
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Split Samples
              </span>
              <div className="text-3xl font-black font-heading text-slate-900 mt-2">
                {metricsData.train_samples} / {metricsData.test_samples}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                80% Training vs 20% Evaluation Test split ({metricsData.total_samples} total)
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Importance Chart */}
            <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
              <div className="mb-4">
                <h2 className="text-base font-bold font-heading text-slate-800">
                  Relative Feature Importances (Gini Impurity)
                </h2>
                <p className="text-xs text-slate-500">
                  Percentage contribution of each atmospheric parameter to AQI prediction
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportanceList} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" unit="%" stroke="#94a3b8" fontSize={11} />
                    <YAxis type="category" dataKey="feature" stroke="#64748b" fontSize={12} width={50} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Importance Weight']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="importance" fill="#10b981" radius={[0, 4, 4, 0]}>
                      {featureImportanceList.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#059669' : index === 1 ? '#10b981' : index === 2 ? '#34d399' : '#6ee7b7'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actual vs Predicted Scatter */}
            <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
              <div className="mb-4">
                <h2 className="text-base font-bold font-heading text-slate-800">
                  Actual vs Predicted AQI (Holdout Test Samples)
                </h2>
                <p className="text-xs text-slate-500">
                  Points adhering closely to the diagonal indicate high regression fidelity
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="actual" name="Actual AQI" stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                    <YAxis type="number" dataKey="predicted" name="Predicted AQI" stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val, name) => [`${val}`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Scatter name="Test Inferences" data={actualVsPred} fill="#0284c7" shape="circle" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Model Architecture Details */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
            <h2 className="text-base font-bold font-heading text-slate-800 mb-3">
              Hyperparameter Specification
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-400">Algorithm</div>
                <div className="font-semibold text-slate-800 mt-1">Random Forest Regressor</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-400">Ensemble Estimators</div>
                <div className="font-semibold text-slate-800 mt-1">{metricsData.n_estimators || 120} Trees</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-400">Max Depth</div>
                <div className="font-semibold text-slate-800 mt-1">16 Levels</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-400">Random State</div>
                <div className="font-semibold text-slate-800 mt-1">42 (Reproducible)</div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
