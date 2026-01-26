// utils.ts

// Custom Error Class for application-specific errors
export class ApplicationError extends Error {
    details: string;
    constructor(message: string, details: string) {
        super(message);
        this.name = 'ApplicationError';
        this.details = details;
    }
}

// --- Apollo API Wrapper ---
export class ApolloAPI {
    private apiKey: string;
    private baseUrl: string = 'https://api.apollo.io/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async fetchApollo(endpoint: string, body: any): Promise<any> {
        const url = `${this.baseUrl}/${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': this.apiKey,
            },
            body: JSON.stringify({ api_key: this.apiKey, ...body }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new ApplicationError(`Apollo API Error: ${endpoint}`, JSON.stringify(errorBody));
        }

        return response.json();
    }

    // Search for organizations (companies)
    async searchOrganizations(filters: any): Promise<any[]> {
        const response = await this.fetchApollo('mixed_companies/search', {
            q_organization_job_titles: filters.q_organization_job_titles,
            organization_locations: filters.organization_locations,
            organization_num_employees_ranges: filters.organization_num_employees_ranges,
            // Add other filters here
            per_page: 50 // Limit to 50 companies for initial testing
        });

        return response.organizations.map((org: any) => ({
            id: org.id,
            name: org.name,
            domain: org.website_url,
            size: org.num_employees_range,
            industry: org.industry,
            location: org.city,
        }));
    }

    // Search for people (leads)
    async searchPeople(filters: any): Promise<any[]> {
        const response = await this.fetchApollo('mixed_people/search', {
            organization_ids: filters.organization_ids,
            person_titles: filters.person_titles,
            // Add other filters here
            per_page: 10 // Limit to 10 people per company for initial testing
        });

        return response.people.map((person: any) => ({
            id: person.id,
            name: `${person.first_name} ${person.last_name}`,
            title: person.title,
            seniority: person.seniority,
            linkedin_url: person.linkedin_url,
        }));
    }
}

// --- BetterContact API Wrapper ---
export class BetterContactAPI {
    private apiKey: string;
    private baseUrl: string = 'https://app.bettercontact.rocks/api/v2';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async fetchBetterContact(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
        const url = `${this.baseUrl}/${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
        };

        const config: RequestInit = {
            method,
            headers,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            const errorBody = await response.json();
            throw new ApplicationError(`BetterContact API Error: ${endpoint}`, JSON.stringify(errorBody));
        }

        return response.json();
    }

    // Submit a batch of leads for enrichment
    async submitEnrichment(leads: any[]): Promise<{ id: string }> {
        const body = {
            data: leads,
            enrich_email_address: true,
            enrich_phone_number: true,
            // Note: We are not using a webhook here, but will poll for results
        };

        const response = await this.fetchBetterContact('async', 'POST', body);
        
        if (!response.success || !response.id) {
            throw new ApplicationError('BetterContact Submission Failed', JSON.stringify(response));
        }

        return { id: response.id };
    }

    // Poll for enrichment results (simplified polling for Deno function)
    async pollForResults(requestId: string): Promise<any[]> {
        // In a real-world scenario, this would poll multiple times with delays.
        // For this Deno function, we'll assume a short delay and one check.
        // A dedicated service would be better for long-running tasks.
        
        // Wait for a few seconds to allow processing
        await new Promise(resolve => setTimeout(resolve, 5000)); 

        const response = await this.fetchBetterContact(`async/${requestId}`, 'GET');

        if (!response.success) {
            throw new ApplicationError('BetterContact Polling Failed', JSON.stringify(response));
        }

        // The response contains the results array
        return response.results || [];
    }
}
