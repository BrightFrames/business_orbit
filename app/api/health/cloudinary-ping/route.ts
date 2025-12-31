import { NextResponse } from 'next/server'
import { cloudinary } from '@/lib/config/cloudinary'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // @ts-ignore
    const result = await cloudinary.api.ping()
    return NextResponse.json({ ok: true, result })
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message, http_code: error?.http_code, name: error?.name }, { status: 500 })
  }
}
