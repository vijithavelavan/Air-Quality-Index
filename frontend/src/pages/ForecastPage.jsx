import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  Info, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';
import CategoryBadge from '../components/CategoryBadge';
import { fetchForecast } from '../services/api';

const DEFAULT_CITIES = ['Delhi', 'Bengaluru', 'Mumbai', 'Kolkata', 'Hyderabad', 'Chennai'];

export default function ForecastPage() {
  const [city, setCity] = useState('Delhi');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadForecast(city);
  }, [city]);

  const loadForecast = async (targetCity) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchForecast(targetCity, 7);
      setForecastData(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve forecast.');
      setForecastData(null);
    } finally {
      setLoading(false);
    }
  };

  // Prepare combined timeline for continuous chart (history + forecast)
  const combinedTimeline = [];
  if (forecastData && forecastData.recent_history) {
    forecastData.recent_history.forEach(item => {
      combinedTimeline.push({
        date: item.date,
        historical_aqi: item.aqi,
        forecast_aqi: null,
        lower: null,
        upper: null,
        type: 'Historical'
      });
    });

    if (forecastData.forecasts) {
      // Connect last historical point to first forecast
      const lastHist = forecastData.recent_history[forecastData.recent_history.length - 1];
      if (lastHist && combinedTimeline.length > 0) {
        combinedTimeline[combinedTimeline.length - 1].forecast_aqi = lastHist.aqi;
      }

      forecastData.forecasts.forEach(item => {
        combinedTimeline.push({
          date: item.date,
          historical_aqi: null,
          forecast_aqi: item.predicted_aqi,
          lower: item.ci_lower,
          upper: item.ci_upper,
          type: 'Forecast'
        });
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">
            7-Day Chronological AQI Forecasting
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Time-series multi-step autoregressive model trained with strict chronological train/test separation.
          </p>
        </div>

        {/* City Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <label htmlFor="city-select" className="text-xs font-semibold text-slate-500">City:</label>
          <select
            id="city-select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
          >
            {DEFAULT_CITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <div className="font-semibold">Forecasting Alert</div>
            <div className="text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-medium text-slate-500">Executing Chronological Time-Series Forecast...</span>
        </div>
      ) : forecastData ? (
        <>
          {/* Main Visual Chart */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold font-heading text-slate-800">
                  Observed History vs 7-Day Projected Horizon ({forecastData.city})
                </h2>
                <p className="text-xs text-slate-500">
                  Autoregressive lag features (t-1, t-2, t-3, t-7) and rolling weekly moving averages
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-3 h-0.5 bg-slate-400"></span> Observed
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-3 h-0.5 bg-emerald-600 border-t-2 border-emerald-600"></span> 7-Day Forecast
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="historical_aqi"
                    name="Observed AQI"
                    stroke="#64748b"
                    strokeWidth={2}
                    dot={{ fill: '#64748b', r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast_aqi"
                    name="Forecasted AQI"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span>Holdout Validation MAE: <strong>{forecastData.validation_mae} AQI</strong></span>
              <span>Validation RMSE: <strong>{forecastData.validation_rmse} AQI</strong></span>
              <span>Last Known Observation: <strong>{forecastData.last_observed_date}</strong></span>
            </div>
          </div>

          {/* 7-Day Day-by-Day Forecast Cards */}
          <div className="space-y-3">
            <h2 className="text-base font-bold font-heading text-slate-800">
              Day-by-Day Forecast Predictions & Air Quality Advisory
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {forecastData.forecasts?.map((day) => (
                <div 
                  key={day.day}
                  className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Day +{day.day}</span>
                      <Calendar className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-xs font-medium text-slate-600 mt-0.5">
                      {day.date}
                    </div>

                    <div className="my-3">
                      <div 
                        className="text-2xl font-black font-heading"
                        style={{ color: day.color }}
                      >
                        {day.predicted_aqi}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        CI: [{day.ci_lower} - {day.ci_upper}]
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <CategoryBadge category={day.category} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Limitations Notice */}
          <div className="p-4 bg-slate-100/70 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">Forecasting Methodology & Assumptions: </span>
              {forecastData.limitations}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
