import { createYouTubeTranscriptStep } from '@src/core/steps/steps/youtube/youtube';
import { sampleYouTubeStep } from './youtube-samples';

describe('YouTube Step (e2e)', () => {
  // Increase the default timeout (5s) to e.g. 30s
  beforeAll(() => {
    jest.setTimeout(30_000); // 30s
  });

  it('should load transcripts from the given YouTube URL', async () => {
    jest.retryTimes(3);

    const youtubeStep = createYouTubeTranscriptStep(sampleYouTubeStep);
    const context = {
      url: 'https://www.youtube.com/watch?v=uSTTAJh9xAQ',
    };

    const result = await youtubeStep.func(context);

    expect(result).toHaveProperty('docs');
    expect(Array.isArray(result.docs)).toBe(true);
  });
});
