
import { NextResponse } from "next/server";
import {
  addItem,
  getItems,
  getItem,
  updateItem,
  deleteItem,
} from "@/helper/orgController";


export async function GET(request: Request, { params }: { params: { tableName: string; id: string } }) {
    const { tableName, id } = await params;
  
    try {
      const item = await getItem(tableName, parseInt(id));
      return NextResponse.json(item);
    } catch (error: any) {
      console.error("Error fetching item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  
  export async function PUT(request: Request, { params }: { params: { tableName: string; id: string } }) {
    const { tableName, id } = await params;
    const updates = await request.json(); // Parse request body
  
    try {
      await updateItem(tableName, parseInt(id), updates);
      return NextResponse.json({ message: "Item updated successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("Error updating item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  
  export async function DELETE(request: Request, { params }: { params: { tableName: string; id: string } }) {
    const { tableName, id } = await params;
  
    try {
      await deleteItem(tableName, parseInt(id));
      return NextResponse.json({ message: "Item deleted successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("Error deleting item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }