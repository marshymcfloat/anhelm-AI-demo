import { BadGatewayException } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { ModelBrandResponse } from './brand.types';

interface OpenAIResponseParser {
  parseResponse(text: string | undefined): ModelBrandResponse;
}

describe('OpenAIService', () => {
  const service = new OpenAIService();
  const parseResponse = (text: string | undefined) =>
    (service as unknown as OpenAIResponseParser).parseResponse(text);

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
});
