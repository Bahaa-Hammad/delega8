export interface FieldSpec {
  name: string;
  // Add new types here
  type:
    | 'string'
    | 'long_text'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array_string'
    | 'table'
    | 'checkbox'
    | 'text_list'
    | 'list_of_jsons'
    | 'file_to_url'
    | 'file_to_text'
    | 'multiple_files_to_urls'
    | 'options'
    | 'enum';
  description: string;
  optional?: boolean;
  default?: any;
  enumValues?: string[];
  multiple?: boolean;
}

// In your types or a dedicated file:

export interface Context {
  [key: string]: any;
}
