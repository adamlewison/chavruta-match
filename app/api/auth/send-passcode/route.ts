import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailPasscodes } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing codes for this email
    await db.delete(emailPasscodes).where(eq(emailPasscodes.email, email));

    // Store the new code
    await db.insert(emailPasscodes).values({
      email,
      code,
      expires: expiresAt,
    });

    // Send email with Resend
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: email,
      subject: "Your ChavrutaMatch Sign-in Code",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your Sign-in Code</h2>
          <p style="font-size: 18px;">Enter this code to sign in to ChavrutaMatch:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending passcode:", error);
    return NextResponse.json(
      { error: "Failed to send passcode" },
      { status: 500 }
    );
  }
}
