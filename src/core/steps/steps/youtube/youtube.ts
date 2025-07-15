import { ToolStep } from '@core/tools/types'; // Your existing ToolStep interface
import { YoutubeLoader } from '@langchain/community/document_loaders/web/youtube';
import { replacePlaceholders } from '../helper';
import { YouTubeStepSpec, YouTubeStepOutput } from './types';
export function createYouTubeTranscriptStep(
  config: YouTubeStepSpec,
): ToolStep<any, YouTubeStepOutput> {
  return {
    loopOn: config.loopOn,
    isLoop: config.isLoop || false,
    outputNamespace: config.outputNamespace,
    description: 'Loads transcripts from a YouTube video',
    conditions: config.conditions,
    func: async (context: any): Promise<YouTubeStepOutput> => {
      // 1) Optionally parse or validate the context if you have a schema
      // youtubeStepSchema.parse(config);

      // 2) If you're using placeholders in config, replace them with values from context
      console.log('context:', context);
      console.log('config:', config);
      const resolvedConfig = replacePlaceholders(config, context);

      console.log('resolvedConfig', resolvedConfig);
      // 3) Create the loader with the resolved values
      const loader = YoutubeLoader.createFromUrl(resolvedConfig.url, {
        language: resolvedConfig.language,
        addVideoInfo: resolvedConfig.addVideoInfo,
      });

      // 4) Load the transcripts (and possibly video info)
      const docs = await loader.load();

      // 5) Return the transcripts. The shape is up to you,
      // but typically store them under a `youtube` namespace
      return { docs };
    },
  };
}
