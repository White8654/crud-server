import { NextResponse } from "next/server";
import { getItems,addItem } from "@/helper/orgController"; // Adjust the import path


export async function POST(request: Request) {
  const { tableName, ...itemData } = await request.json(); // Parse request body

  try {
    await addItem(tableName, itemData);
    return NextResponse.json({ message: "Item added successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error adding item:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}