import { NextResponse } from "next/server";
import { envCollection, getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getAdminDb().collection(envCollection("users")).count().get();
    return NextResponse.json({ count: snapshot.data().count });
  } catch (error) {
    console.error("Failed to count users collection", error);
    return NextResponse.json({ count: null }, { status: 500 });
  }
}
