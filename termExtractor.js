export class TermExtractor {
    constructor(wordposInstance, maxTerms = 5) {
        this.wordpos = wordposInstance;
        this.maxTerms = maxTerms;
    }

    async getAdjs(source) {
        try {
            const adjectives = await this.wordpos.getAdjectives(source);
            
            // Filter out numerical values and empty strings
            const filtered = adjectives
                .filter(item => isNaN(item))
                .filter(item => item.trim() !== '');

            if (filtered.length === 0) {
                return [];
            }

            // Choose random starting index
            const maxStartIndex = Math.max(0, filtered.length - this.maxTerms);
            const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));
            
            // Return a slice of terms up to maxTerms
            return filtered.slice(startIndex, startIndex + this.maxTerms);
            
        } catch (error) {
            console.error('Error extracting adjectives:', error);
            return [];
        }
    }

    async getNouns(source) {
        try {
            const nouns = await this.wordpos.getNouns(source);
            return this.filterAndRandomize(nouns);
        } catch (error) {
            console.error('Error extracting nouns:', error);
            return [];
        }
    }

    async getVerbs(source) {
        try {
            const verbs = await this.wordpos.getVerbs(source);
            return this.filterAndRandomize(verbs);
        } catch (error) {
            console.error('Error extracting verbs:', error);
            return [];
        }
    }

    async getAdverbs(source) {
        try {
            const adverbs = await this.wordpos.getAdverbs(source);
            return this.filterAndRandomize(adverbs);
        } catch (error) {
            console.error('Error extracting adverbs:', error);
            return [];
        }
    }

    // Helper method to filter and randomize results
    filterAndRandomize(terms) {
        const filtered = terms
            .filter(item => isNaN(item))
            .filter(item => item.trim() !== '');

        if (filtered.length === 0) {
            return [];
        }

        const maxStartIndex = Math.max(0, filtered.length - this.maxTerms);
        const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));
        
        return filtered.slice(startIndex, startIndex + this.maxTerms);
    }
}