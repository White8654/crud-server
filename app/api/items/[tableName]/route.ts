// app/api/[tableName]/route.ts
import { NextResponse } from "next/server";
import { getItems,addItem } from "@/helper/orgController"; // Adjust the import path



export async function GET(request: Request, { params }: { params: Promise<{ tableName: string }> }) {
  const { tableName } = await params;  // Await params to access tableName

  try {
    const items = await getItems(tableName);
    return NextResponse.json( items );
  } catch (error: any) {
    console.error(`Error fetching items from table ${tableName}:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}