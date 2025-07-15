import { BaseStepSpec } from '@core/steps/types';
import { Document } from 'langchain/document';
import { z } from 'zod';
export interface YouTubeStepSpec extends BaseStepSpec {
  type: 'youtube';
  url: string; // The YouTube URL, e.g. "https://youtu.be/<id>"
  language?: string; // ISO 639-1 code, e.g. "en"
  addVideoInfo?: boolean;
  // ... other properties if needed
}
export interface YouTubeStepOutput {
  docs: Document<Record<string, any>>[];
}

export const youtubeStepOutputSchema = z.object({
  docs: z.array(z.any()),
});
