import { BadGatewayException } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { BrandKnowledge, ModelBrandResponse } from './brand.types';

interface OpenAIResponseParser {
  parseResponse(text: string | undefined): ModelBrandResponse;
  createSystemInstruction(brand: BrandKnowledge): string;
}

describe('OpenAIService', () => {
  const service = new OpenAIService();
  const brand: BrandKnowledge = {
    config: {
      id: 'test-brand',
      displayName: 'Test Brand',
      aliases: ['Test'],
      enabled: true,
      refusalMessage: 'Business questions only.',
      insufficientInformationMessage: 'I do not have that detail yet.',
      relevance: { keywords: ['service'], genericBrandQuestions: [] },
    },
    context: 'Test context',
    sources: ['facts.md'],
  };
  const parseResponse = (text: string | undefined) =>
    (service as unknown as OpenAIResponseParser).parseResponse(text);
  const createSystemInstruction = () =>
    (service as unknown as OpenAIResponseParser).createSystemInstruction(brand);

  it('parses a valid structured response', () => {
    expect(
      parseResponse('{"status":"answered","answer":"Verified answer."}'),
    ).toEqual({
      status: 'answered',
      answer: 'Verified answer.',
    });
  });

  it('rejects text without the required structured fields', () => {
    expect(() => parseResponse('Verified answer.')).toThrow(
      BadGatewayException,
    );
  });

  it('rejects an empty response', () => {
    expect(() => parseResponse(undefined)).toThrow(BadGatewayException);
  });

  it('answers supported parts of compound questions', () => {
    const instruction = createSystemInstruction();

    expect(instruction).toContain(
      'answer every supported part. If only one detail is missing',
    );
    expect(instruction).toContain('do not reject the entire question');
  });

  it('requires a natural customer-facing voice without internal language', () => {
    const instruction = createSystemInstruction();

    expect(instruction).toContain('Speak naturally as the business');
    expect(instruction).toContain(
      'Never mention approved data, verified information',
    );
    expect(instruction).toContain('Usually stay under 140 words');
  });

  it('handles greetings and minor spelling mistakes naturally', () => {
    const instruction = createSystemInstruction();

    expect(instruction).toContain('Treat greetings as answered');
    expect(instruction).toContain('minor spelling mistakes');
  });
});
