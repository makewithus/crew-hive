/**
 * /api/associations/verify-code
 * Verifies an association join code and links the badge to the user's profile.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateRequest, phoneToDocId } from "@/lib/server-auth";

export async function POST(request) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();
    const { code, phone } = body;

    const userDocId = auth?.docId || phoneToDocId(phone);
    if (!userDocId || !code) {
      return NextResponse.json(
        { success: false, error: "Join code and user phone are required." },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const db = adminDb();
    const ts = new Date().toISOString();

    // Find association matching code
    const assocSnap = await db
      .collection("associations")
      .where("code", "==", cleanCode)
      .limit(1)
      .get();

    if (assocSnap.empty) {
      return NextResponse.json(
        { success: false, error: "Invalid association join code." },
        { status: 404 }
      );
    }

    const assocDoc = assocSnap.docs[0];
    const assocData = assocDoc.data();

    // Update crew document with association verified badge
    await db.collection("crew").doc(userDocId).set(
      {
        associationMember: true,
        isAssociationVerified: true,
        associationId: assocDoc.id,
        associationName: assocData.name,
        associationCode: cleanCode,
        badgeGrantedAt: ts,
        updatedAt: ts,
      },
      { merge: true }
    );

    // Update association_members collection
    await db.collection("association_members").doc(userDocId).set(
      {
        associationId: assocDoc.id,
        associationName: assocData.name,
        associationCode: cleanCode,
        docId: userDocId,
        status: "verified",
        verifiedAt: ts,
        updatedAt: ts,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: `Verified! Association badge "${assocData.name}" has been added to your profile.`,
      associationName: assocData.name,
    });
  } catch (err) {
    console.error("[/api/associations/verify-code] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

