// import Anthropic from"@anthropic-ai/sdk";
// NOTE: Anthropic SDK temporarily disabled - install with: pnpm add @anthropic-ai/sdk interface ExperimentDesignRequest { goal: string; constraints?: { ingredients?: string[]; equipment?: string[]; timeline?: number; budget?: number; }; context?: { recentExperiments?: string[]; teamExpertise?: string[]; specialization?:"culinary" |"pastry" |"both"; };
} export interface Variable { name: string; min: number; max: number; unit: string; importance:"critical" |"important" |"nice-to-have"; rationale: string;
} export interface SuccessCriteria { metric: string; target: string; how_measured: string; unit?: string;
} export interface RiskFlag { risk: string; severity:"low" |"medium" |"high"; mitigation: string; category:"allergen" |"cost" |"timeline" |"equipment" |"technique";
} export interface ExperimentDesignResponse { hypothesis: string; variables: Variable[]; controls: { baselineIngredients: string[]; standardProcedure: string; controlDescription: string; }; testMatrix: { sampleSize: number; replicates: number; rationale: string; duration_days: number; }; successCriteria: SuccessCriteria[]; riskFlags: RiskFlag[]; estimatedTimeline: { days: number; phases: string[]; critical_path: string; }; equipmentNeeded: string[]; expectedOutcomes: string[]; nextSteps: string[]; confidenceScore: number;
} // const client = new Anthropic();
// NOTE: Anthropic client instantiation disabled const systemPrompt = `You are an elite culinary scientist and R&D director with deep expertise in:
- Food chemistry and molecular gastronomy
- Sensory science and texture engineering
- Production scaling and equipment constraints
- Supply chain and ingredient sourcing
- Cost optimization and margin analysis
- Food safety and allergen management Your role is to design rigorous, executable food experiments that:
1. Are scientifically sound with proper statistical design
2. Are practically executable within real kitchen constraints
3. Have clear, measurable success criteria
4. Identify and mitigate risks early
5. Provide realistic timelines and resource requirements When designing experiments:
- Identify 3-5 key test variables based on the stated goal
- Recommend minimum 3 replicates for validation (5+ for robustness)
- Flag all risks early (allergens, costs, sourcing, equipment, timing)
- Estimate realistic timelines with phase breakdowns
- Provide clear, reproducible procedures
- Consider production scaling implications
- Account for ingredient seasonality and availability Response format: Return ONLY valid JSON (no markdown, no code blocks).`; export async function designExperiment( request: ExperimentDesignRequest,
): Promise<ExperimentDesignResponse> { const userPrompt = `Design a rigorous experiment for this goal:"${request.goal}" ${ request.constraints ? `Constraints:
- Available ingredients: ${request.constraints.ingredients?.join(",") ||"Any"}
- Available equipment: ${request.constraints.equipment?.join(",") ||"Standard kitchen"}
- Timeline: ${request.constraints.timeline ||"No limit"} days max
- Budget: $${request.constraints.budget ||"Unlimited"}` :""
} ${ request.context ? `Context:
- Specialization: ${request.context.specialization ||"Culinary"}
- Team expertise: ${request.context.teamExpertise?.join(",") ||"General"}
- Recent similar work: ${request.context.recentExperiments?.slice(0, 2).join(";") ||"None"}` :""
} Return a complete experiment design as JSON with this exact structure (no markdown, no code blocks):
{"hypothesis":"Clear, testable hypothesis statement","variables": [ {"name":"Variable name","min": number,"max": number,"unit":"unit","importance":"critical|important|nice-to-have","rationale":"Why this variable matters" } ],"controls": {"baselineIngredients": ["list","of","ingredients"],"standardProcedure":"Step-by-step control procedure","controlDescription":"What the control establishes" },"testMatrix": {"sampleSize": number (minimum 3),"replicates": number,"rationale":"Why this sample size","duration_days": number },"successCriteria": [ {"metric":"What to measure","target":"Target value or range","how_measured":"Method of measurement","unit":"Unit of measurement" } ],"riskFlags": [ {"risk":"Risk description","severity":"low|medium|high","mitigation":"How to mitigate","category":"allergen|cost|timeline|equipment|technique" } ],"estimatedTimeline": {"days": number,"phases": ["Phase 1","Phase 2","Phase 3"],"critical_path":"Description of longest dependency chain" },"equipmentNeeded": ["equipment","list"],"expectedOutcomes": ["outcome 1","outcome 2"],"nextSteps": ["step 1","step 2"],"confidenceScore": number (0-100)
}`; try { const message = await client.messages.create({ model:"claude-3-5-sonnet-20241022", max_tokens: 4096, system: systemPrompt, messages: [ { role:"user", content: userPrompt, }, ], }); const content = message.content[0]; if (content.type !=="text") { throw new Error("Unexpected response type from Claude"); } const text = content.text.trim(); const design = JSON.parse(text) as ExperimentDesignResponse; if (!design.hypothesis || !design.variables || !design.controls) { throw new Error("Invalid response structure from Claude"); } return design; } catch (error) { console.error("Error designing experiment:", error); throw new Error( `Failed to design experiment: ${error instanceof Error ? error.message :"Unknown error"}`, ); }
} interface ValidationRequest { results: number[]; baseline: number[]; notes: string; experimentTitle?: string;
} export interface ValidationResponse { isValid: boolean; confidence: number; summary: string; concerns: string[]; recommendations: string[]; details: { sampleSize: number; mean: number; standardDeviation: number; outlierCount: number; reproducibilityScore: number; changeFromBaseline: number; changePercent: number; };
} export async function validateExperimentResults( request: ValidationRequest,
): Promise<ValidationResponse> { const userPrompt = `Review and validate these experimental results: Experiment:"${request.experimentTitle ||"Unnamed"}"
Results (measurements): ${JSON.stringify(request.results)}
Baseline (control measurements): ${JSON.stringify(request.baseline)}
Notes: ${request.notes} Analyze for:
1. Statistical validity (sufficient sample size, outliers, variance)
2. Reproducibility (consistency between replicates)
3. Practical significance (does the change matter?)
4. Quality of data (contamination, errors)
5. Confidence in results Return ONLY valid JSON (no markdown, no code blocks):
{"isValid": boolean,"confidence": number (0-100),"summary":"Brief summary of findings","concerns": ["concern 1","concern 2"],"recommendations": ["action 1","action 2"],"details": {"sampleSize": number,"mean": number,"standardDeviation": number,"outlierCount": number,"reproducibilityScore": number (0-100),"changeFromBaseline": number,"changePercent": number }
}`; try { const message = await client.messages.create({ model:"claude-3-5-sonnet-20241022", max_tokens: 2048, system:"You are a statistical analyst and data quality expert. Evaluate experimental data for validity and reliability. Respond with ONLY valid JSON.", messages: [ { role:"user", content: userPrompt, }, ], }); const content = message.content[0]; if (content.type !=="text") { throw new Error("Unexpected response type from Claude"); } const text = content.text.trim(); const response = JSON.parse(text) as ValidationResponse; return response; } catch (error) { console.error("Error validating experiment:", error); throw new Error( `Failed to validate experiment: ${error instanceof Error ? error.message :"Unknown error"}`, ); }
} interface SOPRequest { title: string; hypothesis: string; variables: Array<{ name: string; value: string }>; procedure: string; ingredients: Array<{ name: string; amount: string }>; equipment: string[]; successCriteria: string[];
} export interface SOPResponse { title: string; introduction: string; safetyNotes: string[]; ingredients: Array<{ item: string; amount: string; notes: string }>; equipment: string[]; procedure: Array<{ step: number; description: string; duration?: string; notes?: string; }>; qualityChecks: string[]; storage: string; troubleshooting: Array<{ issue: string; solution: string }>; allergenWarning: string;
} export async function generateSOP(request: SOPRequest): Promise<SOPResponse> { const userPrompt = `Generate a professional Standard Operating Procedure (SOP) for this recipe/technique: Title: ${request.title}
Hypothesis: ${request.hypothesis}
Key Variables: ${request.variables.map((v) => `${v.name}=${v.value}`).join(",")}
Ingredients: ${request.ingredients.map((i) => `${i.amount} ${i.name}`).join(",")}
Equipment: ${request.equipment.join(",")}
Success Criteria: ${request.successCriteria.join(";")} Base Procedure: ${request.procedure} Create a production-ready SOP with:
- Clear safety warnings
- Detailed ingredients with notes
- Step-by-step procedure with timing
- Quality control checkpoints
- Storage/shelf-life guidelines
- Troubleshooting for common issues
- Allergen warnings Return ONLY valid JSON (no markdown):
{"title":"SOP Title","introduction":"Purpose and scope","safetyNotes": ["safety 1","safety 2"],"ingredients": [ {"item":"ingredient name","amount":"amount with unit","notes":"sourcing/quality notes" } ],"equipment": ["equipment 1","equipment 2"],"procedure": [ {"step": 1,"description":"detailed procedure step","duration":"time estimate","notes":"critical notes" } ],"qualityChecks": ["check 1","check 2"],"storage":"storage instructions and shelf life","troubleshooting": [ {"issue":"common problem","solution":"solution" } ],"allergenWarning":"FDA allergen statement"
}`; try { const message = await client.messages.create({ model:"claude-3-5-sonnet-20241022", max_tokens: 3000, system:"You are an expert culinary technologist creating professional SOPs for food production. Be precise, detailed, and safety-focused. Respond with ONLY valid JSON.", messages: [ { role:"user", content: userPrompt, }, ], }); const content = message.content[0]; if (content.type !=="text") { throw new Error("Unexpected response type from Claude"); } const text = content.text.trim(); const sop = JSON.parse(text) as SOPResponse; return sop; } catch (error) { console.error("Error generating SOP:", error); throw new Error( `Failed to generate SOP: ${error instanceof Error ? error.message :"Unknown error"}`, ); }
} export async function getExperimentRecommendations( goal: string, recentExperiments: string[],
): Promise<string[]> { const userPrompt = `Based on this research goal:"${goal}" And recent similar work:
${recentExperiments.map((e) => `- ${e}`).join("\n")} Provide 3-5 actionable recommendations to accelerate success and improve quality. Consider:
- Ingredient combinations that work well
- Techniques that have succeeded before
- Common pitfalls to avoid
- Equipment/methods from similar experiments Respond with ONLY a JSON array of strings:
["recommendation 1","recommendation 2","recommendation 3"]`; try { const message = await client.messages.create({ model:"claude-3-5-sonnet-20241022", max_tokens: 1024, system:"You are an expert culinary researcher providing recommendations. Respond with ONLY a valid JSON array of recommendation strings.", messages: [ { role:"user", content: userPrompt, }, ], }); const content = message.content[0]; if (content.type !=="text") { throw new Error("Unexpected response type from Claude"); } const text = content.text.trim(); const recommendations = JSON.parse(text) as string[]; return Array.isArray(recommendations) ? recommendations : []; } catch (error) { console.error("Error getting recommendations:", error); return []; }
}
