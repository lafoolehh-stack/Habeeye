import React from 'react';

interface ResultCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, icon, children, className = "" }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        {icon && <span className="text-indigo-600">{icon}</span>}
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-6 text-slate-600 leading-relaxed">
        {children}
      </div>
    </div>
  );
};