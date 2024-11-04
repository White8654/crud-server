// app/api/schemas/route.ts

import { NextResponse } from "next/server";
import {

  initializeRegistry
} from "@/helper/tableRegistry"; // Adjust the import path as needed

import {
  ScanCommand,
  UpdateCommand,
  PutCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "@/lib/dbconfig";

(async () => {
  try {
    await initializeRegistry();
    console.log("Table registry initialized successfully");
  } catch (error) {
    console.error("Failed to initialize table registry:", error);
  }
})();





const renameFieldInTableItems = async (tableName: string, oldFieldName: string, newFieldName: string): Promise<string | null> => {
  try {
    const data = await ddbDocClient.send(new ScanCommand({ TableName: tableName }));
    const items = data.Items || [];

    for (const item of items) {
      const updatedItem = { ...item };
      if (item[oldFieldName] !== undefined) {
        updatedItem[newFieldName] = item[oldFieldName];
        delete updatedItem[oldFieldName];

        await ddbDocClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { id: item.id }, // Assuming `id` is the primary key
            UpdateExpression: `SET #newFieldName = :newValue REMOVE #oldFieldName`,
            ExpressionAttributeNames: {
              "#newFieldName": newFieldName,
              "#oldFieldName": oldFieldName,
            },
            ExpressionAttributeValues: {
              ":newValue": item[oldFieldName],
            },
          })
        );
      }
    }
    console.log(`Field '${oldFieldName}' renamed to '${newFieldName}' in all items of table ${tableName}`);
    return null;
  } catch (error: any) {
    console.error(`Error renaming field in table ${tableName}:`, error);
    return `Error renaming field in table ${tableName}: ${error.message}`;
  }
};

const renameFieldInRegistrySchema = async (tableName: string, oldFieldName: string, newFieldName: string): Promise<string | null> => {
  try {
    const { Item: schema } = await ddbDocClient.send(
      new GetCommand({
        TableName: "TableRegistry",
        Key: { tableName },
      })
    );

    if (!schema) {
      console.error(`No schema found for table ${tableName}`);
      return `No schema found for table ${tableName}`;
    }

    if (!schema.fields[oldFieldName]) {
      console.error(`Field '${oldFieldName}' does not exist in schema for table ${tableName}`);
      return `Field '${oldFieldName}' does not exist in schema for table ${tableName}`;
    }

    schema.fields[newFieldName] = { ...schema.fields[oldFieldName] };
    delete schema.fields[oldFieldName];

    await ddbDocClient.send(
      new PutCommand({
        TableName: "TableRegistry",
        Item: {
          ...schema,
          lastUpdated: new Date().toISOString(),
        },
      })
    );
    console.log(`Field '${oldFieldName}' renamed to '${newFieldName}' in schema of table ${tableName}`);
    return null;
  } catch (error: any) {
    console.error(`Error updating schema in TableRegistry for table ${tableName}:`, error);
    return `Error updating schema in TableRegistry for table ${tableName}: ${error.message}`;
  }
};

// Define the PUT handler
export async function PUT(req: Request) {
  const { tableName, oldFieldName, newFieldName } = await req.json();

  try {
    const renameTableItemsError = await renameFieldInTableItems(tableName, oldFieldName, newFieldName);
    const renameRegistrySchemaError = await renameFieldInRegistrySchema(tableName, oldFieldName, newFieldName);

    if (renameTableItemsError || renameRegistrySchemaError) {
      return NextResponse.json({ error: renameTableItemsError || renameRegistrySchemaError }, { status: 500 });
    }

    return NextResponse.json({ message: `Field '${oldFieldName}' renamed to '${newFieldName}' in table '${tableName}' and its schema.` }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}