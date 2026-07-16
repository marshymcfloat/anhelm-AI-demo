import { BadGatewayException } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiBrandResponse } from './brand.types';

interface GeminiResponseParser {
  parseResponse(text: string | undefined): GeminiBrandResponse;
}

describe('GeminiService', () => {
  const service = new GeminiService();
  const parseResponse = (text: string | undefined) =>
    (service as unknown as GeminiResponseParser).parseResponse(text);

  it('parses a valid structured response', () => {
    expect(
      parseResponse('{"status":"answered","answer":"Verified answer."}'),
    ).toEqual({
      status: 'answered',
      answer: 'Verified answer.',
    });
  });

  it('parses JSON wrapped in a Markdown code fence', () => {
    expect(
      parseResponse(
        '```json\n{"status":"answered","answer":"Verified answer."}\n```',
      ),
    ).toEqual({
      status: 'answered',
      answer: 'Verified answer.',
    });
  });

  it('parses JSON surrounded by model commentary', () => {
    expect(
      parseResponse(
        'Here is the response:\n{"status":"insufficient","answer":"Not verified."}',
      ),
    ).toEqual({
      status: 'insufficient',
      answer: 'Not verified.',
    });
  });

  it('rejects text without the required structured fields', () => {
    expect(() => parseResponse('Verified answer.')).toThrow(
      BadGatewayException,
    );
  });
});
