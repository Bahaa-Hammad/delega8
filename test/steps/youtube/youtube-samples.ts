import { YouTubeStepSpec } from '@src/core/steps/steps/youtube/types';

export const sampleYouTubeStep: YouTubeStepSpec = {
  type: 'youtube',
  url: '{url}', // any test video link
  language: 'en',
  addVideoInfo: false,
  isLoop: false,
  loopOn: undefined,
  outputNamespace: 'youtubeDocs',
  conditions: [],
};
