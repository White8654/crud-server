// Handle PUT requests to update a schema by table name
import { NextResponse } from "next/server";
import {
  updateTableSchema,
  deleteTableSchema,
  getTableSchema
} from "@/helper/tableRegistry";



export async function PUT(request: Request, { params }: { params: { tableName: string } }) {
    const { tableName } = await params;
  
    try {
      const updates = await request.json(); // Parse the request body
      await updateTableSchema(tableName, updates);
      return NextResponse.json({ message: "Schema updated successfully" }); // Respond with success message
    } catch (error: any) {
      console.error("Error updating schema:", error);
      return NextResponse.json({ error: error.message }, { status: 500 }); // Return error response
    }
  }
  
  // Handle DELETE requests to delete a schema by table name
  export async function DELETE(request: Request, { params }: { params: { tableName: string } }) {
    const { tableName } = await params;
  
    try {
      await deleteTableSchema(tableName);
      return NextResponse.json({ message: "Schema deleted successfully" }); // Respond with success message
    } catch (error: any) {
      console.error("Error deleting schema:", error);
      return NextResponse.json({ error: error.message }, { status: 500 }); // Return error response
    }
  }

  export async function GET(req: Request, { params }: { params: { tableName: string } }) {
    try {
      const { tableName } = await params;
      const schema = await getTableSchema(tableName);
      return NextResponse.json(schema);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
  }