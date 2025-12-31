import { NextResponse } from 'next/server'
import { cloudinary } from '@/lib/config/cloudinary'

export const runtime = 'nodejs'

// Upload a tiny 1x1 PNG to verify Cloudinary credentials work in this environment
export async function GET() {
  try {
    if (!process.env.CLOUDINARY_URL && (
      !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET
    )) {
      return NextResponse.json({ ok: false, error: 'Cloudinary env missing' }, { status: 500 })
    }

    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBg1q1k9wAAAAASUVORK5CYII='
    const dataUri = `data:image/png;base64,${tinyPngBase64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'business-orbit/health-check',
      resource_type: 'image',
      transformation: [{ quality: 'auto:low' }],
    } as any)

    return NextResponse.json({ ok: true, public_id: result.public_id, secure_url: result.secure_url || result.url })
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message, http_code: error?.http_code, name: error?.name }, { status: 500 })
  }
}
