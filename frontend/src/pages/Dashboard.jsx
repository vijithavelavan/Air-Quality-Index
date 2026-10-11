import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  Sparkles, 
  Activity, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle,
  Thermometer,
  Droplets,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import CategoryBadge from '../components/CategoryBadge';
import { fetchPredictionHistory, fetchModelMetrics } from '../services/api';

export default function Dashboard({ onNavigateToPredict }) {
  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [histData, metData] = await Promise.all([
        fetchPredictionHistory(20),
        fetchModelMetrics()
      ]);
      setHistory(histData.history || []);
      setMetrics(metData.metrics || null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const latestPrediction = history.length > 0 ? history[0] : null;

  // Historical predictions trend data for Recharts
  const historyTrendData = [...history]
    .reverse()
    .map((item, idx) => ({
      index: idx + 1,
      time: item.timestamp.split(' ')[1] || `#${idx + 1}`,
      aqi: item.predicted_aqi,
      cpcb: item.cpcb_aqi,
      category: item.category
    }));

  // Pollutant comparison from latest prediction
  const pollutantBars = latestPrediction ? [
    { name: 'PM2.5', value: latestPrediction.pm25, unit: 'µg/m³', color: '#10b981' },
    { name: 'PM10', value: latestPrediction.pm10, unit: 'µg/m³', color: '#06b6d4' },
    { name: 'NO2', value: latestPrediction.no2, unit: 'µg/m³', color: '#3b82f6' },
    { name: 'SO2', value: latestPrediction.so2, unit: 'µg/m³', color: '#8b5cf6' },
    { name: 'CO', value: latestPrediction.co, unit: 'mg/m³', color: '#ec4899' },
    { name: 'O3', value: latestPrediction.o3, unit: 'µg/m³', color: '#f59e0b' },
    { name: 'NH3', value: latestPrediction.nh3, unit: 'µg/m³', color: '#14b8a6' },
  ] : [];

  // Category distribution data
  const categoryCounts = history.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const categoryColorMap = {
    'Good': '#10b981',
    'Satisfactory': '#84cc16',
    'Moderately Polluted': '#eab308',
    'Poor': '#f97316',
    'Very Poor': '#ef4444',
    'Severe': '#881337',
  };

  const categoryPieData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    value: categoryCounts[cat],
    color: categoryColorMap[cat] || '#64748b'
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner & Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Air Quality Index (AQI) Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Machine Learning Inference Pipeline & Official Indian CPCB NAQI Standards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            Refresh Feed
          </button>
          <button
            onClick={onNavigateToPredict}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Prediction
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Latest Predicted AQI */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Latest Predicted AQI</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-slate-900">
              {latestPrediction ? latestPrediction.predicted_aqi : '--'}
            </span>
            <span className="text-xs text-slate-400">AQI Index</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <CategoryBadge category={latestPrediction?.category || 'No data'} size="sm" />
            <span className="text-[11px] text-slate-400">Random Forest</span>
          </div>
        </div>

        {/* Card 2: Particulate Matter (PM2.5 / PM10) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Primary Particulates</span>
            <Wind className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">PM2.5</div>
              <div className="text-xl font-bold text-slate-800">
                {latestPrediction?.pm25 !== undefined ? `${latestPrediction.pm25}` : '--'}
                <span className="text-[10px] text-slate-400 font-normal ml-1">µg/m³</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">PM10</div>
              <div className="text-xl font-bold text-slate-800">
                {latestPrediction?.pm10 !== undefined ? `${latestPrediction.pm10}` : '--'}
                <span className="text-[10px] text-slate-400 font-normal ml-1">µg/m³</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Driving Pollutant:</span>
            <strong className="text-slate-600">{latestPrediction?.driving_pollutant || 'PM2.5'}</strong>
          </div>
        </div>

        {/* Card 3: Model Performance Indicator */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Model Accuracy R²</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-slate-900">
              {metrics ? `${(metrics.test_r2 * 100).toFixed(1)}%` : '--'}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Test R² score</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>MAE: {metrics ? `${metrics.test_mae}` : '--'}</span>
            <span>RMSE: {metrics ? `${metrics.test_rmse}` : '--'}</span>
          </div>
        </div>

        {/* Card 4: Environmental Context */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ambient Conditions</span>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-500/80" />
              <div>
                <div className="text-[11px] text-slate-400">Temp</div>
                <div className="text-lg font-bold text-slate-800">28.4°C</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500/80" />
              <div>
                <div className="text-[11px] text-slate-400">Humidity</div>
                <div className="text-lg font-bold text-slate-800">58%</div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Standard atmospheric baseline
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical Prediction Trend Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold font-heading text-slate-800">
                Recent Prediction Trend & Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Chronological sequence of predicted AQI vs official CPCB rule aggregation
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-600">
              {historyTrendData.length} entries
            </span>
          </div>

          <div className="h-64 w-full">
            {historyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aqi" 
                    name="RF Model AQI" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#10b981', r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cpcb" 
                    name="Official CPCB AQI" 
                    stroke="#0284c7" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ fill: '#0284c7', r: 3 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <span>No predictions recorded yet. Submit your first prediction!</span>
              </div>
            )}
          </div>
        </div>

        {/* Pollution Category Distribution (1 column) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
          <h2 className="text-base font-bold font-heading text-slate-800 mb-1">
            Category Distribution
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Air quality classifications across logged predictions
          </p>

          <div className="h-56 w-full flex-1">
            {categoryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center">
                Submit predictions to see distribution analytics
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pollutant Comparison & Recent Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pollutant Level Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
          <h2 className="text-base font-bold font-heading text-slate-800 mb-1">
            Pollutant Parameters
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Most recent input breakdown across 7 primary pollutants
          </p>

          <div className="h-60 w-full">
            {pollutantBars.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pollutantBars} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={45} />
                  <Tooltip
                    formatter={(val, name, item) => [`${val} ${item.payload.unit}`, 'Concentration']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pollutantBars.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Awaiting input data
              </div>
            )}
          </div>
        </div>

        {/* Recent Prediction History Table */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold font-heading text-slate-800">
                Recent Prediction Logs
              </h2>
              <p className="text-xs text-slate-500">
                Stored persistently in local SQLite database
              </p>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Predicted AQI</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">PM2.5</th>
                  <th className="py-2.5 px-3">PM10</th>
                  <th className="py-2.5 px-3">Driver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.length > 0 ? (
                  history.slice(0, 6).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {row.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {row.predicted_aqi}
                      </td>
                      <td className="py-2.5 px-3">
                        <CategoryBadge category={row.category} size="sm" />
                      </td>
                      <td className="py-2.5 px-3">{row.pm25 ?? '--'}</td>
                      <td className="py-2.5 px-3">{row.pm10 ?? '--'}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-600">
                        {row.driving_pollutant || '--'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No logs available yet. Submit a prediction in the Predict tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
