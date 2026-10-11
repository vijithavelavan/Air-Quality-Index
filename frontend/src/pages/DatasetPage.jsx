import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Table,
  Info
} from 'lucide-react';
import { fetchDatasetSummary, uploadDatasetFile } from '../services/api';

export default function DatasetPage({ onModelRetrained }) {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    loadDataset();
  }, []);

  const loadDataset = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDatasetSummary();
      setSummaryData(res.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch dataset summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a valid .csv file.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await uploadDatasetFile(file);
      setSuccessMsg(res.message || 'Dataset successfully uploaded and validated!');
      setSummaryData(res.summary);
      if (onModelRetrained) onModelRetrained();
    } catch (err) {
      setError(err.message || 'Dataset upload failed.');
    } finally {
      setUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Air Quality Dataset Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload custom air quality telemetry, preview headers, audit missing values, and inspect pollutant distribution statistics.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
        <h2 className="text-base font-bold font-heading text-slate-800 mb-2">
          Upload CSV Dataset
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Upload Kaggle India Air Quality dataset (<code>city_day.csv</code>) or any CSV containing pollutant fields (PM2.5, PM10, NO2, SO2, CO, O3, NH3).
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-500/60 bg-slate-50/50 hover:bg-emerald-50/20 transition cursor-pointer">
            <Upload className="w-8 h-8 text-emerald-600 mb-2" />
            <span className="text-xs font-semibold text-slate-700">Click to browse or drop CSV file</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Maximum recommended size: 25 MB</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-700">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Validating schema, parsing pollutants, and retraining Random Forest model...</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span className="text-xs text-slate-500">Inspecting dataset statistics...</span>
        </div>
      ) : summaryData ? (
        <>
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-semibold uppercase">Active Dataset</span>
              <div className="text-base font-bold text-slate-800 mt-1 truncate">
                {summaryData.file_name}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">{summaryData.dataset_source}</div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Rows</span>
              <div className="text-2xl font-bold font-heading text-slate-800 mt-1">
                {summaryData.total_rows?.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">
                {summaryData.valid_aqi_records?.toLocaleString()} valid records
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-semibold uppercase">Columns Present</span>
              <div className="text-2xl font-bold font-heading text-slate-800 mt-1">
                {summaryData.columns?.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summaryData.required_columns_present?.length} / 7 target pollutants
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-400 font-semibold uppercase">City Coverage</span>
              <div className="text-2xl font-bold font-heading text-slate-800 mt-1">
                {summaryData.cities?.length || 'N/A'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                {summaryData.date_range ? `${summaryData.date_range.start} to ${summaryData.date_range.end}` : 'Date unindexed'}
              </div>
            </div>
          </div>

          {/* Pollutant Summary Statistics Table */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
            <h2 className="text-base font-bold font-heading text-slate-800 mb-1">
              Pollutant Parameter Summary Statistics
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Mean, standard deviation, and median values after validation & sensor glitch cleaning
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Pollutant</th>
                    <th className="py-2.5 px-3">Valid Count</th>
                    <th className="py-2.5 px-3">Missing</th>
                    <th className="py-2.5 px-3">Mean</th>
                    <th className="py-2.5 px-3">Std Dev</th>
                    <th className="py-2.5 px-3">Min</th>
                    <th className="py-2.5 px-3">Median</th>
                    <th className="py-2.5 px-3">Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {Object.entries(summaryData.pollutant_stats || {}).map(([pol, stats]) => (
                    <tr key={pol} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{pol}</td>
                      <td className="py-2.5 px-3">{stats ? stats.count : 0}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {summaryData.missing_counts?.[pol] ?? 0}
                      </td>
                      <td className="py-2.5 px-3">{stats ? stats.mean : '--'}</td>
                      <td className="py-2.5 px-3">{stats ? stats.std : '--'}</td>
                      <td className="py-2.5 px-3">{stats ? stats.min : '--'}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">
                        {stats ? stats.median : '--'}
                      </td>
                      <td className="py-2.5 px-3">{stats ? stats.max : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Preview Table */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
            <h2 className="text-base font-bold font-heading text-slate-800 mb-1">
              Dataset Preview (First 10 Rows)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Raw structure preview of loaded dataset
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    {summaryData.columns?.map(col => (
                      <th key={col} className="py-2 px-3 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {summaryData.preview_rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      {summaryData.columns?.map(col => (
                        <td key={col} className="py-2 px-3 whitespace-nowrap">
                          {row[col] !== null ? String(row[col]) : <span className="text-slate-300">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
