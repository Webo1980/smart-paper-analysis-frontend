import { getPapersByTitle, getAbstractByDoi, getAbstractByTitle } from '../../../services/semanticScholar';

export class MetadataService {
  static async parseIdentifier(input) {
    const doiRegex = /10.\d{4,9}\/[-._;()\/:A-Z0-9]+/i;
    const doiMatch = input.match(doiRegex);
    
    return {
      type: doiMatch ? 'doi' : 'title',
      value: doiMatch ? doiMatch[0] : input
    };
  }

  static async fetchMetadata(input) {
    try {
      const { type, value } = await this.parseIdentifier(input);
      let data;

      if (type === 'doi') {
        data = await getAbstractByDoi(value);
      } else {
        data = await getAbstractByTitle(value);
      }

      return {
        title: data.title || null,
        authors: data.authors?.map(author => author.name) || [],
        abstract: data.abstract || null,
        doi: data.externalIds?.DOI || null,
        url: data.url || null,
        publicationDate: data.year ? new Date(data.year, 0).toISOString() : null,
      };
    } catch (error) {
      console.error('Metadata fetch error:', error);
      throw new Error('Failed to fetch paper metadata');
    }
  }
}

export default MetadataService;