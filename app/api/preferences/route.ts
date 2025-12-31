import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

// Sample data for Chapters and Secret Groups
const AVAILABLE_CHAPTERS = [
  "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad",
  "Chandigarh", "Indore", "Bhubaneswar", "Noida", "Gurugram", "Jaipur", "Lucknow", "Kanpur", 
  "Nagpur", "Visakhapatnam", "Surat", "Vadodara"
];

async function getAvailableSecretGroupsFromDB(): Promise<string[]> {
  try {
    const res = await pool.query(
      `SELECT name FROM secret_groups ORDER BY created_at DESC`
    );
    const names = (res.rows || []).map((r: any) => String(r.name)).filter(Boolean);
    return names;
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const { chapters, secretGroups } = await request.json();
    const userId = user.id;

    // Default secretGroups to empty array if not provided (secret groups step is optional)
    const finalSecretGroups = secretGroups && Array.isArray(secretGroups) ? secretGroups : [];

    // Validation: Must have at least 1 chapter
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json(
        { error: 'You must select at least 1 chapter' },
        { status: 400 }
      );
    }

    // Secret groups validation commented out - users can join secret groups later from /product/groups
    // Validation: Must have at least 1 secret group if groups exist in DB
    // const dbGroups = await getAvailableSecretGroupsFromDB();
    // if (dbGroups.length > 0) {
    //   if (!secretGroups || !Array.isArray(secretGroups) || secretGroups.length === 0) {
    //     return NextResponse.json(
    //       { error: 'You must select at least 1 secret group' },
    //       { status: 400 }
    //     );
    //   }
    // }
    
    // Get DB groups for validation but don't enforce selection
    const dbGroups = await getAvailableSecretGroupsFromDB();

    // Validation: All chapters must be from available list
    const invalidChapters = chapters.filter((chapter: string) => !AVAILABLE_CHAPTERS.includes(chapter));
    if (invalidChapters.length > 0) {
      return NextResponse.json(
        { error: `Invalid chapters: ${invalidChapters.join(', ')}` },
        { status: 400 }
      );
    }

    // Secret groups validation commented out - allow empty array or validate only if groups are provided
    // Validation: All secret groups must exist in DB (only validate if groups are provided)
    if (finalSecretGroups.length > 0 && dbGroups.length > 0) {
      const invalidGroups = finalSecretGroups.filter((group: string) => !dbGroups.includes(group));
      if (invalidGroups.length > 0) {
        return NextResponse.json(
          { error: `Invalid secret groups: ${invalidGroups.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Check if preferences already exist
    const existingPrefs = await pool.query(
      'SELECT id FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (existingPrefs.rows.length > 0) {
      // Update existing preferences
      const result = await pool.query(
        `UPDATE user_preferences 
         SET chapters = $1, secret_groups = $2, onboarding_completed = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3
         RETURNING *`,
        [chapters, finalSecretGroups, userId]
      );

      return NextResponse.json({
        message: 'Preferences updated successfully',
        preferences: result.rows[0]
      });
    } else {
      // Create new preferences
      const result = await pool.query(
        `INSERT INTO user_preferences (user_id, chapters, secret_groups, onboarding_completed)
         VALUES ($1, $2, $3, TRUE)
         RETURNING *`,
        [userId, chapters, finalSecretGroups]
      );

      return NextResponse.json({
        message: 'Preferences saved successfully',
        preferences: result.rows[0]
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Save preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const secretGroups = await getAvailableSecretGroupsFromDB();
    return NextResponse.json({
      chapters: AVAILABLE_CHAPTERS,
      secretGroups
    });
  } catch (error: any) {
    console.error('Get onboarding data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
