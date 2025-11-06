
// FIX: Define and export BoundingBox type to resolve circular dependency and export errors.
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Represents a single change to a field value for audit purposes.
export interface AuditLog {
  timestamp: string;
  oldValue: any;
  newValue: any;
  // user: string; // In a real app, you'd track which user made the change.
}


// A helper type to represent a field that has both a value and its location on the document.
export type FieldValue<T> = {
  value: T | null;
  bounding_box?: BoundingBox[];
  history?: AuditLog[];
};

export interface LineItem {
  page_number?: FieldValue<number>;
  [key: string]: FieldValue<string | number | undefined> | undefined;
}

export interface DocumentData {
  document_type: DocumentType;
  items: LineItem[];
  [key: string]: FieldValue<string | number> | LineItem[] | string | undefined;
}

export type DocumentType = string;

export interface ProcessResult {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error' | 'confirmed';
    data: DocumentData | null;
    error: string | null;
    processedAt?: string;
}

// Configuration for each document field
export type OutputFormat = 'none' | 'date-yyyy-mm-dd';

export interface DocumentFieldConfig {
  key: string;
  label: string;
  enabled: boolean;
  isItemField: boolean;
  outputFormat: OutputFormat;
  type: 'string' | 'number';
  instruction?: string;
}

export interface DocumentConfig {
  [key: DocumentType]: DocumentFieldConfig[];
}

// Configuration for output settings
export interface OutputFieldConfig {
    key: string;
    label: string;
    enabled: boolean;
    isItemField: boolean;
    formatInstruction: string;
}

export interface OutputConfig {
    [key: DocumentType]: OutputFieldConfig[];
}
