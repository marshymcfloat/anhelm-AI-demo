export interface BrandConfig {
  id: string;
  displayName: string;
  aliases: string[];
  enabled: boolean;
  refusalMessage: string;
  insufficientInformationMessage: string;
  relevance: {
    keywords: string[];
    genericBrandQuestions: string[];
  };
}

export interface BrandKnowledge {
  config: BrandConfig;
  context: string;
  sources: string[];
}

export type BrandAnswerStatus = 'answered' | 'refused' | 'insufficient';

export interface BrandAnswer {
  brandId: string;
  status: BrandAnswerStatus;
  answer: string;
  model?: string;
}

export interface ModelBrandResponse {
  status: BrandAnswerStatus;
  answer: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}
