import { z, ZodTypeAny, ZodSchema } from 'zod';
import { FieldSpec } from './types';

// Change the return type to explicitly be a ZodObject
export function buildZodFieldsSchema(
  fields: FieldSpec[],
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: { [key: string]: ZodTypeAny } = {};

  if (!fields || fields.length === 0) {
    console.log('No fields provided, returning empty object');
    return z.object({});
  }

  fields.forEach((field) => {
    let baseSchema: ZodTypeAny;

    // Choose the base Zod type based on field.type
    switch (field.type) {
      case 'string':
        baseSchema = z.string().describe(field.description || '');
        break;
      case 'number':
        baseSchema = z.number().describe(field.description || '');
        break;
      case 'boolean':
        baseSchema = z.boolean().describe(field.description || '');
        break;
      case 'object':
        baseSchema = z.object({}).describe(field.description || '');
        break;
      case 'array_string':
        baseSchema = z.array(z.string()).describe(field.description || '');
        break;
      case 'long_text':
        // "Long text" can be handled just like a normal string in Zod
        baseSchema = z.string().describe(field.description || '');
        break;

      case 'table':
        // If your "Table" is an array of objects, you might do:
        baseSchema = z
          .array(z.record(z.any()))
          .describe(field.description || '');
        break;

      case 'checkbox':
        // This is effectively a boolean
        baseSchema = z.boolean().describe(field.description || '');
        break;

      case 'list_of_jsons':
        // This might be an array of arbitrary objects
        baseSchema = z
          .array(z.record(z.any()))
          .describe(field.description || '');
        break;

      case 'file_to_url':
        // Could be a string that must be a URL
        baseSchema = z
          .string()
          .url()
          .describe(field.description || '');
        break;

      case 'file_to_text':
        // Could be a string that is just a text result
        baseSchema = z.string().describe(field.description || '');
        break;

      case 'multiple_files_to_urls':
        // Could be an array of valid URLs
        baseSchema = z
          .array(z.string().url())
          .describe(field.description || '');
        break;

      case 'options':
      case 'enum': {
        // If the user didn't provide any enumValues, handle it gracefully or throw
        if (!field.enumValues || field.enumValues.length === 0) {
          throw new Error(
            `No enumValues provided for ${field.name} of type ${field.type}`,
          );
        }

        // If it's multi-choice
        if (field.multiple) {
          // array of enumerated strings
          baseSchema = z.array(
            z.enum(field.enumValues as [string, ...string[]]),
          );
        } else {
          // single choice
          baseSchema = z.enum(field.enumValues as [string, ...string[]]);
        }

        // You can add a description or any additional checks here
        baseSchema = baseSchema.describe(field.description || '');
        break;
      }
      default:
        throw new Error(`Unsupported field type: ${field.type}`);
    }

    // Apply default if provided
    if (field.default !== undefined) {
      baseSchema = baseSchema.default(field.default);
    }

    // Apply optional if specified
    if (field.optional) {
      baseSchema = baseSchema.optional();
    }

    // Add the field to the shape
    shape[field.name] = baseSchema;
  });

  // Now this is definitely a ZodObject
  return z.object(shape);
}
