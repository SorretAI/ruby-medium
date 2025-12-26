import { CFOMetrics } from '../../types';

export class CFOAgent {
  private metrics: CFOMetrics;
  private readonly BASELINE_HOURLY = 7.00;
  private readonly UPSELL_VALUE = 75.00; // Average of $50-$100

  constructor() {
    this.metrics = {
      humanHours: 0,
      modelCost: 0,
      gpuCost: 0,
      bookedCalls: 0,
      revenueEst: 0,
      effectiveHourlyRate: 0
    };
  }

  public logCost(type: 'model' | 'gpu', amount: number) {
    if (type === 'model') this.metrics.modelCost += amount;
    if (type === 'gpu') this.metrics.gpuCost += amount;
    this.recalculate();
  }

  public logHumanTime(minutes: number) {
    this.metrics.humanHours += (minutes / 60);
    this.recalculate();
  }

  public logConversion() {
    this.metrics.bookedCalls++;
    this.metrics.revenueEst += this.UPSELL_VALUE;
    this.recalculate();
  }

  private recalculate() {
    const totalCost = this.metrics.modelCost + this.metrics.gpuCost;
    const profit = this.metrics.revenueEst - totalCost;
    
    // Avoid division by zero
    const hours = this.metrics.humanHours > 0 ? this.metrics.humanHours : 1; 
    
    this.metrics.effectiveHourlyRate = profit / hours;
  }

  public getHealthReport() {
    const isProfitable = this.metrics.effectiveHourlyRate > this.BASELINE_HOURLY;
    return {
      metrics: { ...this.metrics },
      status: isProfitable ? 'HEALTHY' : 'WARNING',
      recommendation: isProfitable 
        ? 'Scale current winning variant.' 
        : 'Degrade model tier to DeepSeek-Lite or reduce generation variants.'
    };
  }
}