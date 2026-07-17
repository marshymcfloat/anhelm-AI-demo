import { BrandKnowledgeService } from './brand-knowledge.service';

describe('BrandKnowledgeService', () => {
  const service = new BrandKnowledgeService();

  it('loads TRI Consulting Services from the file-backed store', async () => {
    const brand = await service.loadBrand('tri-consulting-services');

    expect(brand.config.displayName).toBe('TRI Consulting Services');
    expect(brand.sources).toContain('company-fact-sheet.md');
    expect(brand.context).toContain('Neurodivergent life coaching');
  });

  it('recognizes brand-related questions', async () => {
    const brand = await service.loadBrand('tri-consulting-services');

    expect(
      service.isRelevant('What coaching services do you offer?', brand.config),
    ).toBe(true);
  });

  it('recognizes casual service and pricing questions', async () => {
    const brand = await service.loadBrand('tri-consulting-services');

    expect(
      service.isRelevant(
        'Hey, tell me the services you offer and their prices',
        brand.config,
      ),
    ).toBe(true);
    expect(
      service.isRelevant('What are teh services you offer?', brand.config),
    ).toBe(true);
  });

  it('allows a simple greeting', async () => {
    const brand = await service.loadBrand('tri-consulting-services');

    expect(service.isRelevant('Hi', brand.config)).toBe(true);
  });

  it('rejects unrelated questions before an AI call', async () => {
    const brand = await service.loadBrand('tri-consulting-services');

    expect(
      service.isRelevant('What is the weather in Manila?', brand.config),
    ).toBe(false);
  });
});
