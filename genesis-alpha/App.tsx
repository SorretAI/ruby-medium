import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Database, DollarSign, Cpu, Play, Save, Layers, Clock } from 'lucide-react';
import { Orchestrator } from './src/agents/orchestrator';
import { GenesisEvent, PersonaType } from './types';

// Constants for display
const ORCHESTRATOR_CODE = `// src/agents/orchestrator.ts
public async startCampaign(goal: string, platform: 'TikTok' | 'Instagram' | 'X') {
  this.runState.campaignGoal = goal;
  this.runState.step = 'PLANNING';

  // Step 1: Consult Culture
  const constraints = this.culture.getConstraints(platform);

  // Step 2: Budget Check
  const health = this.cfo.getHealthReport();
  
  // Step 3: Visual Generation
  const workflow = this.visual.constructWorkflow(this.runState.activePersona, goal);
  
  // Step 4: Finalize
  this.runState.step = 'COMPLETE';
}`;

const SQL_SCHEMA = `-- schema.sql
CREATE TABLE events (
    event_id UUID PRIMARY KEY,
    event_type TEXT CHECK (event_type IN ('TOOL_CALL', 'GENERATION')),
    metadata JSONB
);

CREATE TABLE memory_items (
    memory_id UUID PRIMARY KEY,
    embedding vector(1536),
    category TEXT
);`;

// Helper Components defined as React.FC to properly support 'key' and other React props
const NavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

const LogEntry: React.FC<{ event: GenesisEvent }> = ({ event }) => {
  const colors: Record<GenesisEvent['type'], string> = {
    'INFO': 'text-slate-400 border-slate-800',
    'ACTION': 'text-blue-400 border-blue-900/30 bg-blue-900/10',
    'SUCCESS': 'text-green-400 border-green-900/30 bg-green-900/10',
    'ERROR': 'text-red-400 border-red-900/30 bg-red-900/10',
    'FINANCE': 'text-yellow-400 border-yellow-900/30 bg-yellow-900/10',
  };

  return (
    <div className={`p-3 rounded-md border text-sm font-mono flex gap-4 ${colors[event.type] || colors.INFO}`}>
      <span className="opacity-50 text-xs w-20 shrink-0">{event.timestamp.split('T')[1].split('.')[0]}</span>
      <span className="font-bold w-32 shrink-0 text-slate-200">[{event.agent}]</span>
      <span>{event.message}</span>
    </div>
  );
};

const ServiceCard: React.FC<{ name: string, status: string, type: string, icon: React.ReactNode, desc: string }> = ({ name, status, type, icon, desc }) => {
  return (
    <div className="bg-slate-900 p-5 rounded-lg border border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-800 rounded text-slate-300">{icon}</div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-900">{status}</span>
      </div>
      <h3 className="font-bold text-slate-200">{name}</h3>
      <p className="text-xs text-slate-500 mb-2">{type}</p>
      <p className="text-sm text-slate-400">{desc}</p>
    </div>
  );
};

export default function App() {
  const [orchestrator] = useState(() => new Orchestrator());
  const [logs, setLogs] = useState<GenesisEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'SCHEMA' | 'DOCKER'>('CONSOLE');
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('Ruby');
  const [cfoMetrics, setCfoMetrics] = useState({ cost: 0, revenue: 0, hourly: 0 });
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll orchestrator logs
    const interval = setInterval(() => {
      setLogs([...orchestrator.eventLog]);
      const metrics = orchestrator.cfo.getHealthReport().metrics;
      setCfoMetrics({
        cost: metrics.modelCost + metrics.gpuCost,
        revenue: metrics.revenueEst,
        hourly: metrics.effectiveHourlyRate
      });
    }, 500);
    return () => clearInterval(interval);
  }, [orchestrator]);

  const runSimulation = async () => {
    setIsRunning(true);
    orchestrator.runState.activePersona = selectedPersona;
    await orchestrator.startCampaign("Launch Quantum Manifestation Offer", "TikTok");
    
    // Simulate a conversion after campaign
    setTimeout(() => {
        orchestrator.cfo.logConversion();
    }, 2000);
    
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">GENESIS v3</h1>
          <p className="text-xs text-slate-500 mt-1">Codename: RUBY</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Modules</div>
          <NavItem icon={<Terminal size={18} />} label="Console / Events" active={activeTab === 'CONSOLE'} onClick={() => setActiveTab('CONSOLE')} />
          <NavItem icon={<Database size={18} />} label="Database Schema" active={activeTab === 'SCHEMA'} onClick={() => setActiveTab('SCHEMA')} />
          <NavItem icon={<Layers size={18} />} label="Infrastructure" active={activeTab === 'DOCKER'} onClick={() => setActiveTab('DOCKER')} />
        </nav>

        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-500 mb-2">CFO Agent (Real-time)</div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-400">Eff. Hourly</span>
            <span className={`text-sm font-mono font-bold ${cfoMetrics.hourly > 7 ? 'text-green-400' : 'text-red-400'}`}>
              ${cfoMetrics.hourly.toFixed(2)}/hr
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
             <div 
               className={`h-full ${cfoMetrics.hourly > 7 ? 'bg-green-500' : 'bg-red-500'}`} 
               style={{ width: `${Math.min(cfoMetrics.hourly * 5, 100)}%` }}
             ></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2">
            <span>Rev: ${cfoMetrics.revenue}</span>
            <span>Cost: ${cfoMetrics.cost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header / Controls */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2 bg-slate-800 rounded-lg p-1">
                {(['Ruby', 'Streamer', 'ContentManager'] as PersonaType[]).map(p => (
                  <button 
                    key={p}
                    onClick={() => setSelectedPersona(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedPersona === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    {p}
                  </button>
                ))}
             </div>
          </div>
          
          <button 
            onClick={runSimulation}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
              isRunning 
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20'
            }`}
          >
            {isRunning ? <Activity className="animate-spin" size={16} /> : <Play size={16} />}
            {isRunning ? 'Agents Running...' : 'Execute Run'}
          </button>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-auto bg-slate-950 p-6">
          {activeTab === 'CONSOLE' && (
            <div className="max-w-4xl mx-auto space-y-4">
               {logs.length === 0 && (
                 <div className="text-center py-20 text-slate-600">
                   <Terminal size={48} className="mx-auto mb-4 opacity-20" />
                   <p>System Idle. Select a Persona and Execute Run.</p>
                 </div>
               )}
               {logs.map((log) => (
                 <LogEntry key={log.id} event={log} />
               ))}
               <div ref={logsEndRef} />
            </div>
          )}

          {activeTab === 'SCHEMA' && (
             <div className="max-w-4xl mx-auto">
               <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
                    <Database size={14} className="text-blue-400" />
                    <span className="text-xs font-mono text-slate-300">schema.sql</span>
                  </div>
                  <pre className="p-4 text-sm text-blue-100 font-mono overflow-x-auto">
                    {SQL_SCHEMA}
                  </pre>
               </div>
               <div className="mt-6 bg-slate-900 rounded-lg border border-slate-800 p-6">
                 <h3 className="text-lg font-semibold mb-4 text-slate-200">Memory Architecture Strategy</h3>
                 <ul className="space-y-3 text-sm text-slate-400">
                   <li className="flex gap-3">
                     <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Vector</span>
                     pgvector used for semantic retrieval of "Winning Patterns" and Persona Styles.
                   </li>
                   <li className="flex gap-3">
                     <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Event Log</span>
                     Append-only immutable log for full replayability and debugging.
                   </li>
                   <li className="flex gap-3">
                     <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Write Gate</span>
                     Memory Steward agent prevents drift by only storing high-rated interactions.
                   </li>
                 </ul>
               </div>
             </div>
          )}

          {activeTab === 'DOCKER' && (
             <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ServiceCard name="Orchestrator" status="Online" type="Node.js/TS" icon={<Cpu />} desc="Main agent logic and state machine." />
                <ServiceCard name="Postgres + Vector" status="Online" type="Database" icon={<Database />} desc="Persistent memory store with pgvector." />
                <ServiceCard name="ComfyUI" status="Standby" type="GPU/Python" icon={<Activity />} desc="Visual generation engine (SDXL/Flux)." />
                <ServiceCard name="Browserless" status="Standby" type="Chrome" icon={<Activity />} desc="Headless browser for research & posting." />
                
                <div className="col-span-1 lg:col-span-2 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden mt-4">
                  <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
                    <Terminal size={14} className="text-yellow-400" />
                    <span className="text-xs font-mono text-slate-300">Logic Preview (Orchestrator)</span>
                  </div>
                  <pre className="p-4 text-sm text-yellow-100 font-mono overflow-x-auto">
                    {ORCHESTRATOR_CODE}
                  </pre>
               </div>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}
