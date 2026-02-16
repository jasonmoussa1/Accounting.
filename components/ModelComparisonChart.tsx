
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip 
} from 'recharts';

const data = [
  { subject: 'Complex Logic', Pro: 95, Flash: 75, Lite: 60, fullMark: 100 },
  { subject: 'Iteration Speed', Pro: 65, Flash: 98, Lite: 90, fullMark: 100 },
  { subject: 'Context Window', Pro: 100, Flash: 85, Lite: 70, fullMark: 100 },
  { subject: 'Creativity', Pro: 90, Flash: 80, Lite: 70, fullMark: 100 },
  { subject: 'Code Accuracy', Pro: 98, Flash: 82, Lite: 65, fullMark: 100 },
];

export const ModelComparisonChart: React.FC = () => {
  return (
    <div className="w-full h-[400px] bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
      <h3 className="text-xl font-bold mb-4 text-center text-indigo-300">Vibe Efficiency Metrics</h3>
      <ResponsiveContainer width="100%" height="90%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Gemini 3 Pro (Deep Vibe)"
            dataKey="Pro"
            stroke="#818cf8"
            fill="#818cf8"
            fillOpacity={0.6}
          />
          <Radar
            name="Gemini 3 Flash (Fast Vibe)"
            dataKey="Flash"
            stroke="#2dd4bf"
            fill="#2dd4bf"
            fillOpacity={0.4}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
