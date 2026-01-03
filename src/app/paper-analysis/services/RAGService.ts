import { getLLMService } from './GenericLLMService';

class RAGService {
    private retryDelays: number[];
    private maxRetries: number;
    private static instance: RAGService | null = null;
    private cachedSections: string | null = null;
    private lastApiCallTime: number = 0;
    private minDelayBetweenCalls: number = 100; // Reduced from 2000ms since we're doing parallel batches
    private requestQueue: any[] = [];
    private isProcessing: boolean = false;

    constructor() {
        if (RAGService.instance) {
            throw new Error('Use RAGService.getInstance()');
        }
        this.retryDelays = [300, 600, 1200, 2400];
        this.maxRetries = 4;
        RAGService.instance = this;
    }

    static getInstance(): RAGService {
        if (!RAGService.instance) {
            RAGService.instance = new RAGService();
        }
        return RAGService.instance;
    }

    /**
     * 🚀 OPTIMIZED: Main method to analyze paper sections using parallel batch processing
     */
    async analyzePaperSections(sections: Record<string, string>, template: any, forceUpdate = false) {
        try {
            const llmService = getLLMService();
            
            console.log('🚀 Starting OPTIMIZED paper analysis with template:', {
                templateName: template.name || template.template?.name,
                propertyCount: template.properties?.length || template.template?.properties?.length
            });

            const startTime = Date.now();

            // Use the optimized batch analysis method with parallel processing
            const results = await llmService.analyzePaperSections(sections, template);
            
            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log(`✅ Paper analysis completed in ${elapsedTime}s`, {
                propertiesExtracted: Object.keys(results).length,
                sampleProperties: Object.keys(results).slice(0, 3)
            });

            return results;

        } catch (error) {
            console.error('RAG Service analysis error:', error);
            
            // Fallback to sequential processing if parallel fails
            console.log('⚠️ Parallel processing failed, attempting sequential fallback...');
            return this.processPropertiesSequentially(sections, template, forceUpdate);
        }
    }

    /**
     * 🔄 Fallback method: Process properties one by one (sequential)
     * This is only used if the parallel batch processing fails
     */
    private async processPropertiesSequentially(sections: Record<string, string>, template: any, forceUpdate = false) {
        const properties = template.template?.properties || template.properties;
        if (!properties) {
            throw new Error('Invalid template structure: no properties found');
        }
        
        const results: Record<string, any> = {};
        const llmService = getLLMService();
        
        console.log(`🐌 Processing ${properties.length} properties sequentially (fallback mode)...`);

        for (const property of properties) {
            console.log(`Processing property: ${property.label} (${properties.indexOf(property) + 1}/${properties.length})`);
            
            try {
                // Ensure minimum delay between calls
                await this.enforceRateLimit();
                
                const response = await this.processPropertyWithRetry(
                    property, 
                    sections, 
                    forceUpdate, 
                    llmService
                );
                
                results[property.id] = {
                    ...response,
                    label: property.label,
                    type: property.type
                };
                
                // Small delay even on success
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error(`Error processing property ${property.label}:`, error);
                results[property.id] = {
                    label: property.label,
                    type: property.type,
                    values: [],
                    error: error.message
                };
            }
        }
        
        return results;
    }

    /**
     * Ensures minimum delay between API calls
     */
    private async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCallTime;
        
        if (timeSinceLastCall < this.minDelayBetweenCalls) {
            const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
            console.log(`⏱️ Rate limiting: waiting ${waitTime}ms before next call`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastApiCallTime = Date.now();
    }

    /**
     * Process a single property with exponential backoff retry
     */
    private async processPropertyWithRetry(
        property: any, 
        sections: any, 
        forceUpdate: boolean,
        llmService: any,
        attempt = 0
    ): Promise<any> {
        try {
            return await llmService.analyze(property, sections, forceUpdate);
        } catch (error: any) {
            const isRateLimitError = 
                error.message?.includes('429') || 
                error.message?.includes('Too Many Requests') ||
                error.message?.includes('Service tier capacity exceeded') ||
                error.code === '3505';
            
            if (isRateLimitError && attempt < this.maxRetries) {
                const delay = this.retryDelays[attempt] || this.retryDelays[this.retryDelays.length - 1];
                console.warn(`⚠️ Rate limit hit for ${property.label}, retrying in ${delay/1000}s (attempt ${attempt + 1}/${this.maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                return this.processPropertyWithRetry(
                    property, 
                    sections, 
                    forceUpdate, 
                    llmService, 
                    attempt + 1
                );
            }
            
            throw error;
        }
    }

    /**
     * Utility method to validate sections format
     */
    validateSections(sections: Record<string, string>): boolean {
        if (!sections || typeof sections !== 'object') {
            return false;
        }
        
        const sectionEntries = Object.entries(sections);
        if (sectionEntries.length === 0) {
            return false;
        }
        
        // Check that each section has non-empty content
        return sectionEntries.every(([key, value]) => 
            typeof key === 'string' && 
            typeof value === 'string' && 
            value.trim().length > 0
        );
    }

    /**
     * Utility method to get analysis statistics
     */
    getAnalysisStats(results: Record<string, any>) {
        const totalProperties = Object.keys(results).length;
        const successfulProperties = Object.values(results).filter(
            result => result.values && result.values.length > 0 && result.values[0].value
        ).length;
        const failedProperties = totalProperties - successfulProperties;
        
        return {
            totalProperties,
            successfulProperties,
            failedProperties,
            successRate: totalProperties > 0 ? (successfulProperties / totalProperties) * 100 : 0
        };
    }

    /**
     * 🔍 Utility method to analyze results by property type
     */
    analyzeResultsByType(results: Record<string, any>) {
        const typeStats: Record<string, {count: number, successful: number, avgConfidence: number}> = {};
        
        Object.values(results).forEach(result => {
            const type = result.type || 'unknown';
            
            if (!typeStats[type]) {
                typeStats[type] = {
                    count: 0,
                    successful: 0,
                    avgConfidence: 0
                };
            }
            
            typeStats[type].count++;
            
            if (result.values && result.values.length > 0 && result.values[0].value) {
                typeStats[type].successful++;
                const confidences = result.values
                    .map((v: any) => v.confidence || 0)
                    .filter((c: number) => c > 0);
                
                if (confidences.length > 0) {
                    typeStats[type].avgConfidence = 
                        confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
                }
            }
        });
        
        return typeStats;
    }

    /**
     * 🧹 Clear cached sections (useful when switching papers)
     */
    clearCache() {
        this.cachedSections = null;
        console.log('✅ RAG Service cache cleared');
    }
}

export default RAGService;