import {
  CreateTableCommand,
  DescribeTableCommand,
  CreateTableCommandInput,
  KeySchemaElement,
  AttributeDefinition,
  ResourceInUseException,
  ResourceNotFoundException,
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  DynamoDBDocumentClient
} from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "@/lib/dbconfig";

// Custom error classes
class TableRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TableRegistryError';
  }
}

class SchemaNotFoundError extends TableRegistryError {
  constructor(identifier: string) {
    super(`Schema not found for identifier: ${identifier}`);
    this.name = 'SchemaNotFoundError';
  }
}

class TableOperationError extends TableRegistryError {
  constructor(operation: string, tableName: string, originalError: Error) {
    super(`Failed to ${operation} table ${tableName}: ${originalError.message}`);
    this.name = 'TableOperationError';
  }
}

// Constants and Interfaces (unchanged)
const REGISTRY_TABLE_NAME = "TableRegistry";

interface TableDefinition {
  KeySchema: KeySchemaElement[];
  AttributeDefinitions: AttributeDefinition[];
  ProvisionedThroughput: {
    ReadCapacityUnits: number;
    WriteCapacityUnits: number;
  };
}

interface TableField {
  name: string;
  type: string;
  required?: boolean;
}

interface TableSchema {
  tableName: string;
  alias: string;
  fields: TableField[];
  createdAt: string;
  lastUpdated: string;
}

interface SchemaUpdates {
  alias?: string;
  fields?: TableField[];
}

// Enhanced helper functions with proper error handling
const createTableIfNotExists = async (
  tableName: string,
  tableDefinition: TableDefinition
): Promise<void> => {
  try {
    await ddbDocClient.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: tableDefinition.KeySchema,
        AttributeDefinitions: tableDefinition.AttributeDefinitions,
        ProvisionedThroughput: tableDefinition.ProvisionedThroughput
      })
    );
    console.log(`Table ${tableName} created successfully.`);
    await waitForTableToBeActive(tableName);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "ResourceInUseException") {
        console.log(`Table ${tableName} already exists.`);
        return;
      }
      throw new TableOperationError('create', tableName, error);
    }
    throw error;
  }
};

const waitForTableToBeActive = async (tableName: string): Promise<void> => {
  let attempts = 0;
  const maxAttempts = 30; // Maximum number of attempts (30 seconds)
  
  while (attempts < maxAttempts) {
    try {
      const { Table } = await ddbDocClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      
      if (Table?.TableStatus === "ACTIVE") {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      if (error instanceof Error) {
        throw new TableOperationError('check status for', tableName, error);
      }
      throw error;
    }
  }
  throw new TableOperationError('wait for', tableName, new Error('Timeout waiting for table to become active'));
};

// Enhanced main functions with comprehensive error handling
const initializeRegistry = async (): Promise<void> => {
  try {
    await createTableIfNotExists(REGISTRY_TABLE_NAME, {
      KeySchema: [
        { AttributeName: "tableName", KeyType: "HASH" },
        { AttributeName: "alias", KeyType: "RANGE" }
      ],
      AttributeDefinitions: [
        { AttributeName: "tableName", AttributeType: "S" },
        { AttributeName: "alias", AttributeType: "S" }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new TableRegistryError(`Failed to initialize registry: ${error.message}`);
    }
    throw error;
  }
};

const createDynamoDBTable = async (
  tableName: string,
  fields: TableField[]
): Promise<void> => {
  try {
    const keySchema: KeySchemaElement[] = [
      { AttributeName: "id", KeyType: "HASH" }
    ];
    const attributeDefinitions: AttributeDefinition[] = [
      { AttributeName: "id", AttributeType: "N" }
    ];

    const params: CreateTableCommandInput = {
      TableName: tableName,
      KeySchema: keySchema,
      AttributeDefinitions: attributeDefinitions,
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      }
    };

    await ddbDocClient.send(new CreateTableCommand(params));
    await waitForTableToBeActive(tableName);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "ResourceInUseException") {
        console.log(`Table ${tableName} already exists.`);
        return;
      }
      throw new TableOperationError('create', tableName, error);
    }
    throw error;
  }
};

const registerTableSchema = async (
  tableName: string,
  alias: string,
  fields: TableField[]
): Promise<void> => {
  try {
    // Check if schema already exists
    try {
      await getTableSchema(tableName);
      throw new TableRegistryError(`Schema already exists for table ${tableName}`);
    } catch (error) {
      if (!(error instanceof SchemaNotFoundError)) {
        throw error;
      }
    }

    const params = {
      TableName: REGISTRY_TABLE_NAME,
      Item: {
        tableName,
        alias,
        fields,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };

    await ddbDocClient.send(new PutCommand(params));
    await createDynamoDBTable(tableName, fields);
  } catch (error) {
    if (error instanceof Error) {
      throw new TableRegistryError(`Failed to register schema: ${error.message}`);
    }
    throw error;
  }
};

const getTableSchema = async (identifier: string): Promise<TableSchema> => {
  try {
    const params = {
      TableName: REGISTRY_TABLE_NAME,
      FilterExpression: "tableName = :tableName OR alias = :alias",
      ExpressionAttributeValues: {
        ":tableName": identifier,
        ":alias": identifier
      }
    };

    const result = await ddbDocClient.send(new ScanCommand(params));
    
    if (!result.Items || result.Items.length === 0) {
      throw new SchemaNotFoundError(identifier);
    }
    
    return result.Items[0] as TableSchema;
  } catch (error) {
    if (error instanceof SchemaNotFoundError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new TableRegistryError(`Failed to get schema: ${error.message}`);
    }
    throw error;
  }
};

const listTableSchemas = async (): Promise<TableSchema[]> => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({
      TableName: REGISTRY_TABLE_NAME
    }));
    
    if (!result.Items) {
      return [];
    }
    
    return result.Items as TableSchema[];
  } catch (error) {
    if (error instanceof Error) {
      throw new TableRegistryError(`Failed to list schemas: ${error.message}`);
    }
    throw error;
  }
};

const updateTableSchema = async (
  tableName: string,
  updates: SchemaUpdates
): Promise<void> => {
  try {
    const existingSchema = await getTableSchema(tableName);
    
    const params = {
      TableName: REGISTRY_TABLE_NAME,
      Item: {
        ...existingSchema,
        ...updates,
        lastUpdated: new Date().toISOString()
      }
    };
    
    await ddbDocClient.send(new PutCommand(params));
  } catch (error) {
    if (error instanceof SchemaNotFoundError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new TableRegistryError(`Failed to update schema: ${error.message}`);
    }
    throw error;
  }
};

const deleteTableSchema = async (tableName: string): Promise<void> => {
  try {
    // First check if schema exists
    await getTableSchema(tableName);
    
    await ddbDocClient.send(new DeleteCommand({
      TableName: REGISTRY_TABLE_NAME,
      Key: {
        tableName
      }
    }));
  } catch (error) {
    if (error instanceof SchemaNotFoundError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new TableRegistryError(`Failed to delete schema: ${error.message}`);
    }
    throw error;
  }
};

export {
  initializeRegistry,
  registerTableSchema,
  getTableSchema,
  listTableSchemas,
  updateTableSchema,
  deleteTableSchema,
  TableRegistryError,
  SchemaNotFoundError,
  TableOperationError
};