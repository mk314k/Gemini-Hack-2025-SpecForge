
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { ProductSpec, DesignResponse, GeneratedImage, SelfCheckResult, GeneratedCode, GenerationStatus } from "../types";

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

const CODE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    language: { type: Type.STRING },
    code: { type: Type.STRING },
    explanation: { type: Type.STRING }
  },
  required: ["language", "code", "explanation"]
};

const AUDIT_SYSTEM_INSTRUCTION = `
You are a QA and Systems Validation Engineer. 
Review the provided Engineering Spec and the descriptions of generated diagrams. 
Identify inconsistencies, logic errors, missing constraints, or physical impossibilities.
Output your findings in JSON format with two fields: 'issues' (array of strings) and 'correctedSpec' (the full ProductSpec object with fixes applied).
`;

export async function generateDesignPacket(
  description: string, 
  productType: string, 
  onStatusChange?: (status: GenerationStatus) => void
): Promise<DesignResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const setStatus = (s: GenerationStatus) => onStatusChange && onStatusChange(s);

  console.log(`[1/5] Generating Spec for: ${productType}...`);
  setStatus('spec');

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
    if (!spec.constraints) spec.constraints = {};
    if (!spec.diagramsPlan) spec.diagramsPlan = [];
    if (!spec.partsList) spec.partsList = [];
  } catch (e) {
    console.error("Failed to parse spec JSON", e);
    throw new Error("Failed to generate valid spec");
  }

  // --- STEP 2: Generate Images (Nano Banana Pro) ---
  console.log(`[2/5] Generating ${spec.diagramsPlan.length} diagrams...`);
  setStatus('images');
  
  const generatedImages: GeneratedImage[] = [];
  const imagePromises = spec.diagramsPlan.map(async (plan) => {
    if (!plan || !plan.title) return null;
    try {
      const imagePrompt = `Technical engineering drawing, blueprint style, ${plan.diagramType} view of ${plan.title}. ${plan.descriptionForImageModel}. High contrast, white background, schematic labels, technical illustration.`;
      const imgResponse = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: imagePrompt,
        config: { imageConfig: { aspectRatio: "4:3", imageSize: "1K" } }
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

  // --- STEP 3: Generate Implementation Code & Audio Pitch ---
  console.log(`[3/5] Generating Implementation Code & Marketing Pitch...`);
  setStatus('code');
  
  const codePromise = (async () => {
    const codePrompt = `
      Create a core implementation snippet for this ${productType}.
      If it's Physical/Robotic: Generate Arduino C++ or Python firmware logic.
      If it's Digital: Generate a React/TypeScript component.
      Product Context: ${spec.summary}
      Key Requirements: ${spec.keyRequirements.join(", ")}
      Return JSON with 'language' (use 'cpp' for Arduino, 'python' for Python, 'tsx' for React), 'code', and 'explanation'.
    `;
    const codeResp = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: codePrompt,
        config: { responseMimeType: "application/json", responseSchema: CODE_SCHEMA }
    });
    try { return JSON.parse(codeResp.text || "{}") as GeneratedCode; } catch { return undefined; }
  })();

  const pitchPromise = (async () => {
    const pitchPrompt = `Write a short, punchy, exciting 30-second "Shark Tank" style pitch for the ${spec.productName}. Focus on the problem it solves: ${spec.summary}.`;
    try {
        const audioResp = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: pitchPrompt,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
            }
        });
        const audioData = audioResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return audioData ? `data:audio/wav;base64,${audioData}` : undefined;
    } catch (e) {
        console.warn("Audio generation failed", e);
        return undefined;
    }
  })();

  const [generatedCode, marketingPitchUrl] = await Promise.all([codePromise, pitchPromise]);

  // --- STEP 4: Generate Video (Veo) ---
  console.log(`[4/5] Generating Veo Video...`);
  setStatus('video');
  let videoUrl: string | undefined = undefined;

  try {
    const videoPrompt = `Cinematic product commercial for ${spec.productName}, ${spec.summary}. High tech, futuristic, 4k, slow motion product reveal.`;
    
    // Start Veo generation
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: videoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    let attempts = 0;
    while (!operation.done && attempts < 30) { // Max 5 mins roughly
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      operation = await ai.operations.getVideosOperation({operation});
      attempts++;
    }

    if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
       // Append API key to the download link as per documentation
       const rawUri = operation.response.generatedVideos[0].video.uri;
       videoUrl = `${rawUri}&key=${process.env.API_KEY}`;
    }
  } catch (e) {
    console.warn("Video generation failed (skipping)", e);
  }


  // --- STEP 5: Self-Check Loop ---
  console.log(`[5/5] Running Self-Check Audit...`);
  setStatus('audit');
  
  const imageContext = generatedImages.length > 0 
    ? generatedImages.map(img => `Generated Image (${img.diagramType}): ${img.title}`).join("\n")
    : "No images were generated.";

  const auditPrompt = `
  CURRENT SPEC:
  ${JSON.stringify(spec, null, 2)}
  GENERATED DIAGRAMS CONTEXT:
  ${imageContext}
  Perform a consistency check. Return JSON with 'issues' and 'correctedSpec'.
  `;

  const AUDIT_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
      issues: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctedSpec: PRODUCT_SPEC_SCHEMA
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

  let selfCheck: SelfCheckResult;
  try {
     selfCheck = JSON.parse(auditResponse.text || "{}") as SelfCheckResult;
  } catch (e) {
    selfCheck = { issues: [], correctedSpec: spec };
  }

  return {
    spec,
    images: generatedImages,
    selfCheck,
    implementationCode: generatedCode,
    marketingPitchUrl,
    videoUrl
  };
}
