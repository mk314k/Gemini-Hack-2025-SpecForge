import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ProductSpec, DesignResponse, GeneratedImage, SelfCheckResult } from "../types";

const SPEC_SYSTEM_INSTRUCTION = `
You are a senior engineering architect. 
Your goal is to take a user description and output a rigorously structured engineering spec.
You must adhere strictly to the JSON schema provided.
For 'diagramsPlan', you MUST propose 2-4 distinct views (e.g., 'Top View', 'Exploded View', 'Circuit Diagram', 'User Interface Screen').
`;

const PRODUCT_SPEC_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    productName: { type: Type.STRING },
    productType: { type: Type.STRING, enum: ["physical", "robotic", "mechanical", "digital"] },
    summary: { type: Type.STRING },
    primaryUseCases: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
    constraints: {
      type: Type.OBJECT,
      properties: {
        environment: { type: Type.STRING, nullable: true },
        sizeLimits: { type: Type.STRING, nullable: true },
        weightLimits: { type: Type.STRING, nullable: true },
        powerOrBattery: { type: Type.STRING, nullable: true },
        safety: { type: Type.STRING, nullable: true },
        budgetRange: { type: Type.STRING, nullable: true },
      },
    },
    partsList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          estimatedDimensions: { type: Type.STRING, nullable: true },
          materialOrTech: { type: Type.STRING, nullable: true },
          quantity: { type: Type.NUMBER, nullable: true },
          roleInSystem: { type: Type.STRING, nullable: true },
        },
        required: ["name", "description", "materialOrTech", "roleInSystem"],
      },
    },
    interactionsOrMechanisms: { type: Type.ARRAY, items: { type: Type.STRING } },
    diagramsPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          diagramType: { type: Type.STRING, enum: ["top", "side", "exploded", "section", "ui_screen"] },
          title: { type: Type.STRING },
          descriptionForImageModel: { type: Type.STRING },
        },
        required: ["diagramType", "title", "descriptionForImageModel"],
      },
    },
    assemblyOrImplementationSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
    risksAndTradeoffs: { type: Type.ARRAY, items: { type: Type.STRING } },
    validationChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "productName",
    "productType",
    "summary",
    "primaryUseCases",
    "keyRequirements",
    "partsList",
    "diagramsPlan",
    "assemblyOrImplementationSteps",
    "constraints"
  ],
};

const AUDIT_SYSTEM_INSTRUCTION = `
You are a QA and Systems Validation Engineer. 
Review the provided Engineering Spec and the descriptions of generated diagrams. 
Identify inconsistencies, logic errors, missing constraints, or physical impossibilities.
Output your findings in JSON format with two fields: 'issues' (array of strings) and 'correctedSpec' (the full ProductSpec object with fixes applied).
`;

export async function generateDesignPacket(description: string, productType: string): Promise<DesignResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  console.log(`[1/3] Generating Spec for: ${productType}...`);

  // --- STEP 1: Generate Spec ---
  const specResponse = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Product Type: ${productType}\nDescription: ${description}`,
    config: {
      systemInstruction: SPEC_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: PRODUCT_SPEC_SCHEMA, 
    },
  });

  const specText = specResponse.text || "{}";
  let spec: ProductSpec;
  
  try {
    spec = JSON.parse(specText) as ProductSpec;
    
    // Fallback for fields that might be null despite schema (safety net)
    if (!spec.constraints) spec.constraints = {};
    if (!spec.diagramsPlan) spec.diagramsPlan = [];
    if (!spec.partsList) spec.partsList = [];

  } catch (e) {
    console.error("Failed to parse spec JSON", e);
    throw new Error("Failed to generate valid spec");
  }

  // --- STEP 2: Generate Images (Nano Banana Pro) ---
  console.log(`[2/3] Generating ${spec.diagramsPlan.length} diagrams...`);
  const generatedImages: GeneratedImage[] = [];

  const imagePromises = spec.diagramsPlan.map(async (plan) => {
    if (!plan || !plan.title) return null;
    
    try {
      // Improved prompt for technical diagrams
      const imagePrompt = `Technical engineering drawing, blueprint style, ${plan.diagramType} view of ${plan.title}. ${plan.descriptionForImageModel}. High contrast, white background, schematic labels, technical illustration.`;
      
      const imgResponse = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: imagePrompt,
        config: {
          imageConfig: {
            aspectRatio: "4:3",
            imageSize: "1K"
          }
        }
      });

      let imageUrl = "";
      const candidates = imgResponse.candidates || [];
      if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
      }

      if (imageUrl) {
          return {
              diagramType: plan.diagramType,
              title: plan.title,
              url: imageUrl,
              promptUsed: imagePrompt
          } as GeneratedImage;
      }
      return null;
    } catch (err) {
      console.error(`Failed to generate image for ${plan.title}`, err);
      return null;
    }
  });

  const results = await Promise.all(imagePromises);
  generatedImages.push(...(results.filter((img) => img !== null) as GeneratedImage[]));

  // --- STEP 3: Self-Check Loop ---
  console.log(`[3/3] Running Self-Check Audit...`);
  
  const imageContext = generatedImages.length > 0 
    ? generatedImages.map(img => `Generated Image (${img.diagramType}): ${img.title}`).join("\n")
    : "No images were generated (generation failed).";

  const auditPrompt = `
  CURRENT SPEC:
  ${JSON.stringify(spec, null, 2)}

  GENERATED DIAGRAMS CONTEXT:
  ${imageContext}

  Perform a consistency check. Return JSON with 'issues' and 'correctedSpec'.
  `;

  // We reuse the schema for self-check structure to ensure robustness
  const AUDIT_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
      issues: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctedSpec: PRODUCT_SPEC_SCHEMA // Reuse the full product spec schema
    },
    required: ["issues", "correctedSpec"]
  };

  const auditResponse = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: auditPrompt,
    config: {
      systemInstruction: AUDIT_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: AUDIT_SCHEMA,
    },
  });

  const auditText = auditResponse.text || "{}";
  let selfCheck: SelfCheckResult;
  try {
     selfCheck = JSON.parse(auditText) as SelfCheckResult;
  } catch (e) {
    console.warn("Failed to parse audit JSON, returning empty check", e);
    selfCheck = { issues: [], correctedSpec: spec };
  }

  return {
    spec,
    images: generatedImages,
    selfCheck,
  };
}