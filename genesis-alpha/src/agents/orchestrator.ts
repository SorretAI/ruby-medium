import { RunState, GenesisEvent, PersonaType } from '../../types';
import { CFOAgent } from './cfo';
import { VisualEngineer } from './visual_engineer';
import { PlatformCultureExpert } from './platform_culture';

export class Orchestrator {
  public runState: RunState;
  public eventLog: GenesisEvent[] = [];
  
  // Agents
  public cfo: CFOAgent;
  public visual: VisualEngineer;
  public culture: PlatformCultureExpert;

  constructor(initialPersona: PersonaType = 'Ruby') {
    this.cfo = new CFOAgent();
    this.visual = new VisualEngineer();
    this.culture = new PlatformCultureExpert();
    
    this.runState = {
      id: crypto.randomUUID(),
      activePersona: initialPersona,
      campaignGoal: 'Idle',
      platform: 'Instagram',
      step: 'INIT',
      budget_used: 0
    };
  }

  private addEvent(agent: string, type: GenesisEvent['type'], message: string) {
    const event: GenesisEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agent,
      type,
      message
    };
    this.eventLog.unshift(event); // Newest first
    return event;
  }

  public async startCampaign(goal: string, platform: 'TikTok' | 'Instagram' | 'X') {
    this.runState.campaignGoal = goal;
    this.runState.platform = platform;
    this.runState.step = 'PLANNING';

    this.addEvent('Orchestrator', 'INFO', `Starting campaign: "${goal}" for ${platform}`);
    this.cfo.logHumanTime(5); // Setup time

    // Step 1: Consult Culture
    this.addEvent('PlatformCulture', 'ACTION', `Analyzing constraints for ${platform}`);
    const constraints = this.culture.getConstraints(platform);
    this.addEvent('PlatformCulture', 'SUCCESS', `Constraints loaded: ${JSON.stringify(constraints.safeZones)}`);

    // Step 2: Budget Check
    const health = this.cfo.getHealthReport();
    if (health.status === 'WARNING') {
      this.addEvent('CFO', 'ACTION', `Budget tight. Switching Visual Engineer to minimalist mode.`);
    }

    // Step 3: Visual Generation (Simulated)
    this.runState.step = 'GENERATING';
    this.addEvent('VisualEngineer', 'ACTION', `Constructing ComfyUI workflow for persona: ${this.runState.activePersona}`);
    
    // Simulate latency
    await new Promise(r => setTimeout(r, 800)); 
    
    const workflow = this.visual.constructWorkflow(this.runState.activePersona, goal);
    this.cfo.logCost('gpu', workflow.metadata.estimated_cost);
    this.addEvent('VisualEngineer', 'SUCCESS', `Workflow built using ${workflow.metadata.engine}. Cost: $${workflow.metadata.estimated_cost}`);

    // Step 4: Ad Overlay
    const overlay = this.visual.generateAdOverlay(constraints, "Join the Manifestation Quantum Jump");
    this.addEvent('VisualEngineer', 'INFO', `Generated overlay respecting safe zones.`);

    // Step 5: Finalize
    this.runState.step = 'COMPLETE';
    this.addEvent('Orchestrator', 'SUCCESS', 'Campaign assets ready for deployment.');
    
    return this.eventLog;
  }
}