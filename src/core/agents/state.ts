import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

export const GlobalState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (oldArr, newArr) => {
      // For example, keep last 2 old messages plus new ones
      const truncatedOld = oldArr.slice(-3);
      return truncatedOld.concat(newArr);
    },
    default: () => [],
  }),
  instructions: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'No instructions given.',
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'No next state given', // or any default
  }),
  runtimeContext: Annotation<Record<string, any>>({
    // The reducer merges new overrides into the old context
    reducer: (oldVal, newVal) => ({ ...oldVal, ...newVal }),
    default: () => ({}),
  }),
});
