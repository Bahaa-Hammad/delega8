import { CompositeToolConfigSpec } from '@core/tools/types';
import { ToolEntity } from './entities/tool.entity';

// Each key corresponds to a valid `type` value

export function toCompositeToolConfigSpec(
  entity: ToolEntity,
): CompositeToolConfigSpec {
  const { id, name, description, fields = [], steps = [] } = entity;

  if (typeof name !== 'string' || typeof description !== 'string') {
    throw new Error('Invalid tool data: name/description must be strings.');
  }

  return {
    id,
    name,
    description,
    fields,
    steps: steps,
  };
}
