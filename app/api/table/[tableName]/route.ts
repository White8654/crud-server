import { NextResponse } from "next/server";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { ddbDocClient } from "@/lib/dbconfig"; // Adjust the import path accordingly

// Function to drop the table
const dropTable = async (tableName: string): Promise<{ success: boolean; message: string }> => {
  try {
    await ddbDocClient.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`Table ${tableName} deleted successfully.`);
    return { success: true, message: `Table ${tableName} deleted successfully.` };
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      return { success: false, message: `Table ${tableName} does not exist.` };
    } else {
      console.error("Error deleting table:", error);
      return { success: false, message: "Error deleting table. Please try again later." };
    }
  }
};

// Define the DELETE function
export async function DELETE(request: Request, { params }: { params: { tableName: string } }) {
  const { tableName } = await params; // Get the tableName from the URL parameters

  const result = await dropTable(tableName);

  if (result.success) {
    return NextResponse.json({ message: result.message }, { status: 200 });
  } else if (result.message.includes("does not exist")) {
    return NextResponse.json({ error: result.message }, { status: 404 }); // Table not found
  }

  return NextResponse.json({ error: result.message }, { status: 500 }); // General server error
}