import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  Info,
  RotateCcw
} from 'lucide-react';
import CategoryBadge from '../components/CategoryBadge';
import { submitPrediction } from '../services/api';

const DEFAULT_PRESETS = {
  clean: { label: 'Clean Mountain Air (Good)', PM25: 18, PM10: 32, NO2: 12, SO2: 6, CO: 0.4, O3: 25, NH3: 10 },
  moderate: { label: 'Typical Urban Day (Moderate)', PM25: 75, PM10: 140, NO2: 52, SO2: 24, CO: 1.2, O3: 45, NH3: 35 },
  winterSmog: { label: 'Severe Winter Smog (Severe)', PM25: 295, PM10: 480, NO2: 110, SO2: 65, CO: 4.5, O3: 90, NH3: 120 }
};

export default function PredictPage({ onPredictionComplete }) {
  const [formData, setFormData] = useState({
    PM25: '75',
    PM10: '140',
    NO2: '45',
    SO2: '18',
    CO: '1.2',
    O3: '42',
    NH3: '25'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const pollutantFields = [
    { key: 'PM25', name: 'PM2.5', unit: 'µg/m³', desc: 'Fine inhalable particles (<= 2.5 micrometers)', min: 0, max: 1000 },
    { key: 'PM10', name: 'PM10', unit: 'µg/m³', desc: 'Inhalable coarse particles (<= 10 micrometers)', min: 0, max: 1500 },
    { key: 'NO2', name: 'NO2', unit: 'µg/m³', desc: 'Nitrogen Dioxide (combustion & vehicular exhaust)', min: 0, max: 600 },
    { key: 'SO2', name: 'SO2', unit: 'µg/m³', desc: 'Sulphur Dioxide (industrial & thermal power)', min: 0, max: 1000 },
    { key: 'CO', name: 'CO', unit: 'mg/m³', desc: 'Carbon Monoxide (incomplete fuel combustion)', min: 0, max: 100 },
    { key: 'O3', name: 'O3', unit: 'µg/m³', desc: 'Ground-level Ozone (photochemical smog)', min: 0, max: 800 },
    { key: 'NH3', name: 'NH3', unit: 'µg/m³', desc: 'Ammonia (agricultural emissions & waste)', min: 0, max: 1000 },
  ];

  const handleInputChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const applyPreset = (presetKey) => {
    const preset = DEFAULT_PRESETS[presetKey];
    if (preset) {
      setFormData({
        PM25: String(preset.PM25),
        PM10: String(preset.PM10),
        NO2: String(preset.NO2),
        SO2: String(preset.SO2),
        CO: String(preset.CO),
        O3: String(preset.O3),
        NH3: String(preset.NH3),
      });
    }
  };

  const resetForm = () => {
    setFormData({
      PM25: '',
      PM10: '',
      NO2: '',
      SO2: '',
      CO: '',
      O3: '',
      NH3: ''
    });
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prepare payload
    const payload = {
      'PM2.5': formData.PM25 ? parseFloat(formData.PM25) : null,
      'PM10': formData.PM10 ? parseFloat(formData.PM10) : null,
      'NO2': formData.NO2 ? parseFloat(formData.NO2) : null,
      'SO2': formData.SO2 ? parseFloat(formData.SO2) : null,
      'CO': formData.CO ? parseFloat(formData.CO) : null,
      'O3': formData.O3 ? parseFloat(formData.O3) : null,
      'NH3': formData.NH3 ? parseFloat(formData.NH3) : null,
    };

    // Client-side quick validation
    for (const [k, v] of Object.entries(payload)) {
      if (v !== null && (isNaN(v) || v < 0)) {
        setError(`Pollutant ${k} must be a non-negative number.`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await submitPrediction(payload);
      setResult(res);
      if (onPredictionComplete) onPredictionComplete();
    } catch (err) {
      setError(err.message || 'Prediction failed. Ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Air Quality Index Prediction
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Input atmospheric pollutant telemetry to compute the predicted AQI using the trained Random Forest model and Indian CPCB sub-index calculations.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>Quick Scenarios:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(DEFAULT_PRESETS).map(([key, data]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              {data.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form and Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-base font-bold font-heading text-slate-800 pb-2 border-b border-slate-100">
              Pollutant Concentration Inputs
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pollutantFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`input-${field.key}`} className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>{field.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({field.unit})</span>
                    </label>
                  </div>
                  <input
                    id={`input-${field.key}`}
                    type="number"
                    step="0.01"
                    min={field.min}
                    max={field.max}
                    placeholder={`e.g. ${field.name === 'CO' ? '1.2' : '45'}`}
                    value={formData[field.key]}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <p className="text-[10px] text-slate-400 truncate">{field.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm rounded-xl hover:from-emerald-700 hover:to-teal-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Evaluating Model Pipeline...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Predict Air Quality Index
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Output Card */}
        <div className="lg:col-span-5 flex flex-col">
          {result ? (
            <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs flex-1 flex flex-col justify-between space-y-5 animate-in fade-in duration-300">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-100">
                  <span>Model Prediction Output</span>
                  <span>{result.timestamp}</span>
                </div>

                {/* Score Big Display */}
                <div className="text-center py-6">
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Predicted AQI Value
                  </div>
                  <div 
                    className="text-6xl font-black font-heading tracking-tight"
                    style={{ color: result.color }}
                  >
                    {result.predicted_aqi}
                  </div>
                  <div className="mt-3">
                    <CategoryBadge category={result.category} size="lg" />
                  </div>
                </div>

                {/* Health Advisory & Precaution */}
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      Health Risk Assessment
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {result.health_risk}
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Recommended Safety Precautions
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      {result.precautions}
                    </p>
                  </div>
                </div>
              </div>

              {/* Official CPCB Standard Cross-Validation Box */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>CPCB Standard Sub-Index Benchmark:</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {result.cpcb_official?.calculated_aqi ?? '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Driving Pollutant:</span>
                  <span className="font-semibold text-slate-700">
                    {result.cpcb_official?.driving_pollutant || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-xl p-8 flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <Sparkles className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-600 text-sm">Prediction Awaiting Input</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Enter pollutant parameters on the left or select a quick scenario preset to trigger the trained Machine Learning model.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
