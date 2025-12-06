export interface ProductSpec {
  productName: string;
  productType: "physical" | "robotic" | "mechanical" | "digital";
  summary: string;
  primaryUseCases: string[];
  keyRequirements: string[];
  constraints: {
    environment?: string;
    sizeLimits?: string;
    weightLimits?: string;
    powerOrBattery?: string;
    safety?: string;
    budgetRange?: string;
  };
  partsList: {
    name: string;
    description: string;
    estimatedDimensions?: string;
    materialOrTech?: string;
    quantity?: number;
    roleInSystem?: string;
  }[];
  interactionsOrMechanisms: string[];
  diagramsPlan: {
    diagramType: "top" | "side" | "exploded" | "section" | "ui_screen";
    title: string;
    descriptionForImageModel: string;
  }[];
  assemblyOrImplementationSteps: string[];
  risksAndTradeoffs: string[];
  validationChecks: string[];
}

export interface GeneratedImage {
  diagramType: string;
  title: string;
  url: string; // Base64 data URL
  promptUsed: string;
}

export interface SelfCheckResult {
  issues: string[];
  correctedSpec: ProductSpec | null;
}

export interface DesignResponse {
  spec: ProductSpec;
  images: GeneratedImage[];
  selfCheck: SelfCheckResult;
}

export type GenerationStatus = "idle" | "spec" | "images" | "audit" | "complete" | "error";
