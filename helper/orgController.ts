import { 
    CreateTableCommand, 
    DescribeTableCommand, 
   
  } from "@aws-sdk/client-dynamodb";
  import { 
    PutCommand, 
    GetCommand, 
    UpdateCommand, 
    DeleteCommand, 
    ScanCommand,
    
  } from "@aws-sdk/lib-dynamodb";
  import { ddbDocClient } from "@/lib/dbconfig";
  
  // Define interfaces for better type safety
  interface TableItem {
    id: number;
    LastUpdated: string;
    [key: string]: any;  // Allow for additional properties
  }
  
  interface UpdateableItemFields {
    [key: string]: any;
  }
  
  // Create a table if it doesn't exist
  const createTableIfNotExists = async (tableName: string): Promise<void> => {
    try {
      await ddbDocClient.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "N" }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        })
      );
      console.log(`Table ${tableName} created successfully.`);
      
      // Wait for the table to be active
      await waitForTableToBeActive(tableName);
    } catch (error: any) {
      if (error.name === "ResourceInUseException") {
        console.log(`Table ${tableName} already exists.`);
      } else {
        throw error;
      }
    }
  };
  
  // Helper function to wait for a table to become active
  const waitForTableToBeActive = async (tableName: string): Promise<void> => {
    let tableActive = false;
    while (!tableActive) {
      const { Table } = await ddbDocClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      tableActive = Table!.TableStatus === "ACTIVE";
      if (!tableActive) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
      }
    }
  };
  
  // Add an item
  // Add an item with duplicate check
const addItem = async (tableName: string, item: UpdateableItemFields): Promise<void> => {
  await createTableIfNotExists(tableName);

  // Fetch all items to check for duplicates
  const existingItems = await getItems(tableName);
  
  const isDuplicate = existingItems.some(existingItem => {
      // Check each field except 'id' for equality
      return Object.entries(item).every(([key, value]) => 
          key !== 'id' && existingItem[key] === value
      );
  });

  if (isDuplicate) {
      console.log("Duplicate item found. Skipping insertion.");
      return; // Exit if duplicate is found
  }

  const params = {
      TableName: tableName,
      Item: {
          id: Math.floor(Math.random() * 10000), // Ensure unique ID generation
          ...item,
          LastUpdated: new Date().toISOString(),
      },
  };
  
  await ddbDocClient.send(new PutCommand(params));
  console.log("Item added successfully.");
};
  
  // Get all items
  const getItems = async (tableName: string): Promise<TableItem[]> => {
    try {
      const data = await ddbDocClient.send(new ScanCommand({ TableName: tableName }));
      return (data.Items as TableItem[]) || [];
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        return [];
      }
      throw error;
    }
  };
  
  // Get an item by ID
  const getItem = async (tableName: string, id: number): Promise<TableItem> => {
    const data = await ddbDocClient.send(new GetCommand({
      TableName: tableName,
      Key: { id },
    }));
    
    if (!data.Item) {
      throw new Error(`Item with id ${id} not found in table ${tableName}.`);
    }
    return data.Item as TableItem;
  };
  
  // Update an item
  const updateItem = async (
    tableName: string, 
    id: number, 
    updates: UpdateableItemFields
  ): Promise<void> => {
    // Exclude 'id' and 'LastUpdated' fields from updates
    const allowedUpdates = Object.entries(updates).reduce((acc: UpdateableItemFields, [key, value]) => {
      if (key !== 'id' && key !== 'LastUpdated') {
        acc[key] = value;
      }
      return acc;
    }, {});
  
    // Build the update expression
    const updateExpression = Object.keys(allowedUpdates)
      .map((key, index) => `#field${index} = :value${index}`)
      .join(", ");
  
    const expressionAttributeNames = Object.keys(allowedUpdates).reduce(
      (acc: { [key: string]: string }, key, index) => {
        acc[`#field${index}`] = key;
        return acc;
      }, 
      {}
    );
  
    const expressionAttributeValues = Object.entries(allowedUpdates).reduce(
      (acc: { [key: string]: any }, [key, value], index) => {
        acc[`:value${index}`] = value;
        return acc;
      }, 
      {}
    );
  
    const params = {
      TableName: tableName,
      Key: { id },
      UpdateExpression: `set ${updateExpression}, LastUpdated = :lastUpdatedVal`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: {
        ...expressionAttributeValues,
        ":lastUpdatedVal": new Date().toISOString(),
      },
    };
  
    await ddbDocClient.send(new UpdateCommand(params));
  };
  
  // Delete an item
  const deleteItem = async (tableName: string, id: number): Promise<void> => {
    await ddbDocClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { id },
    }));
  };
  
  export { 
    addItem, 
    getItems, 
    getItem, 
    updateItem, 
    deleteItem,
   
  };