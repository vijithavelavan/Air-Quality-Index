import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon, HeartHandshake } from 'lucide-react';

export default function CategoryBadge({ category, size = 'md' }) {
  const getStyle = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'good':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          icon: ShieldCheck
        };
      case 'satisfactory':
        return {
          bg: 'bg-lime-50 border-lime-200 text-lime-800',
          dot: 'bg-lime-500',
          icon: ShieldCheck
        };
      case 'moderately polluted':
      case 'moderate':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          icon: ShieldAlert
        };
      case 'poor':
        return {
          bg: 'bg-orange-50 border-orange-200 text-orange-800',
          dot: 'bg-orange-500',
          icon: AlertTriangle
        };
      case 'very poor':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          dot: 'bg-rose-500',
          icon: AlertOctagon
        };
      case 'severe':
      case 'hazardous':
      case 'hazardous / beyond scale':
        return {
          bg: 'bg-red-100 border-red-300 text-red-900',
          dot: 'bg-red-700',
          icon: AlertOctagon
        };
      default:
        return {
          bg: 'bg-slate-100 border-slate-200 text-slate-700',
          dot: 'bg-slate-400',
          icon: HeartHandshake
        };
    }
  };

  const style = getStyle(category);
  const Icon = style.icon;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1.5' 
    : size === 'lg'
    ? 'text-base px-3.5 py-1.5 gap-2 font-semibold'
    : 'text-xs px-2.5 py-1 gap-2 font-medium';

  return (
    <span className={`inline-flex items-center rounded-full border shadow-xs ${style.bg} ${sizeClasses}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{category || 'Unknown'}</span>
    </span>
  );
}
