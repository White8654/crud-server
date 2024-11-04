// app/api/schemas/route.ts

import { NextResponse } from "next/server";
import {
  listTableSchemas,
  registerTableSchema
 
} from "@/helper/tableRegistry"; // Adjust the import path as needed

import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const schemas = await listTableSchemas();
    const filteredSchemas = schemas.filter(schema => schema.tableName !== "TableRegistry");
    return NextResponse.json(filteredSchemas); // Respond with filtered schemas
  } catch (error: any) {
    console.error("Error fetching schemas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 }); // Return error response
  }
}




export async function POST(req: NextRequest) {
  try {
    const { tableName, alias, fields } = await req.json();
    await registerTableSchema(tableName, alias, fields);
    return NextResponse.json({ message: "Schema registered successfully" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


