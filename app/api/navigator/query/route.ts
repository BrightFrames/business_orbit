import { NextResponse } from 'next/server'

export const runtime = 'nodejs'


export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { query?: string; top_k?: number }

    const query = (body?.query || '').toString().trim()
    const top_k = typeof body?.top_k === 'number' ? body.top_k : 10

    if (!query) {
      return NextResponse.json({ ok: false, message: 'Missing required field: query' }, { status: 400 })
    }

    const apiKey = process.env.NAVIGATOR_API_KEY || process.env.NEXT_PUBLIC_NAVIGATOR_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, message: 'Server misconfiguration: NAVIGATOR_API_KEY not set' }, { status: 500 })
    }

    const response = await fetch(`${process.env.NAVIGATOR_API_URL}/api/navigator/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ query, top_k }),
      // 30s timeout via AbortController if needed in future
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json(
        { ok: false, message: `Upstream error: ${response.status}`, detail: text?.slice(0, 500) },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Expected shape passthrough
    // { summary: string, professionals: [{ professional_id: number, content: string }] }
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}
