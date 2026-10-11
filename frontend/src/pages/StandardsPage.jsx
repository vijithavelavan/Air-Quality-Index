import React from 'react';
import { Info, ShieldCheck, CheckCircle2, AlertTriangle, AlertOctagon, ShieldAlert } from 'lucide-react';
import CategoryBadge from '../components/CategoryBadge';

export default function StandardsPage() {
  const cpcbScale = [
    { range: '0 – 50', category: 'Good', color: '#10b981', impact: 'Minimal impact', precautions: 'Ideal outdoor conditions. No health restrictions.' },
    { range: '51 – 100', category: 'Satisfactory', color: '#84cc16', impact: 'Minor breathing discomfort to sensitive people', precautions: 'Sensitive individuals should monitor any discomfort.' },
    { range: '101 – 200', category: 'Moderately Polluted', color: '#eab308', impact: 'Breathing discomfort to people with asthma and heart diseases', precautions: 'Children and asthmatics should reduce intense outdoor physical exertion.' },
    { range: '201 – 300', category: 'Poor', color: '#f97316', impact: 'Breathing discomfort to most people on prolonged exposure', precautions: 'Wear N95/FFP2 masks outdoors; reduce continuous strenuous outdoor activity.' },
    { range: '301 – 400', category: 'Very Poor', color: '#ef4444', impact: 'Respiratory illness on prolonged exposure. Significant asthmatic distress', precautions: 'Keep windows shut; operate indoor HEPA purifiers; avoid outdoor morning exercise.' },
    { range: '401 – 500', category: 'Severe', color: '#881337', impact: 'Affects healthy people and seriously impacts those with existing medical conditions', precautions: 'Hazardous conditions. Stay indoors strictly; seal room airflow; avoid all outdoor exertion.' },
  ];

  const breakpoints = [
    { pol: 'PM2.5 (µg/m³)', good: '0-30', sat: '31-60', mod: '61-90', poor: '91-120', vpoor: '121-250', sev: '250+' },
    { pol: 'PM10 (µg/m³)', good: '0-50', sat: '51-100', mod: '101-250', poor: '251-350', vpoor: '351-430', sev: '430+' },
    { pol: 'NO2 (µg/m³)', good: '0-40', sat: '41-80', mod: '81-180', poor: '181-280', vpoor: '281-400', sev: '400+' },
    { pol: 'SO2 (µg/m³)', good: '0-40', sat: '41-80', mod: '81-380', poor: '381-800', vpoor: '801-1600', sev: '1600+' },
    { pol: 'CO (mg/m³)', good: '0-1.0', sat: '1.1-2.0', mod: '2.1-10.0', poor: '10.1-17.0', vpoor: '17.1-34.0', sev: '34+' },
    { pol: 'O3 (µg/m³)', good: '0-50', sat: '51-100', mod: '101-168', poor: '169-208', vpoor: '209-748', sev: '748+' },
    { pol: 'NH3 (µg/m³)', good: '0-200', sat: '201-400', mod: '401-800', poor: '801-1200', vpoor: '1201-1800', sev: '1800+' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Indian CPCB NAQI Standards & Methodology
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Official Central Pollution Control Board (CPCB) National Air Quality Index calculation rules, breakpoints, and aggregation protocol.
        </p>
      </div>

      {/* CPCB Core Rules Box */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <h2 className="text-base font-bold font-heading text-slate-800">
          Official Aggregation Rules
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
              Minimum 3 Pollutants
            </div>
            <p className="text-emerald-800">
              An official AQI can only be calculated if at least three pollutant sub-indices are measured simultaneously.
            </p>
          </div>

          <div className="p-4 bg-cyan-50/50 border border-cyan-100 rounded-xl space-y-1.5">
            <div className="font-bold text-cyan-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px]">2</span>
              Particulate Requirement
            </div>
            <p className="text-cyan-800">
              At least one of either PM2.5 or PM10 must be included among the measured pollutants.
            </p>
          </div>

          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
              Maximum Sub-Index Driver
            </div>
            <p className="text-blue-800">
              The overall index equals the maximum sub-index: AQI = max(I_1, I_2, ... I_n), driven by that specific pollutant.
            </p>
          </div>
        </div>
      </div>

      {/* Categories Scale Table */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
        <h2 className="text-base font-bold font-heading text-slate-800 mb-3">
          CPCB AQI Categories & Health Advisories
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">AQI Range</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Health Impact</th>
                <th className="py-2.5 px-3">General Precautions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cpcbScale.map(row => (
                <tr key={row.category} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.range}</td>
                  <td className="py-3 px-3">
                    <CategoryBadge category={row.category} size="sm" />
                  </td>
                  <td className="py-3 px-3">{row.impact}</td>
                  <td className="py-3 px-3 text-slate-500">{row.precautions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-Index Breakpoint Reference Table */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
        <h2 className="text-base font-bold font-heading text-slate-800 mb-3">
          Pollutant Concentration Breakpoints
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Pollutant</th>
                <th className="py-2.5 px-3 text-emerald-700">Good (0-50)</th>
                <th className="py-2.5 px-3 text-lime-700">Satisfactory (51-100)</th>
                <th className="py-2.5 px-3 text-amber-700">Moderate (101-200)</th>
                <th className="py-2.5 px-3 text-orange-700">Poor (201-300)</th>
                <th className="py-2.5 px-3 text-rose-700">Very Poor (301-400)</th>
                <th className="py-2.5 px-3 text-red-900">Severe (401-500)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {breakpoints.map(row => (
                <tr key={row.pol} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{row.pol}</td>
                  <td className="py-2.5 px-3">{row.good}</td>
                  <td className="py-2.5 px-3">{row.sat}</td>
                  <td className="py-2.5 px-3">{row.mod}</td>
                  <td className="py-2.5 px-3">{row.poor}</td>
                  <td className="py-2.5 px-3">{row.vpoor}</td>
                  <td className="py-2.5 px-3">{row.sev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
