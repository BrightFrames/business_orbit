import pool from '@/lib/config/database';

export interface NavigatorSearchRequest {
  search_intent: string;
  requesting_user_id: number;
  filters?: {
    location?: string;
    chapter?: string;
    availability?: boolean;
    price_range?: string;
    min_points?: number;
    max_points?: number;
  };
  limit?: number;
  custom_message_template?: string;
}

export interface NavigatorResult {
  user_id: number;
  name: string;
  role: string;
  reward_tier: string;
  performance_signals: {
    score: number;
    activity_level: string;
    response_rate: string;
    top_skills: string[];
  };
  availability: boolean;
  response_likelihood: 'Low' | 'Medium' | 'High';
  match_reason: string;
}

export interface NavigatorResponse {
  search_summary: {
    interpreted_role: string;
    context: string;
    confidence_level: 'Low' | 'Medium' | 'High';
  };
  results: NavigatorResult[];
  quick_message_preview?: string;
  error?: string;
}

export class NavigatorService {

  /**
   * Parses natural language intent into structured queries.
   * Uses heuristic keywords for V1.
   */
  static parseIntent(intent: string): { role: string; context: string; confidence: 'Low' | 'Medium' | 'High' } {
    const lowerIntent = intent.toLowerCase();

    let role = 'General';
    let context = 'networking';
    let confidence: 'Low' | 'Medium' | 'High' = 'Low';

    // 1. Role Extraction (Simple Heuristics)
    const roles = [
      'developer', 'engineer', 'designer', 'marketer', 'sales', 'consultant',
      'lawyer', 'accountant', 'architect', 'product manager', 'founder', 'ceo', 'cfo', 'cto'
    ];

    for (const r of roles) {
      if (lowerIntent.includes(r)) {
        role = r.charAt(0).toUpperCase() + r.slice(1);
        confidence = 'Medium';
        break;
      }
    }

    // 2. Context Extraction
    if (lowerIntent.includes('hire') || lowerIntent.includes('job') || lowerIntent.includes('freelance')) {
      context = 'hire';
      confidence = 'High';
    } else if (lowerIntent.includes('consult') || lowerIntent.includes('advice')) {
      context = 'consult';
      confidence = 'High';
    } else if (lowerIntent.includes('referral') || lowerIntent.includes('introduction')) {
      context = 'referral';
      confidence = 'Medium';
    }

    return { role, context, confidence };
  }

  /**
   * Executes the core ranking algorithm
   */
  static async search(request: NavigatorSearchRequest): Promise<NavigatorResponse> {
    // 1. Validate Access
    // (Assuming API route handles basic auth, but we check rate limits here)
    const canSearch = await this.checkSearchLimits(request.requesting_user_id);
    if (!canSearch) {
      return {
        search_summary: { interpreted_role: 'N/A', context: 'N/A', confidence_level: 'Low' },
        results: [],
        error: 'Daily search limit reached.'
      };
    }

    // 2. Parse Intent
    const { role, context, confidence } = this.parseIntent(request.search_intent);

    // 3. Build Query
    const client = await pool.connect();
    try {
      // Ranking Formula: 
      // 0.4 * outcome + 0.3 * contribution + 0.2 * responsiveness + 0.1 * recency
      // Note: responsiveness is mocked/placeholder for now if null

      // We'll also filter by role if confidence is decent
      let whereConditions: string[] = [];
      const params: any[] = [request.limit || 20];
      let paramIdx = 2;

      // Role Filter
      if (role !== 'General') {
        whereConditions.push(`(u.profession ILIKE $${paramIdx} OR EXISTS (SELECT 1 FROM unnest(u.skills) s WHERE s ILIKE $${paramIdx}))`);
        params.push(`%${role}%`);
        paramIdx++;
      }

      // Min Points Filter
      if (request.filters?.min_points !== undefined) {
        whereConditions.push(`u.orbit_points >= $${paramIdx}`);
        params.push(request.filters.min_points);
        paramIdx++;
      }

      // Max Points Filter
      if (request.filters?.max_points !== undefined) {
        whereConditions.push(`u.orbit_points <= $${paramIdx}`);
        params.push(request.filters.max_points);
        paramIdx++;
      }

      const whereClause = whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '';

      // Location Filter
      let locFilter = '';
      if (request.filters?.location) {
        // Assuming we might search against a future location field or chapters
        // For now, let's skip strict location queries on the 'users' table if column implies it
        // We'll trust the user has setup inputs correctly.
      }

      const query = `
                WITH UserScores AS (
                    SELECT 
                        u.id, 
                        u.name, 
                        u.profession, 
                        u.skills,
                        u.orbit_points,
                        u.profile_photo_url,
                        u.last_active_at,
                        u.response_rate_score,
                        COALESCE(SUM(CASE WHEN pt.category = 'outcome' THEN pt.points ELSE 0 END), 0) as outcome_score,
                        COALESCE(SUM(CASE WHEN pt.category = 'contribution' THEN pt.points ELSE 0 END), 0) as contribution_score,
                        COALESCE(SUM(CASE WHEN pt.category = 'activity' THEN pt.points ELSE 0 END), 0) as activity_score
                    FROM users u
                    LEFT JOIN point_transactions pt ON u.id = pt.user_id
                    WHERE u.is_discoverable = TRUE
                    -- Exclude requesting user
                    AND u.id != ${request.requesting_user_id}
                    -- Must be active in last 90 days
                    AND (u.last_active_at > NOW() - INTERVAL '90 days' OR u.created_at > NOW() - INTERVAL '30 days')
                    ${whereClause}
                    GROUP BY u.id
                )
                SELECT 
                    *,
                    -- Calculate Final Weighted Score (We use orbit_points as the primary score for display, but this rank drives sorting)
                    (
                        (outcome_score * 0.4) + 
                        (contribution_score * 0.3) + 
                        (COALESCE(response_rate_score, 50) * 0.2) + 
                        (CASE WHEN last_active_at > NOW() - INTERVAL '7 days' THEN 100 ELSE 0 END * 0.1) +
                        (orbit_points * 0.5) -- Add weight to total orbit points
                    ) as final_rank_score
                FROM UserScores
                ORDER BY final_rank_score DESC
                LIMIT $1
            `;

      const res = await client.query(query, params);

      // 4. Log Search
      await client.query(`
                INSERT INTO navigator_search_logs (user_id, search_intent, filters, results_count)
                VALUES ($1, $2, $3, $4)
            `, [request.requesting_user_id, request.search_intent, JSON.stringify(request.filters), res.rowCount]);

      // 5. Transform Results
      const results: NavigatorResult[] = res.rows.map(row => ({
        user_id: row.id,
        name: row.name,
        role: row.profession || 'Professional',
        avatar_url: row.profile_photo_url || null,
        reward_tier: this.calculateTier(row.orbit_points),
        performance_signals: {
          score: row.orbit_points || 0, // Use Orbit Points (Reward Score) directly as requested
          activity_level: this.getActivityLabel(row.last_active_at),
          response_rate: row.response_rate_score ? `${row.response_rate_score}%` : 'N/A',
          top_skills: row.skills ? row.skills.slice(0, 3) : []
        },
        availability: true, // Placeholder for now
        response_likelihood: this.calculateResponseLikelihood(row),
        match_reason: `Matches skill/role: ${role}`
      }));

      // 6. Message Prep
      let preview = undefined;
      if (request.custom_message_template && results.length > 0) {
        preview = this.interpolateMessage(request.custom_message_template, results[0]);
      }

      return {
        search_summary: {
          interpreted_role: role,
          context: context,
          confidence_level: confidence
        },
        results,
        quick_message_preview: preview
      };

    } finally {
      client.release();
    }
  }

  static calculateTier(points: number): string {
    if (points > 1000) return 'Orbit Elite';
    if (points > 500) return 'Luminary';
    if (points > 100) return 'Rising Star';
    return 'Member';
  }

  static getActivityLabel(lastActive: Date): string {
    const diffDays = (new Date().getTime() - new Date(lastActive).getTime()) / (1000 * 3600 * 24);
    if (diffDays < 3) return 'Very High';
    if (diffDays < 7) return 'High';
    if (diffDays < 30) return 'Moderate';
    return 'Low';
  }

  static calculateResponseLikelihood(row: any): 'Low' | 'Medium' | 'High' {
    // Combination of response score and recency
    const score = row.response_rate_score || 50;
    const diffDays = (new Date().getTime() - new Date(row.last_active_at).getTime()) / (1000 * 3600 * 24);

    if (score > 70 && diffDays < 3) return 'High';
    if (score < 40 || diffDays > 30) return 'Low';

    return 'Medium';
  }

  static interpolateMessage(template: string, candidate: NavigatorResult): string {
    return template
      .replace(/{{name}}/g, candidate.name.split(' ')[0]) // First name
      .replace(/{{role}}/g, candidate.role);
  }

  static async checkSearchLimits(userId: number): Promise<boolean> {
    // Simple daily limit: 20 searches for demo
    const res = await pool.query(
      `SELECT COUNT(*) FROM navigator_search_logs 
             WHERE user_id = $1 AND created_at > CURRENT_DATE`,
      [userId]
    );
    return parseInt(res.rows[0].count) < 50;
  }
}
