import * as ivm from 'isolated-vm';
import { JavaScriptStepSpec, JavaScriptStepOutput } from './types';
import { ToolStep } from '@core/tools/types';

// Adjust the import path to wherever your replace function lives
import { replacePlaceholders } from '../helper';
export function createJavaScriptStep(
  spec: JavaScriptStepSpec,
): ToolStep<any, JavaScriptStepOutput> {
  return {
    loopOn: spec.loopOn,
    isLoop: spec.isLoop || false,
    outputNamespace: spec.outputNamespace,
    description:
      'Runs arbitrary JS in an isolated VM context (production-safe)',
    conditions: spec.conditions,
    func: async (context: any) => {
      const finalSpec = replacePlaceholders(spec, context);

      // 1) Create a new isolate
      const isolate = new ivm.Isolate({ memoryLimit: 10 });

      // 2) Create a context in this isolate
      const isolateContext = await isolate.createContext();

      // 3) Jail the global reference
      const jail = isolateContext.global;
      await jail.set('global', jail.derefInto());

      // 4) Resolve placeholders in the user code
      const finalCode = replacePlaceholders(finalSpec.code, context);

      // 5) Wrap user code to capture its return value
      const scriptCode = `
        (function runUserCode(context) {
          const userFn = () => {
            ${finalCode}
          };
          const result = userFn();
          context.__result = (typeof result === 'undefined') ? undefined : result;
        })(global.__context);
      `;

      // 6) Compile the script
      const script = await isolate.compileScript(scriptCode);

      // 7) Copy the Node context into the isolate
      await jail.set('__context', context, { copy: true });

      // 8) Execute user code
      await script.run(isolateContext);

      // 9) Get the updated context back, copying it into Node
      const resultObj = await jail.get('__context', { copy: true });

      // 10) Return the user’s result
      return { result: resultObj.__result };
    },
  };
}
