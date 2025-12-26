import { PersonaType } from '../../types';

export class VisualEngineer {
  public constructWorkflow(persona: PersonaType, prompt: string) {
    // Simulating ComfyUI JSON graph construction
    let baseModel = "sdxl_base_v1.0.safetensors";
    let lora = "none";
    let cfg = 7.0;

    switch (persona) {
      case 'Ruby':
        lora = "zen_minimalist_v2.safetensors";
        cfg = 6.0;
        break;
      case 'Streamer':
        lora = "flux_realism_lora.safetensors";
        baseModel = "flux_dev_fp8.safetensors";
        cfg = 3.5; // Flux likes lower CFG
        break;
      case 'ContentManager':
        baseModel = "sdxl_turbo.safetensors";
        cfg = 1.5; // Turbo speed
        break;
    }

    return {
      node_graph: {
        "3": { class_type: "KSampler", inputs: { cfg, steps: 20, model: [baseModel] } },
        "6": { class_type: "CLIPTextEncode", inputs: { text: prompt } },
        "10": { class_type: "LoRALoader", inputs: { lora_name: lora } }
      },
      metadata: {
        estimated_cost: persona === 'Streamer' ? 0.04 : 0.01, // Flux is pricier
        engine: baseModel
      }
    };
  }

  public generateAdOverlay(platformConstraints: any, copy: string) {
    return {
      layer: "text_overlay",
      font: "Inter-Bold",
      safe_zone_check: true,
      content: copy,
      position: platformConstraints.safeZones
    };
  }
}