import pool from '../config/database';

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
  static parseIntent(intent: string): { role: string; context: string; confidence: 'Low' | 'Medium' | 'High'; searchTerms: string[] } {
    const lowerIntent = intent.toLowerCase();

    let role = 'General';
    let context = 'networking';
    let confidence: 'Low' | 'Medium' | 'High' = 'Low';
    let searchTerms: string[] = [];

    // 1. Role/Skill Extraction (Extended Heuristics)
    // Map of keywords to normalized role names
    const roleKeywords: { [key: string]: string } = {
      // Web Development
      'full stack': 'Full Stack Developer',
      'fullstack': 'Full Stack Developer',
      'web development': 'Web Developer',
      'web developer': 'Web Developer',
      'frontend': 'Frontend Developer',
      'front-end': 'Frontend Developer',
      'front end': 'Frontend Developer',
      'backend': 'Backend Developer',
      'back-end': 'Backend Developer',
      'back end': 'Backend Developer',
      'react': 'React Developer',
      'angular': 'Angular Developer',
      'vue': 'Vue Developer',
      'node': 'Node.js Developer',
      'nodejs': 'Node.js Developer',
      'javascript': 'JavaScript Developer',
      'typescript': 'TypeScript Developer',
      'python': 'Python Developer',
      'java': 'Java Developer',
      'php': 'PHP Developer',
      'ruby': 'Ruby Developer',
      'golang': 'Go Developer',
      'rust': 'Rust Developer',
      '.net': '.NET Developer',
      'dotnet': '.NET Developer',

      // Mobile Development
      'mobile': 'Mobile Developer',
      'ios': 'iOS Developer',
      'android': 'Android Developer',
      'flutter': 'Flutter Developer',
      'react native': 'React Native Developer',

      // Design
      'ui': 'UI Designer',
      'ux': 'UX Designer',
      'ui/ux': 'UI/UX Designer',
      'graphic design': 'Graphic Designer',
      'product design': 'Product Designer',

      // Data & AI
      'data science': 'Data Scientist',
      'data analyst': 'Data Analyst',
      'machine learning': 'ML Engineer',
      'ai': 'AI Engineer',
      'artificial intelligence': 'AI Engineer',
      'deep learning': 'Deep Learning Engineer',

      // DevOps & Cloud
      'devops': 'DevOps Engineer',
      'cloud': 'Cloud Engineer',
      'aws': 'AWS Engineer',
      'azure': 'Azure Engineer',
      'kubernetes': 'Kubernetes Engineer',
      'docker': 'DevOps Engineer',

      // Business Roles
      'developer': 'Developer',
      'engineer': 'Engineer',
      'designer': 'Designer',
      'marketer': 'Marketer',
      'marketing': 'Marketer',
      'sales': 'Sales Professional',
      'consultant': 'Consultant',
      'consulting': 'Consultant',
      'lawyer': 'Lawyer',
      'legal': 'Lawyer',
      'accountant': 'Accountant',
      'finance': 'Finance Professional',
      'architect': 'Architect',
      'product manager': 'Product Manager',
      'project manager': 'Project Manager',
      'founder': 'Founder',
      'ceo': 'CEO',
      'cfo': 'CFO',
      'cto': 'CTO',
      'entrepreneur': 'Entrepreneur',
      'business analyst': 'Business Analyst',
      'qa': 'QA Engineer',
      'testing': 'QA Engineer',
      'security': 'Security Engineer',
      'blockchain': 'Blockchain Developer',
      'crypto': 'Blockchain Developer',
      'content': 'Content Creator',
      'writer': 'Writer',
      'copywriter': 'Copywriter',
      'seo': 'SEO Specialist',
    };

    // Check for multi-word matches first (longer phrases take priority)
    const sortedKeywords = Object.keys(roleKeywords).sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      if (lowerIntent.includes(keyword)) {
        role = roleKeywords[keyword];
        searchTerms.push(keyword);
        confidence = 'Medium';
        break;
      }
    }

    // If still General, use the raw search intent as the search term
    if (role === 'General' && lowerIntent.trim().length > 0) {
      searchTerms = [lowerIntent.trim()];
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

    return { role, context, confidence, searchTerms };
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
    const { role, context, confidence, searchTerms } = this.parseIntent(request.search_intent);

    // 3. Build Query
    const client = await pool.connect();
    try {
      // Ranking Formula: 
      // 0.4 * outcome + 0.3 * contribution + 0.2 * responsiveness + 0.1 * recency
      // Note: responsiveness is mocked/placeholder for now if null

      // We'll also filter by role/skill
      let whereConditions: string[] = [];
      const params: any[] = [request.limit || 20];
      let paramIdx = 2;

      // Build skill/profession search conditions using both the detected role AND the raw search intent
      // This ensures we find users even if the role detection isn't perfect
      const searchKeywords: string[] = [];

      // Add the detected role if not General
      if (role !== 'General') {
        searchKeywords.push(role);
      }

      // Also add search terms extracted from intent
      searchKeywords.push(...searchTerms);

      // Add the raw search intent as well for maximum match potential
      if (request.search_intent.trim().length > 0) {
        searchKeywords.push(request.search_intent.trim());

        // Also add individual words from the search intent for more flexible matching
        // This helps when users have skills like "React" but search for "Full Stack React Developer"
        const words = request.search_intent.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const skipWords = ['the', 'and', 'for', 'with', 'find', 'need', 'looking', 'want', 'hire', 'reliable', 'good', 'best', 'top'];
        for (const word of words) {
          if (!skipWords.includes(word) && !searchKeywords.some(k => k.toLowerCase() === word)) {
            searchKeywords.push(word);
          }
        }
      }

      // Build the skill/profession filter with OR conditions for all keywords
      if (searchKeywords.length > 0) {
        const skillConditions: string[] = [];
        for (const keyword of searchKeywords) {
          skillConditions.push(`u.profession ILIKE $${paramIdx}`);
          skillConditions.push(`EXISTS (SELECT 1 FROM unnest(u.skills) s WHERE s ILIKE $${paramIdx})`);
          params.push(`%${keyword}%`);
          paramIdx++;
        }
        whereConditions.push(`(${skillConditions.join(' OR ')})`);
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
                        COALESCE(u.orbit_points, 0) as orbit_points,
                        u.profile_photo_url,
                        u.last_active_at,
                        u.response_rate_score,
                        COALESCE(SUM(pt.points), 0) as total_activity_score
                    FROM users u
                    LEFT JOIN point_transactions pt ON u.id = pt.user_id
                    WHERE u.id != ${request.requesting_user_id}
                    ${whereClause}
                    GROUP BY u.id
                )
                SELECT 
                    *,
                    -- Calculate Final Weighted Score based on available data
                    (
                        (COALESCE(total_activity_score, 0) * 0.3) + 
                        (COALESCE(response_rate_score, 50) * 0.2) + 
                        (CASE WHEN last_active_at > NOW() - INTERVAL '7 days' THEN 100 ELSE 0 END * 0.1) +
                        (COALESCE(orbit_points, 0) * 0.4)
                    ) as final_rank_score
                FROM UserScores
                ORDER BY final_rank_score DESC
                LIMIT $1
            `;

      // Debug logging
      console.log('[NavigatorAI] Search Intent:', request.search_intent);
      console.log('[NavigatorAI] Parsed Role:', role, 'Confidence:', confidence);
      console.log('[NavigatorAI] Search Keywords:', searchKeywords);
      console.log('[NavigatorAI] Where Clause:', whereClause);
      console.log('[NavigatorAI] Params:', params);
      console.log('[NavigatorAI] Query:', query);

      const res = await client.query(query, params);
      console.log('[NavigatorAI] Results found:', res.rowCount);
      if (res.rows.length > 0) {
        console.log('[NavigatorAI] First result sample:', JSON.stringify(res.rows[0], null, 2));
      }

      // 4. Log Search (optional - don't fail if table doesn't exist)
      try {
        await client.query(`
                INSERT INTO navigator_search_logs (user_id, search_intent, filters, results_count)
                VALUES ($1, $2, $3, $4)
            `, [request.requesting_user_id, request.search_intent, JSON.stringify(request.filters), res.rowCount]);
      } catch (logError) {
        console.warn('[NavigatorAI] Could not log search (table might not exist):', logError);
      }

      // 5. Transform Results
      const results: NavigatorResult[] = res.rows.map((row: any) => ({
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
        match_reason: `Matches "${request.search_intent}"`
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

  static getActivityLabel(lastActive: Date | null | undefined): string {
    if (!lastActive) return 'Unknown';
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
