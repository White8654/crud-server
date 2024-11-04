// types.ts
export interface TableSchema {
  tableName: string;
  alias: string;
  fields: {
    [key: string]: {
      type: string;
      required?: boolean;
      enum?: string[];
      default?: any;
      format?: string;
    };
  };
  createdAt?: string;
  lastUpdated?: string;
}

export interface TableRenameRequest {
  oldTableName: string;
  newTableName: string;
}


const apiUrl = "/api"

// Generic API request handler
const apiRequest = async <T>(
  endpoint: string,
  method: string,
  body?: any
): Promise<T> => {
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'API request failed');
    }

    if (method === 'DELETE') {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// Schema Registry Operations
export const registerSchema = async (schema: TableSchema): Promise<void> => {
  await apiRequest('/schema', 'POST', schema);
};

export const getSchema = async (identifier: string): Promise<TableSchema> => {
  return await apiRequest(`/schema/${identifier}`, 'GET');
};

export const listSchemas = async (): Promise<TableSchema[]> => {
  return await apiRequest('/schema', 'GET');
};

export const updateSchema = async (
  tableName: string,
  newAlias: string
): Promise<void> => {
  await apiRequest(`/schema/${tableName}`, 'PUT', { alias: newAlias });
};

export const deleteSchema = async (tableName: string): Promise<void> => {
  await apiRequest(`/schema/${tableName}`, 'DELETE');
};

// Table Operations
export const listTables = async (): Promise<string[]> => {
  return await apiRequest('/table', 'GET');
};

export const dropTable = async (tableName: string): Promise<void> => {
  await apiRequest(`/table/${tableName}`, 'DELETE');
};

export const renameTable = async (request: TableRenameRequest): Promise<void> => {
  await apiRequest('/table/rename', 'PUT', request);
};

// Authentication
export const authenticateUser = async (): Promise<any> => {
  return await apiRequest('/device-code', 'GET');
};

// Item Operations
export const addItem = async (
  tableName: string,
  itemData: Record<string, any>
): Promise<void> => {
  await apiRequest('/items', 'POST', { tableName, ...itemData });
};


export const updateHead = async(
  tableName: string,
  oldFieldName: string,
  newFieldName: string,
): Promise<void> => {
  await apiRequest('/field', 'PUT', { tableName, oldFieldName,newFieldName});
};

export const getItems = async (tableName: string): Promise<any[]> => {
  return await apiRequest(`/items/${tableName}`, 'GET');

};

export const getItemById = async (
  tableName: string,
  id: number
): Promise<any> => {
  return await apiRequest(`/items/${tableName}/${id}`, 'GET');
};

export const updateItem = async (
  tableName: string,
  id: number,
  updates: Record<string, any>
): Promise<void> => {
  
  await apiRequest(`/items/${tableName}/${id}`, 'PUT', updates);
};

export const deleteItem = async (
  tableName: string,
  id: number
): Promise<void> => {
  await apiRequest(`/items/${tableName}/${id}`, 'DELETE');
};

// Utility function to validate item against schema
export const validateItemAgainstSchema = async (
  tableName: string,
  item: Record<string, any>
): Promise<boolean> => {
  try {
    const schema = await getSchema(tableName);
    
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      // Check required fields
      if (fieldDef.required && !(fieldName in item)) {
        throw new Error(`Missing required field: ${fieldName}`);
      }

      if (fieldName in item) {
        const value = item[fieldName];
        
        // Type checking
        if (fieldDef.type === 'number' && typeof value !== 'number') {
          throw new Error(`${fieldName} must be a number`);
        }
        if (fieldDef.type === 'string' && typeof value !== 'string') {
          throw new Error(`${fieldName} must be a string`);
        }
        if (fieldDef.type === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`${fieldName} must be a boolean`);
        }

        // Enum validation
        if (fieldDef.enum && !fieldDef.enum.includes(value)) {
          throw new Error(`${fieldName} must be one of: ${fieldDef.enum.join(', ')}`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
};

// Example usage:
// const createOrganization = async (orgData: Record<string, any>) => {
//   await validateItemAgainstSchema('Organizations', orgData);
//   await addItem('Organizations', orgData);
// };