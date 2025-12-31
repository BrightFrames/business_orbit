import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

// Note: Avoid in-memory caching on serverless to prevent stale profile images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const { id: userIdParam } = await params;
    const userId = parseInt(userIdParam);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get user basic info
    const userResult = await pool.query(
      `SELECT id, name, email, phone, profile_photo_url, profile_photo_id, 
              banner_url, banner_id, skills, description, profession, interest, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userResult.rows[0];

    // Get user preferences (chapters and secret groups)
    const preferencesResult = await pool.query(
      'SELECT chapters, secret_groups FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    let chapters: string[] = [];
    let secretGroups: string[] = [];

    if (preferencesResult.rows.length > 0) {
      chapters = preferencesResult.rows[0].chapters || [];
      secretGroups = preferencesResult.rows[0].secret_groups || [];
    }

    // Return user data with groups
    const responseData = {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        profilePhotoUrl: userData.profile_photo_url,
        bannerUrl: userData.banner_url,
        skills: userData.skills || [],
        description: userData.description,
        profession: userData.profession,
        interest: userData.interest,
        createdAt: userData.created_at
      },
      groups: {
        chapters,
        secretGroups
      }
    };

    const res = NextResponse.json(responseData);
    // Disable caching to always reflect latest Cloudinary URLs
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getUserFromToken(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: userIdParam } = await params
    const userId = parseInt(userIdParam)
    if (!Number.isFinite(userId) || userId !== Number(authUser.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json().catch(() => ({})) as { 
      name?: string
      profession?: string
      description?: string
      skills?: string[]
      interest?: string
    }
    
    // Validate name if provided
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    if (name && (name.length < 2 || name.length > 100)) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    // Validate profession if provided
    const profession = typeof body.profession === 'string' ? body.profession.trim() : undefined
    if (profession && profession.length > 100) {
      return NextResponse.json({ error: 'Profession too long' }, { status: 400 })
    }

    // Validate description if provided
    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description too long' }, { status: 400 })
    }

    // Validate skills if provided
    const skills = Array.isArray(body.skills) ? body.skills.filter(skill => typeof skill === 'string' && skill.trim().length > 0) : undefined
    if (skills && skills.length > 10) {
      return NextResponse.json({ error: 'Too many skills' }, { status: 400 })
    }

    // Validate interest if provided
    const interest = typeof body.interest === 'string' ? body.interest.trim() : undefined
    if (interest && interest.length > 100) {
      return NextResponse.json({ error: 'Interest too long' }, { status: 400 })
    }

    // Build dynamic update query
    const updateFields = []
    const values = []
    let paramCount = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`)
      values.push(name)
      paramCount++
    }

    if (profession !== undefined) {
      updateFields.push(`profession = $${paramCount}`)
      values.push(profession)
      paramCount++
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`)
      values.push(description)
      paramCount++
    }

    if (skills !== undefined) {
      updateFields.push(`skills = $${paramCount}`)
      values.push(JSON.stringify(skills))
      paramCount++
    }

    if (interest !== undefined) {
      updateFields.push(`interest = $${paramCount}`)
      values.push(interest)
      paramCount++
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(userId)

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING id, name, email, phone, profile_photo_url, banner_url, skills, description, profession, interest, created_at
    `

    const result = await pool.query(query, values)
    const row = result.rows[0]
    
    const res = NextResponse.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        profilePhotoUrl: row.profile_photo_url,
        bannerUrl: row.banner_url,
        skills: row.skills || [],
        description: row.description,
        profession: row.profession,
        interest: row.interest,
        createdAt: row.created_at,
      }
    })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
    return res
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
