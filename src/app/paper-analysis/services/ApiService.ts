import { env } from 'next-runtime-env';
import RAGService from './RAGService';

class ApiService {
    private static instance: ApiService;
    private baseUrl: string;
    private ragService: RAGService;

    private constructor() {
        this.baseUrl = env('NEXT_PUBLIC_PAPER_ANALYSIS_API') || 'http://localhost:8000/api/v2';
        this.ragService = new RAGService();
    }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    async analyzeResearchFields(abstract, progressCallback) {
        try {
          const response = await fetch(`${this.baseUrl}/research-fields`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ abstract }),
          });
    
          if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
          }
    
          const data = await response.json();
    
          // Call the progress callback if provided
          if (progressCallback) {
            progressCallback({
              status: 'completed',
              progress: 100,
              fields: data.fields
            });
          }
    
          return data;
        } catch (error) {
          console.error('Error in analyzeResearchFields:', error);
          throw error;
        }
    }

    private async fetchWithTimeout(
        url: string,
        options: RequestInit & { timeout?: number } = {}
    ): Promise<Response> {
        const { timeout = 1000000, ...fetchOptions } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    public async analyzeMetadata(paperUrl: string): Promise<any> {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/metadata`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ paper_url: paperUrl }),
                    timeout: 10000,
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error analyzing metadata:', error);
            throw error;
        }
    }

    public async initiateResearchFieldsAnalysis(paperUrl, progressCallback) {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/research-fields`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ paper_url: paperUrl }),
                }
            );
    
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
    
            if (data.processing_info) {
                const progress = {
                    status: data.processing_info.status,
                    progress: data.processing_info.progress || 0,
                    fields: data.fields,
                    error: data.processing_info.error
                };
    
                progressCallback?.(progress);
    
                if (progress.status === 'completed') {
                    return {
                        fields: data.fields,
                        status: 'completed',
                        progress: 100
                    };
                }
            }
    
            return data;
        } catch (error) {
            console.error('Error initiating research fields analysis:', error);
            throw error;
        }
    }

    async analyzeResearchProblems(fieldId: string, llmProblem?: any) {
        if (!fieldId) {
            throw new Error('Field ID is required');
        }
    
        try {
            const requestPayload = {
                field_id: fieldId,
                llm_problem: llmProblem?.problem || null
            };
            console.log('ApiService: Sending request with payload:', requestPayload);
    
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/research-problems`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload),
                }
            );
    
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
    
            if (data.metadata?.field_id && data.metadata.field_id !== fieldId) {
                console.error('Server responded with different field ID:', {
                    requested: fieldId,
                    received: data.metadata?.field_id
                });
                throw new Error('Server processed wrong field ID');
            }
    
            return data;
        } catch (error) {
            console.error('ApiService: Error in analyzeResearchProblems:', error);
            throw error;
        }
    }

    public async detectTemplate(
        problemId: string,
        onProgress?: (progress: any) => void
    ): Promise<any> {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/template/${problemId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            /*if (onProgress) {
                this.wsService.onMessage((message) => {
                    if (message.component === 'lam_processing' && 
                        message.step === 'similar_papers') {
                        onProgress(message);
                    }
                });
            }*/

            return await response.json();

        } catch (error) {
            console.error('Error in detectTemplate:', error);
            throw error;
        }
    }

    public async detectTemplateFromLLM(
        problemTitle: string,
        problemDescription: string,
        metadata: any,
        researchFields: any
    ): Promise<any> {
        try {
            const requestData = {
                title: problemTitle,
                description: problemDescription,
                abstract: metadata?.abstract || '',
                research_field: researchFields?.selectedField?.name || ''
            };
    
            console.log('Request URL:', `${this.baseUrl}/template/generate-llm`);
            console.log('Request Data:', requestData);
    
            // Add CORS headers
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/template/generate-llm`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(requestData),
                    credentials: 'include'
                }
            );
    
            console.log('Response Status:', response.status);
            console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error Response:', errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log('Success Response:', data);
            return data;
        } catch (error) {
            console.error('Error in detectTemplateFromLLM:', error);
            throw error;
        }
    }

    public async parseArticle(url: string): Promise<any> {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/parse-article`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ paper_url: url }),
                    timeout: 30000,
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error parsing article:', error);
            throw error;
        }
    }

    public async analyzeContent(sections: Record<string, string>, templateData: any): Promise<any> {
        try {
          console.log('Starting content analysis');
    
          // Extract the correct template structure
          const template = this.extractTemplate(templateData);
    
          if (!template) {
            throw new Error('No valid template found for analysis');
          }
    
          console.log('Using template for analysis:', {
            id: template.id,
            name: template.name,
            propertiesCount: template.properties?.length
          });
    
          // Use RAG service for content analysis with the extracted template
          const analysisResults = await this.ragService.analyzePaperSections(sections, template, true);
    
          return {
            sections: sections,
            analysis_results: analysisResults,
            status: 'completed'
          };
        } catch (error) {
          console.error('Error in content analysis:', error);
          throw error;
        }
      }
    
      private extractTemplate(templateData: any): any {
        if (!templateData) {
          return null;
        }
    
        // Log the template data structure for debugging
        console.log('Template data structure:', JSON.stringify(templateData, null, 2));
    
        // Check all possible template locations in order of preference
        const template =
          (templateData.templates?.llm_template?.template?.properties && templateData.templates.llm_template.template) ||
          (templateData.templates?.selectedTemplate?.template?.properties && templateData.templates.selectedTemplate.template) ||
          (templateData.templates?.available?.template?.properties && templateData.templates.available.template) ||
          (templateData.template?.properties && templateData.template) ||
          (templateData.properties && templateData);
    
        if (!template) {
          console.error('Could not find valid template structure in:', templateData);
          return null;
        }
    
        console.log('Extracted template:', {
          id: template.id,
          name: template.name,
          propertiesCount: template.properties?.length
        });
    
        return template;
      }
}

export default ApiService;