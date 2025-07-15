export interface ModelParameters {
  [key: string]: any;
}

export interface ModelConfiguration {
  id: string;
  name: string;
  provider: string;
  availability: string;
  description?: string;
  parameters: ModelParameters;
}
