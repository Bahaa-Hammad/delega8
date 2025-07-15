export enum KnowledgeStatus {
  UPLOADED = 'UPLOADED',
  EMBEDDED = 'EMBEDDED',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export enum ColumnType {
  TEXT = 'text',
  NUMBER = 'number',
  CHECKBOX = 'checkbox',
  LINK = 'link',
  JSON = 'json',
}

export enum SupportedFileFormats {
  PDF = '.pdf',
  CSV = '.csv',
  JSON = '.json',
  TXT = '.txt',
  MD = '.md',
}

export enum TableOwner {
  USER,
  PUBLIC,
}
