import Ajv from "ajv";
import { ChatMistralAI } from "@langchain/mistralai";
import { PromptTemplate, ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

const LLM_PROVIDERS = {
  'mistral-medium': {
    model: ChatMistralAI,
    configKey: 'apiKey',
  }
};

class GenericLLMService {
  static instance = null;
  static MAX_RETRIES = 5;
  static RETRY_DELAY = 30; // Increase from 3000 to 5000ms
  static PROPERTY_DELAY = 10; // NEW: Add this constant

  constructor() {
    this.ajv = new Ajv();
    const modelName = process.env.NEXT_PUBLIC_MODEL_NAME || 'mistral-medium';
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const temperature = parseFloat(process.env.NEXT_PUBLIC_LLM_TEMPERATURE || '0.7');

    if (!apiKey) {
      throw new Error('API key not found in environment variables');
    }

    const provider = LLM_PROVIDERS[modelName];
    if (!provider) {
      throw new Error(`Unsupported model: ${modelName}`);
    }

    this.llm = new provider.model({
      apiKey,
      modelName: 'mistral-medium',
      temperature
    });

    this.initPrompts();
  }

  static getInstance() {
    if (!GenericLLMService.instance) {
      GenericLLMService.instance = new GenericLLMService();
    }
    return GenericLLMService.instance;
  }

  initPrompts() {
    this.researchProblemTemplate = PromptTemplate.fromTemplate(`
      Extract a generalized research problem from the following abstract:
      Abstract: {abstract}
    
      Analyze the abstract and return a JSON object with the following structure:
      {{
        "title": "Concise title highlighting the core research challenge",
        "problem": "Generic description of the underlying research problem",
        "domain": "Broad research field or domain",
        "impact": "Potential broader implications of solving this problem",
        "motivation": "Fundamental importance of addressing this problem",
        "confidence": "Number between 0-1 reflecting clarity of the problem",
        "explanation": "Rationale for the confidence score"
      }}
      
      Guidelines:
      1. Focus on the fundamental research challenge, not specific methods or datasets.
      2. Ensure the problem is generalizable and applicable to other contexts or domains.
      3. Avoid using paper-specific details or implementation-specific language.
      4. Highlight the broader impact and significance of the problem.
      5. Use clear and concise language to describe the problem.
      6. Ensure the JSON output is valid and includes all required fields.

      Example 1:
      Input Abstract: "AIM. To examine the factors affecting European Football match outcomes using machine learning models. METHODS. Fixtures of 269 teams competing in the top seven European leagues were extracted (2001/02 to 2021/22, total >61,000 fixtures). We used eXtreme Gradient Boosting (XGBoost) to assess the relationship between result (win, draw, loss) and the explanatory variables. RESULTS. The top contributors to match outcomes were travel distance, between-team differences in Elo (with a contribution magnitude to the model half of that of travel distance and match location), and recent domestic performance (with a contribution magnitude of a fourth to a third of that of travel distance and match location), irrespective of the dataset and context analyzed. Contextual factors such as rest days between matches, the number of matches since the managers have been in charge, and match-to-match player rotations were also shown to influence match outcomes; however, their contribution magnitude was consistently 4–8 times smaller than that of the three main contributors mentioned above. CONCLUSIONS. Machine learning has proven to provide insightful results for coaches and supporting staff who may use their results to set expectations and adjust their practices in relation to the different contexts examined here."
      Output:
      {{
        "title": "Understanding Contextual Factors in Competitive Sports Outcomes",
        "problem": "Identifying and quantifying the impact of contextual factors (e.g., travel distance, team performance, rest days) on the outcomes of competitive sports matches, with applications beyond football to other sports and competitive scenarios.",
        "domain": "Sports Analytics",
        "impact": "Improved decision-making for coaches and teams, with potential applications in other competitive domains such as esports, business, or military strategy.",
        "motivation": "Understanding these factors can lead to better strategies and performance optimization in competitive environments.",
        "confidence": 0.9,
        "explanation": "The abstract clearly discusses the impact of contextual factors on match outcomes, making the problem well-defined and generalizable to other competitive domains."
      }}
    
      Example 2:
      Input Abstract: "Background. Identifying chemical mentions within the Alzheimer's and dementia literature can provide a powerful tool to further therapeutic research. Leveraging the Chemical Entities of Biological Interest (ChEBI) ontology, which is rich in hierarchical and other relationship types, for entity normalization can provide an advantage for future downstream applications. We provide a reproducible hybrid approach that combines an ontology-enhanced PubMedBERT model for disambiguation with a dictionary-based method for candidate selection. Results. There were 56,553 chemical mentions in the titles of 44,812 unique PubMed article abstracts. Based on our gold standard, our method of disambiguation improved entity normalization by 25.3 percentage points compared to using only the dictionary-based approach with fuzzy-string matching for disambiguation. For the CRAFT corpus, our method outperformed baselines (maximum 78.4%) with a 91.17% accuracy. For our Alzheimer's and dementia cohort, we were able to add 47.1% more potential mappings between MeSH and ChEBI when compared to BioPortal. Conclusion. Use of natural language models like PubMedBERT and resources such as ChEBI and PubChem provide a beneficial way to link entity mentions to ontology terms, while further supporting downstream tasks like filtering ChEBI mentions based on roles and assertions to find beneficial therapies for Alzheimer's and dementia."
      Output:
      {{
        "title": "Improving Chemical Entity Normalization in Biomedical Literature",
        "problem": "The challenge of accurately identifying and normalizing chemical entities in biomedical literature, particularly for diseases like Alzheimer's and dementia, hinders the development of effective therapeutics. This problem extends to other diseases and biomedical domains where chemical entity normalization is critical.",
        "domain": "Biomedical Informatics",
        "impact": "Facilitates faster and more accurate drug discovery and development across various diseases, enabling better therapeutic research and clinical outcomes.",
        "motivation": "Accurate normalization of chemical entities is critical for advancing translational research and therapeutic development, particularly in complex diseases like Alzheimer's and dementia.",
        "confidence": 0.85,
        "explanation": "The abstract highlights the importance of chemical entity normalization, but the problem could be further generalized to other diseases and biomedical domains."
      }}
    
      Example 3:
      Input Abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data."
      Output:
      {{
        "title": "Advancing Sequence Transduction Models with Attention Mechanisms",
        "problem": "The challenge of improving sequence transduction models by reducing their complexity and computational cost while maintaining or improving performance. This problem extends beyond machine translation to other sequence-based tasks like speech recognition and text summarization.",
        "domain": "Natural Language Processing",
        "impact": "Enables more efficient and scalable sequence transduction models, with applications in machine translation, speech recognition, and other sequence-based tasks.",
        "motivation": "Simplifying and improving sequence transduction models can lead to faster and more efficient AI systems, reducing computational costs and enabling broader applications.",
        "confidence": 0.9,
        "explanation": "The abstract clearly discusses the limitations of existing models and proposes a solution, making the problem well-defined and generalizable to other sequence-based tasks."
      }}
    `);

    this.templateGenerationPrompt = PromptTemplate.fromTemplate(`
      Generate a research template emphasizing technical aspects for this domain:
      
      Research Field: {researchField}
      Research Problem Title: {problemTitle}
      Research Problem Description: {problemDescription}
      
      CRITICAL: Return ONLY valid JSON without any comments or explanatory text.
      DO NOT use // or /* */ comments inside the JSON.
      
      Guidelines:
      1. Focus on technical implementation details and methodological choices
      2. Include quantitative metrics and evaluation criteria
      3. Capture domain-specific technical components while keeping template reusable
      4. Properties should reflect both technical depth and cross-domain applicability
      5. Include specific parameters and configurations that impact results
      6. Limit the number of properties to less than 25
      
      CRITICAL - Property Type Selection:
      You MUST choose the correct type for each property from these 5 types ONLY.
      NEVER use "object" or any other type. ALWAYS choose ONE of: text, number, resource, date, url
      
      Type Selection Rules:
      
      1. "resource" - Use when property refers to a NAMED tool, dataset, model, or benchmark
         Keywords: "dataset", "model", "architecture", "framework", "library", "tool", "benchmark"
         Examples:
         - Property: "Primary Dataset" → type: "resource"
         - Property: "Model Architecture" → type: "resource"
         - Property: "Deep Learning Framework" → type: "resource"
         WRONG: "Dataset Description" → type: "text" (not the name, but a description)
      
      2. "number" - Use when property value is a NUMERIC measurement, metric, or count
         Keywords: "accuracy", "score", "f1", "precision", "size", "count", "number", "percentage", "rate"
         Examples:
         - Property: "Accuracy" → type: "number"
         - Property: "Sample Size" → type: "number"
         - Property: "Number of Parameters" → type: "number"
         WRONG: "Accuracy Analysis" → type: "text" (analysis of accuracy, not the value)
      
      3. "text" - Use for DESCRIPTIONS, explanations, methodologies, or multi-sentence content
         Keywords: "description", "methodology", "approach", "steps", "process", "findings", "contribution"
         Examples:
         - Property: "Methodology Description" → type: "text"
         - Property: "Preprocessing Steps" → type: "text"
         - Property: "Key Findings" → type: "text"
      
      4. "date" - Use when property is a TEMPORAL value (year, date, period)
         Keywords: "date", "year", "period", "time", "when", "publication"
         Examples:
         - Property: "Publication Date" → type: "date"
         - Property: "Data Collection Period" → type: "date"
      
      5. "url" - Use when property is a LINK or web address
         Keywords: "url", "link", "repository", "doi", "website"
         Examples:
         - Property: "Source Code Repository" → type: "url"
         - Property: "Paper DOI" → type: "url"
      
      DECISION TREE for choosing type:
      1. Does property refer to a named dataset/model/tool? → "resource"
      2. Does property expect a numeric value? → "number"  
      3. Does property expect a URL/link? → "url"
      4. Does property expect a date/time? → "date"
      5. Everything else (descriptions, text) → "text"
      
      COMMON MISTAKES TO AVOID:
      ❌ WRONG: "Image Acquisition Details" → type: "object"
      ✅ CORRECT: "Image Acquisition Details" → type: "text"
      
      ❌ WRONG: "Model Performance Metrics" → type: "object"
      ✅ CORRECT: "Model Performance Metrics" → type: "text" (description of metrics)
      
      ❌ WRONG: "Training Configuration" → type: "object"
      ✅ CORRECT: "Training Configuration" → type: "text"
      
      If a property contains complex structured data, you should still use "text" type.
      The system will convert complex data to readable text automatically.
      
      Required template structure (MUST be valid JSON):
      {{
        "id": "unique-identifier",
        "name": "Technical approach to problem type",
        "description": "Analysis framework for similar technical approaches",
        "properties": [
          {{
            "id": "prop-id",
            "label": "Property name",
            "description": "Technical aspect this measures",
            "type": "text|number|resource|date|url",
            "required": true/false,
            "value": null,
            "confidence": null,
            "evidence": null,
            "source_section": null,
            "validation_rules": {{}} 
          }}
        ],
        "metadata": {{
          "research_field": "Domain",
          "research_category": "Technical category",
          "adaptability_score": 0-1,
          "total_properties": number,
          "suggested_sections": []
        }}
      }}
      
      Type Selection Examples:
      ✅ CORRECT:
      - {{"label": "Primary Dataset", "type": "resource", "description": "Main dataset used"}}
      - {{"label": "Model Accuracy", "type": "number", "description": "Classification accuracy"}}
      - {{"label": "Preprocessing Steps", "type": "text", "description": "Data preprocessing methodology"}}
      - {{"label": "Publication Date", "type": "date", "description": "When the paper was published"}}
      - {{"label": "Code Repository", "type": "url", "description": "Link to source code"}}
      
      ❌ INCORRECT:
      - {{"label": "Dataset", "type": "object"}} ← Should be "resource"
      - {{"label": "Methodology", "type": "object"}} ← Should be "text"
      - {{"label": "Metrics", "type": "object"}} ← Should be "number" or separate properties
      
      Return ONLY the JSON object. No markdown, no comments, no additional text.
    `);
  }

  createTextFingerprint(text) {
    return text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  getTypeHandlingInstructions(propertyType) {
    switch (propertyType) {
        case 'text':
            return `Extract only key phrases or scientific terms. Avoid rephrasing.`;
        case 'number':
            return `Extract numerical values WITH their metric labels (e.g., "F1 Score: 0.95" or "Accuracy: 92.5%"). Always include what the number represents.`;
        case 'resource':
            return `Extract ONLY the resource name or term (e.g., "ImageNet", "BERT", "COVID-19 Dataset"). Do NOT include descriptions or explanations. Maximum 5 words per resource.`;
        case 'object':
            return `Preserve structured data as JSON object. Do NOT convert to text.`;
        default:
            return '';
    }
  }

  validateAndEnrichResponse(rawResponse, sections) {
    if (!rawResponse || typeof rawResponse !== 'object') {
        throw new Error('Invalid response format');
    }
    
    if (!rawResponse.values || !Array.isArray(rawResponse.values)) {
        rawResponse.values = [];
    }
    
    const isValid = this.validateSchema(rawResponse);
    if (!isValid) {
        throw new Error('Response schema validation failed');
    }

    const response = {...rawResponse};
    response.values = response.values.map(value => {
        const provenance = value.provenance && Array.isArray(value.provenance) 
            ? value.provenance 
            : [];

        return {
            ...value,
            validation: this.validateCrossSectionConsistency(
                { provenance }, 
                sections
            )
        };
    });

    return response;
  }

  validateSchema(response) {
    const schema = {
        type: 'object',
        required: ['property', 'values'],
        properties: {
            property: { type: 'string' },
            values: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['value', 'confidence'],
                    properties: {
                        value: { type: ['string', 'number', 'boolean', 'object'] },
                        confidence: { 
                            type: 'number',
                            minimum: 0,
                            maximum: 1
                        }
                    }
                }
            }
        }
    };
    
    return this.ajv.validate(schema, response);
  }

  validateCrossSectionConsistency(value, sections) {
    const sectionsInvolved = (value.provenance || []).map(p => p.section || 'unknown');
    const uniqueSections = [...new Set(sectionsInvolved)];

    return {
        cross_section_consistency: uniqueSections.length > 1 ? 'yes' : 'no',
        data_completeness: sectionsInvolved.length === Object.keys(sections || {}).length ? 'high' : 'medium'
    };
  }

  isRecoverableError(error) {
    return error.message.includes('429') || error.message.includes('Too Many Requests');
  }

  async handleRetryDelay(error, attempt) {
    const delay = attempt * 200;
    console.warn(`Recoverable error, retrying in ${delay / 100}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  generateErrorResponse(property, error = null) {
    return {
      property: property.label,
      label: property.label,
      type: property.type,
      metadata: {
        property_type: property.type,
        extraction_method: 'error',
        source: 'error',
        error: error?.message
      },
      values: [{
        value: '',
        confidence: 0,
        evidence: {},
        id: `val-error-${Math.random().toString(36).substring(2, 9)}`
      }],
      error: error ? error.message : 'Unknown error occurred'
    };
  }

  async extractResearchProblem(abstract) {
    if (!abstract || typeof abstract !== 'string' || abstract.trim().length === 0) {
      throw new Error('Abstract is required and must be a non-empty string');
    }
  
    try {
      const parser = new JsonOutputParser();
      const chain = this.researchProblemTemplate.pipe(this.llm).pipe(parser);
  
      console.log('Abstract being processed:', abstract);
  
      const response = await chain.invoke({ 
        abstract: abstract.trim() 
      });
  
      console.log('LLM Response:', response);
  
      const requiredFields = ['title', 'problem', 'domain', 'impact', 'motivation', 'confidence', 'explanation'];
      const missingFields = requiredFields.filter(field => !(field in response));
  
      if (missingFields.length > 0) {
        throw new Error(`Invalid response format. Missing fields: ${missingFields.join(', ')}`);
      }
  
      const confidence = parseFloat(response.confidence);
      if (isNaN(confidence) || confidence < 0 || confidence > 1) {
        throw new Error('Invalid confidence score. Must be between 0 and 1');
      }
  
      return {
        ...response,
        confidence: confidence,
        model: process.env.NEXT_PUBLIC_MODEL_NAME,
        timestamp: new Date().toISOString()
      };
  
    } catch (error) {
      console.error('Error extracting research problem:', error);
      throw new Error(`Failed to extract research problem: ${error.message}`);
    }
  }

  async generateResearchTemplate(researchField, problemTitle, problemDescription) {
    try {
      const parser = new JsonOutputParser();
      const chain = this.templateGenerationPrompt
        .pipe(this.llm)
        .pipe(parser);
      
      const response = await chain.invoke({
        researchField,
        problemTitle,
        problemDescription
      });

      return this.validateAndEnhanceTemplate(response);
    } catch (error) {
      console.error('Template generation error:', error);
      throw new Error(`Failed to generate template: ${error.message}`);
    }
  }

  validateAndEnhanceTemplate(template) {
    const requiredFields = ['name', 'description', 'properties', 'metadata'];
    const missingFields = requiredFields.filter(field => !(field in template));
    
    if (missingFields.length > 0) {
      throw new Error(`Invalid template format. Missing: ${missingFields.join(', ')}`);
    }

    if (!Array.isArray(template.properties) || template.properties.length === 0) {
      throw new Error('Template must contain at least one property');
    }

    const enhancedProperties = template.properties.map(prop => ({
      ...prop,
      id: prop.id || `prop-${crypto.randomUUID().slice(0, 8)}`,
      required: prop.required ?? true,
      type: prop.type || 'text',
      value: null,
      confidence: null,
      evidence: null,
      source_section: null
    }));

    const enhancedTemplate = {
      ...template,
      id: template.id || crypto.randomUUID(),
      properties: enhancedProperties,
      metadata: {
        ...template.metadata,
        total_properties: enhancedProperties.length,
        creation_timestamp: new Date().toISOString(),
        model: process.env.NEXT_PUBLIC_MODEL_NAME,
        template_version: '1.0'
      }
    };

    return this.validateTemplateStructure(enhancedTemplate);
  }

  validateTemplateStructure(template) {
    template.properties.forEach((prop, index) => {
      const requiredPropFields = ['id', 'label', 'description', 'type', 'required'];
      const missingPropFields = requiredPropFields.filter(field => !(field in prop));
      
      if (missingPropFields.length > 0) {
        throw new Error(`Invalid property at index ${index}. Missing fields: ${missingPropFields.join(', ')}`);
      }

      // CRITICAL: Only allow the 5 valid types that the UI supports
      const validTypes = ['text', 'number', 'resource', 'date', 'url'];
      if (!validTypes.includes(prop.type)) {
        console.error(`❌ INVALID TYPE: Property "${prop.label}" has type "${prop.type}" which is not supported.`);
        console.log(`   Allowed types: ${validTypes.join(', ')}`);
        
        // Intelligent type inference based on property label/description
        const label = prop.label.toLowerCase();
        const desc = (prop.description || '').toLowerCase();
        
        // Infer correct type
        if (label.includes('dataset') || label.includes('model') || label.includes('architecture') || 
            label.includes('framework') || label.includes('tool') || label.includes('benchmark') ||
            desc.includes('named') || desc.includes('specific dataset') || desc.includes('specific model')) {
          prop.type = 'resource';
          console.log(`   ✅ Auto-corrected to "resource" (detected dataset/model/tool reference)`);
        }
        else if (label.includes('accuracy') || label.includes('score') || label.includes('f1') ||
                 label.includes('precision') || label.includes('recall') || label.includes('size') ||
                 label.includes('count') || label.includes('number') || label.includes('percentage') ||
                 desc.includes('metric') || desc.includes('measurement') || desc.includes('numeric')) {
          prop.type = 'number';
          console.log(`   ✅ Auto-corrected to "number" (detected numeric metric)`);
        }
        else if (label.includes('url') || label.includes('link') || label.includes('repository') ||
                 label.includes('doi') || desc.includes('web address') || desc.includes('link')) {
          prop.type = 'url';
          console.log(`   ✅ Auto-corrected to "url" (detected link/URL)`);
        }
        else if (label.includes('date') || label.includes('year') || label.includes('period') ||
                 label.includes('time') || desc.includes('temporal') || desc.includes('when')) {
          prop.type = 'date';
          console.log(`   ✅ Auto-corrected to "date" (detected temporal reference)`);
        }
        else {
          prop.type = 'text';
          console.log(`   ✅ Auto-corrected to "text" (default for descriptions/explanations)`);
        }
      }
    });

    const requiredMetaFields = ['research_field', 'research_category', 'total_properties'];
    const missingMetaFields = requiredMetaFields.filter(field => !(field in template.metadata));
    
    if (missingMetaFields.length > 0) {
      throw new Error(`Invalid metadata. Missing fields: ${missingMetaFields.join(', ')}`);
    }

    return template;
  }

  /**
   * 🚀 OPTIMIZED: Batch analyze with parallel processing (tuned for rate limits)
   */
  async analyzePaperSections(sections, template) {
    try {
      if (!sections || typeof sections !== 'object') {
        throw new Error('Invalid sections format');
      }

      const properties = template.template?.properties || template.properties;
      if (!properties || !Array.isArray(properties)) {
        throw new Error('Invalid template structure: no properties found');
      }

      console.log(`🚀 Starting SEQUENTIAL analysis of ${properties.length} properties`);

      // Cache sections once
      if (!this.cachedSections) {
        this.cachedSections = Object.entries(sections)
          .map(([name, text]) => `### ${name} ###\n${text}`)
          .join('\n\n');
      }

      // 🔧 SEQUENTIAL: Process one property at a time to avoid rate limits
      const results = {};
      
      for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`Processing ${i + 1}/${properties.length}: ${property.label}`);
      
      try {
        const response = await this.analyze(property, sections, false);
        results[property.id] = {
          ...response,
          label: property.label,
          type: property.type
        };
        
        // INCREASED: 5 seconds between properties (was 2)
        if (i < properties.length - 1) {
          await new Promise(resolve => setTimeout(resolve, GenericLLMService.PROPERTY_DELAY));
        }
        
      } catch (error) {
        console.error(`Error processing ${property.label}:`, error);
        results[property.id] = this.generateErrorResponse(property, error);
        
        // INCREASED: 10 seconds after error (was 3)
        if (i < properties.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 20000));
        }
      }
    }

      console.log(`✅ Analysis complete: ${Object.keys(results).length} properties processed`);
      return results;
      
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }

  async analyze(property, sections, forceUpdate = false) {
    try {
        const parser = new JsonOutputParser();

        if (!this.cachedSections || forceUpdate) {
            this.cachedSections = Object.entries(sections)
                .map(([name, text]) => `### ${name} ###\n${text}`)
                .join('\n\n');
        }

        // System message with cached sections
        const systemMessage = SystemMessagePromptTemplate.fromTemplate(`
        You are an advanced AI model specialized in structured knowledge extraction from scientific papers.
        
        **Context:**  
        The sections of the paper that you will always reference are:
        {cachedSections}
        
        **Guidelines:**  
        - Extract only from the provided sections.  
        - Avoid assumptions or hallucinations.  
        - Ensure outputs are concise, precise, and in structured knowledge graph format.  
        `);

        // 🔥 ENHANCED: Type-specific extraction prompts
        const userPrompt = HumanMessagePromptTemplate.fromTemplate(`
          Extract a precise, structured representation of the property from the given text.

          ## Property Details
          - **Label**: {propertyLabel}
          - **Description**: {propertyDescription}
          - **Type**: {propertyType}

          ## Type-Specific Extraction Rules

          ### For TEXT type:
          - Extract concise, scientifically meaningful terms or phrases
          - Prioritize technical, domain-specific language
          - Keep extractions brief (prefer 1-3 sentences maximum)
          - Return as SIMPLE STRING, not nested objects

          ### For NUMBER type:
          - CRITICAL: Always extract number WITH its semantic label
          - Format: "Metric Name: Value" (e.g., "F1 Score: 0.95", "Accuracy: 92.5%")
          - Include units if present
          - If multiple metrics, separate with semicolons
          - NEVER return just a bare number without context
          - Return as SIMPLE STRING, not nested objects

          ### For RESOURCE type:
          - Extract ONLY the resource name/identifier (max 5 words)
          - Examples: "ImageNet", "BERT model", "COVID-19 Dataset", "VGG16"
          - Do NOT include descriptions, purposes, or explanations
          - If multiple resources, list them separately
          - Avoid phrases like "The study used..." - just return the resource name
          - CRITICAL: Return as SIMPLE STRING only, NEVER as nested object
          - If you find complex dataset information, extract only the dataset NAME

          ### For DATE type:
          - Extract dates in ISO format (YYYY-MM-DD) if possible
          - Or return as readable date string (e.g., "January 2024")
          - Return as SIMPLE STRING

          ### For URL type:
          - Extract full URLs or DOIs
          - Return as SIMPLE STRING
          - Examples: "https://github.com/repo", "10.1234/doi"

          ### CRITICAL: Avoid Complex Nested Objects
          - For ALL property types: ALWAYS return simple string values
          - Do NOT return multi-level nested objects
          - If you encounter complex data, extract only the key information as a string
          - Example: Instead of returning a nested object with patient_cohort, total_patients, etc.,
            extract: "COVID-19 CT Dataset: 259 patients, 1065 images, 3 centers"

          ## Output Structure
          {{
            "property": "{propertyLabel}",
            "values": [
              {{
                "value": "<extracted content as SIMPLE STRING>",
                "confidence": 0.0-1.0,
                "evidence": {{
                  "<section_name>": {{
                    "text": "<direct quote>",
                    "relevance": "<precise justification>"
                  }}
                }},
                "metadata": {{
                  "property_type": "{propertyType}",
                  "validation_rules": {{
                    "type_constraint": "<specific type requirements>",
                    "domain_specificity": "<domain validation criteria>"
                  }},
                  "source_section": "<exact section name>"
                }}
              }}
            ],
            "extraction_metadata": {{
              "total_values_found": "<number of values>",
              "extraction_strategy": "<summary of extraction approach>"
            }}
          }}

          ## Confidence Scoring Guidelines
          - 0.9-1.0: Verbatim match, high domain relevance
          - 0.7-0.89: Strong contextual alignment
          - 0.5-0.69: Moderate relevance, some interpretation
          - 0.3-0.49: Weak connection, significant inference
          - 0.0-0.29: Minimal or no direct evidence

          ## Critical Constraints
          - RETURN ONLY VALID JSON
          - NO ADDITIONAL TEXT OR EXPLANATION
          - STRICTLY FOLLOW THE SPECIFIED OUTPUT STRUCTURE
          - FOR NUMBERS: Always include metric label
          - FOR RESOURCES: Only return resource names (no descriptions)
          - FOR ALL TYPES: NEVER return nested objects - only simple strings
          `);

        console.log('Analyzing property:', {
            label: property.label,
            type: property.type
        });

        let attempts = 0;
        let lastError = null;

        while (attempts < GenericLLMService.MAX_RETRIES) {
            try {
                const chatPrompt = ChatPromptTemplate.fromMessages([
                    systemMessage,
                    userPrompt
                ]);

                const chain = chatPrompt.pipe(this.llm).pipe(parser);
                
                const rawResponse = await chain.invoke({
                    propertyLabel: property.label,
                    propertyDescription: property.description || 'No description provided',
                    propertyType: property.type || 'text',
                    cachedSections: this.cachedSections
                });

                const response = this.cleanAndValidateResponse(rawResponse, property);
                
                this.validateResponse(response);
                return response;
                
            } catch (error) {
                lastError = error;
                attempts++;

                const isRateLimitError = 
                    error.message?.includes('429') || 
                    error.message?.includes('Too Many Requests') ||
                    error.message?.includes('Service tier capacity exceeded') ||
                    error.message?.includes('3505');

                if (isRateLimitError) {
                  // INCREASED: More aggressive backoff for free tier
                  const waitTime = Math.min(attempts * 100, 600); // 10s, 20s, 30s, up to 60s
                  console.warn(`Rate limit hit (attempt ${attempts}/${GenericLLMService.MAX_RETRIES}), waiting ${waitTime/1000}s...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                } else if (error instanceof SyntaxError) {
                    console.error(`JSON Parsing Error: Retrying attempt ${attempts}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    throw error;
                }
            }
        }

        throw lastError || new Error('Max retries exceeded');

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            property: property.label,
            value: [],
            error: error.message
        };
    }
  }

  sanitizeJsonString(jsonString) {
    if (typeof jsonString !== 'string') return jsonString;
    
    return jsonString
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\f/g, '\\f')
      .replace(/\b/g, '\\b')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }

  /**
   * 🔍 ENHANCED: Better handling for all data types
   */
  cleanAndValidateResponse(rawResponse, property) {
    try {
      if (!property || !property.label) {
        console.error('Missing property parameter in cleanAndValidateResponse');
        return this.generateErrorResponse({label: 'Unknown', type: 'text'}, new Error('Missing property parameter'));
      }

      let response = rawResponse;
      
      if (response && response.choices && response.choices[0]) {
        const content = response.choices[0].message.content;
        if (typeof content === 'string') {
          response = content;
        }
      }

      if (typeof response === "string") {
        response = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        response = response.replace(/\/\/.*$/gm, '');
        response = response.replace(/\/\*[\s\S]*?\*\//g, '');
        response = response.replace(/,(\s*[}\]])/g, '$1');
        response = this.sanitizeJsonString(response);

        try {
          response = JSON.parse(response);
        } catch (parseError) {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            response = JSON.parse(this.sanitizeJsonString(jsonMatch[0]));
          } else {
            throw parseError;
          }
        }
      }

      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }

      let processedValues = [];
      
      // Format 1: Simple format with direct value field
      if (response.value !== undefined) {
        const simplifiedValue = this.simplifyValue(response.value, property.type);
        
        // 🔥 VALIDATION: Check if we got a complex object (shouldn't happen with new prompts)
        // Since we only use text/number/resource/date/url, objects should always be converted
        if (typeof simplifiedValue === 'object' && !Array.isArray(simplifiedValue)) {
          console.warn(`Complex object detected for ${property.type} property "${property.label}". Converting to string.`);
          const stringValue = this.extractObjectSummary(simplifiedValue, property.type);
          processedValues = [{
            value: stringValue,
            confidence: response.confidence || 0,
            evidence: response.evidence || {},
            metadata: response.metadata || {}
          }];
        }
        else if (Array.isArray(simplifiedValue)) {
          processedValues = simplifiedValue.map((val, idx) => ({
            value: val,
            confidence: response.confidence || 0,
            evidence: response.evidence || {},
            metadata: response.metadata || {},
            isMultiValue: true,
            multiValueIndex: idx
          }));
        } else {
          processedValues = [{
            value: simplifiedValue,
            confidence: response.confidence || 0,
            evidence: response.evidence || {},
            metadata: response.metadata || {}
          }];
        }
      }
      // Format 2: Complex format with property and values array
      else if (response.property && Array.isArray(response.values)) {
        processedValues = response.values.flatMap((v, idx) => {
          const simplifiedValue = this.simplifyValue(v.value, property.type);
          
          // 🔥 VALIDATION: Check if we got a complex object
          if (typeof simplifiedValue === 'object' && !Array.isArray(simplifiedValue)) {
            console.warn(`Complex object detected for ${property.type} property "${property.label}". Converting to string.`);
            const stringValue = this.extractObjectSummary(simplifiedValue, property.type);
            return {
              value: stringValue,
              confidence: v.confidence || 0,
              evidence: v.evidence || {},
              metadata: v.metadata || {}
            };
          }
          
          if (Array.isArray(simplifiedValue)) {
            return simplifiedValue.map((val, subIdx) => ({
              value: val,
              confidence: v.confidence || 0,
              evidence: v.evidence || {},
              metadata: v.metadata || {},
              isMultiValue: true,
              multiValueIndex: subIdx,
              originalIndex: idx
            }));
          }
          
          return {
            value: simplifiedValue,
            confidence: v.confidence || 0,
            evidence: v.evidence || {},
            metadata: v.metadata || {}
          };
        });
      }
      // Format 3: Direct property format
      else if (Object.keys(response).length === 1 && response[property.label]) {
        const propData = response[property.label];
        const simplifiedValue = this.simplifyValue(propData.value, property.type);
        
        // 🔥 VALIDATION: Check if we got a complex object
        if (typeof simplifiedValue === 'object' && !Array.isArray(simplifiedValue)) {
          console.warn(`Complex object detected for ${property.type} property "${property.label}". Converting to string.`);
          const stringValue = this.extractObjectSummary(simplifiedValue, property.type);
          processedValues = [{
            value: stringValue,
            confidence: propData.confidence || 0,
            evidence: propData.evidence || {},
            metadata: propData.metadata || {}
          }];
        }
        else if (Array.isArray(simplifiedValue)) {
          processedValues = simplifiedValue.map((val, idx) => ({
            value: val,
            confidence: propData.confidence || 0,
            evidence: propData.evidence || {},
            metadata: propData.metadata || {},
            isMultiValue: true,
            multiValueIndex: idx
          }));
        } else {
          processedValues = [{
            value: simplifiedValue,
            confidence: propData.confidence || 0,
            evidence: propData.evidence || {},
            metadata: propData.metadata || {}
          }];
        }
      }
      else {
        throw new Error('Unrecognized response format');
      }

      return {
        property: property.label,
        label: property.label,
        type: property.type,
        metadata: {
          property_type: property.type,
          extraction_method: 'llm_extraction',
          source: 'individual_analysis'
        },
        values: processedValues.map(v => ({
          value: v.value,
          confidence: v.confidence,
          evidence: v.evidence,
          id: `val-${Math.random().toString(36).substring(2, 9)}`,
          ...(v.isMultiValue && { 
            isMultiValue: true, 
            multiValueIndex: v.multiValueIndex,
            originalIndex: v.originalIndex 
          })
        }))
      };
      
    } catch (error) {
      console.error("Response processing failed:", error);
      return this.generateErrorResponse(property || {label: 'Unknown'}, error);
    }
  }

  /**
   * 🔥 ENHANCED: Type-aware value simplification with robust complex object handling
   */
  simplifyValue(value, propertyType) {
    if (value === null || value === undefined) {
      return '';
    }

    // 🔥 CRITICAL: We don't use 'object' type anymore, so ANY object should be converted to string
    // The only valid types are: text, number, resource, date, url
    // All of these expect string values

    // Handle string types
    if (typeof value === 'string') {
      // For resource type, enforce conciseness
      if (propertyType === 'resource') {
        // Extract just the resource name if it's embedded in a sentence
        const resourcePatterns = [
          /(?:dataset|model|tool|framework|library|corpus|benchmark):\s*([A-Za-z0-9\-_ ]+)/i,
          /([A-Z][A-Za-z0-9\-_]*(?:\s+[A-Z][A-Za-z0-9\-_]*){0,3})\s+(?:dataset|model|corpus|benchmark)/i,
          /using\s+([A-Za-z0-9\-_ ]+?)\s+(?:for|to|as)/i
        ];
        
        for (const pattern of resourcePatterns) {
          const match = value.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
        
        // If it's too long, truncate (max 50 chars for resources)
        if (value.length > 50) {
          return value.substring(0, 50).trim() + '...';
        }
      }
      
      // Check for semicolon-separated values
      if (value.includes(';') && value.length > 100) {
        const parts = value.split(';')
          .map(part => part.trim())
          .filter(part => part.length > 0);
        
        if (parts.length > 1) {
          return parts;
        }
      }
      
      return value;
    }

    // Handle primitive types
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      
      // Check if it's an array of objects
      if (value.every(item => typeof item === 'object' && item !== null)) {
        const summaries = value.map(item => {
          if (item.step && item.description) {
            return `${item.step}: ${item.description}`;
          } else if (item.toolkit && item.purpose) {
            return `${item.toolkit} (${item.purpose})`;
          } else if (item.strategy && item.note) {
            return `${item.strategy}: ${item.note}`;
          } else if (item.name && item.value) {
            return `${item.name}: ${item.value}`;
          } else {
            return Object.entries(item)
              .filter(([key, val]) => typeof val === 'string' && val.trim().length > 0)
              .map(([key, val]) => `${key}: ${val}`)
              .join(', ');
          }
        }).filter(summary => summary.trim().length > 0);
        
        return summaries.join('; ');
      } else {
        // Simple array of primitives
        return value.map(item => String(item)).join(', ');
      }
    }

    // Handle regular objects
    // CRITICAL: Since we don't use 'object' type, ALL objects should be converted to strings
    if (typeof value === 'object') {
      // Handle nested structures
      if (value.steps && Array.isArray(value.steps)) {
        return this.simplifyValue(value.steps, propertyType);
      }
      
      if (value.toolkit_dependencies && Array.isArray(value.toolkit_dependencies)) {
        return this.simplifyValue(value.toolkit_dependencies, propertyType);
      }
      
      // Try to extract a concise summary for deeply nested objects
      const summary = this.extractObjectSummary(value, propertyType);
      
      // For resource type, be extra aggressive with shortening
      if (propertyType === 'resource' && summary.length > 50) {
        return summary.substring(0, 50).trim() + '...';
      }
      
      return summary;
    }

    return String(value);
  }

  /**
   * 🔥 NEW: Extract a concise summary from complex nested objects
   */
  extractObjectSummary(obj, propertyType, depth = 0, maxDepth = 2) {
    if (depth > maxDepth) {
      return '[Nested Data]';
    }

    // For resource type, only extract the most important info
    if (propertyType === 'resource') {
      // Look for common resource-identifying fields
      if (obj.name) return String(obj.name);
      if (obj.dataset) return String(obj.dataset);
      if (obj.model) return String(obj.model);
      if (obj.title) return String(obj.title);
      
      // If no clear identifier, return first meaningful value
      const keys = Object.keys(obj);
      for (const key of keys) {
        const val = obj[key];
        if (typeof val === 'string' && val.length > 0 && val.length < 100) {
          return val;
        }
      }
      return '[Dataset/Resource]';
    }

    // For other types, create a more detailed but readable summary
    const parts = [];
    
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) continue;
      
      const formattedKey = key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        parts.push(`${formattedKey}: ${val}`);
      } else if (Array.isArray(val)) {
        if (val.length > 0) {
          if (typeof val[0] === 'object') {
            parts.push(`${formattedKey}: ${val.length} items`);
          } else {
            parts.push(`${formattedKey}: ${val.join(', ')}`);
          }
        }
      } else if (typeof val === 'object') {
        // Recursively process nested objects, but limit depth
        const nested = this.extractObjectSummary(val, propertyType, depth + 1, maxDepth);
        if (nested && nested !== '[Nested Data]') {
          parts.push(`${formattedKey}: ${nested}`);
        }
      }
      
      // Limit the number of parts to keep the summary concise
      if (parts.length >= 5) break;
    }
    
    return parts.length > 0 ? parts.join('; ') : '[Complex Data]';
  }

  extractJSONManually(text) {
    try {
        const jsonMatches = text.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\}))*\}/g);
        
        if (jsonMatches && jsonMatches.length > 0) {
            for (const match of jsonMatches) {
                try {
                    return JSON.parse(match);
                } catch {}
            }
        }

        const cleanedText = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Manual JSON extraction completely failed:', error);
        throw new SyntaxError('Could not extract valid JSON');
    }
  }

  validateResponse(response) {
    if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format: not an object');
    }

    if (!('property' in response) || !Array.isArray(response.values)) {
        throw new Error('Invalid response format: missing "property" or "values" array');
    }

    for (const valueEntry of response.values) {
        if (!('value' in valueEntry) || !('confidence' in valueEntry) || !('evidence' in valueEntry)) {
            throw new Error('Invalid value entry format: missing required fields');
        }

        if (typeof valueEntry.confidence !== 'number' || valueEntry.confidence < 0 || valueEntry.confidence > 1) {
            throw new Error(`Invalid confidence value: ${valueEntry.confidence}. Must be between 0 and 1.`);
        }

        if (!valueEntry.evidence || typeof valueEntry.evidence !== 'object') {
            throw new Error('Invalid evidence format in value entry');
        }
    }

    return true;
  }
}

export const getLLMService = () => {
  return GenericLLMService.getInstance();
};