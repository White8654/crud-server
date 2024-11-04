// app/api/tables/route.ts
import { NextResponse } from "next/server";
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { ddbDocClient } from "@/lib/dbconfig"; // Adjust the import path accordingly


const listTables = async (): Promise<string[]> => {
  const data = await ddbDocClient.send(new ListTablesCommand({}));
  return data.TableNames || []; // Return the list of table names, defaulting to an empty array
};

// Define the response type
type ApiResponse = {
  error?: string;
  data?: string[]; 
};


export async function GET(): Promise<NextResponse<any>> {
  try {
    const tables = await listTables();
    const filteredTables = tables.filter(tableName => tableName !== "TableRegistry");
    console.log("wfewef");
    return NextResponse.json(filteredTables); // Respond with filtered tables in the data property
  } catch (error: any) {
    console.error("Error fetching tables:", error);
    return NextResponse.json({ error: error.message }, { status: 500 }); // Return error response
  }
}