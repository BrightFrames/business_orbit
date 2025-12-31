interface NavigatorResponse {
  summary: string
  professionals: Array<{
    professional_id: number
    content: string
  }>
}

interface Professional {
  id: string
  name: string
  role: string
  avatar: string
  rewardScore: number
  expertise: string[]
  matchScore: number
  location: string
  experience: string
  content: string
}

export class NavigatorService {
  static async searchProfessionals(query: string, topK: number = 10): Promise<NavigatorResponse> {
    try {
      const response = await fetch('/api/navigator/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, top_k: topK }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('NavigatorService.searchProfessionals error:', error)
      throw error
    }
  }

  static transformProfessionals(response: NavigatorResponse): Professional[] {
    if (!response.professionals || !Array.isArray(response.professionals)) {
      return []
    }

    return response.professionals.map((prof, index) => {
      // Parse the content to extract professional information
      const content = prof.content || ''
      
      // Extract name (first line or first part before any special characters)
      const nameMatch = content.match(/^([^,\n]+)/)
      const name = nameMatch ? nameMatch[1].trim() : `Professional ${prof.professional_id}`
      
      // Extract role (look for common role patterns)
      const roleMatch = content.match(/(?:is a|works as|role:?|position:?)\s*([^,\n]+)/i)
      const role = roleMatch ? roleMatch[1].trim() : 'Professional'
      
      // Extract location (look for location patterns)
      const locationMatch = content.match(/(?:based in|located in|from|location:?)\s*([^,\n]+)/i)
      const location = locationMatch ? locationMatch[1].trim() : 'Location not specified'
      
      // Extract expertise/skills (look for skill-related keywords)
      const expertiseKeywords = [
        'Full Stack Web Development', 'Frontend Development', 'Backend Development', 'Mobile App Development',
        'Data Science & Analytics', 'Machine Learning / AI', 'Cybersecurity', 'UI/UX Design',
        'DevOps / CI-CD', 'Cloud Computing', 'Product Management', 'Software Testing & QA',
        'Digital Marketing', 'SEO / SEM Optimization', 'Graphic Design', 'Video Editing & Content Creation',
        'Game Development', 'Project Management', 'Business Development', 'Human Resource Management',
        'Sales & Marketing', 'Customer Relationship Management (CRM)', 'Communication & Public Speaking',
        'Leadership & Team Management', 'Content Writing & Copywriting', 'Finance & Accounting',
        'Entrepreneurship & Startups'
      ]
      
      const expertise = expertiseKeywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      ).slice(0, 5) // Limit to 5 skills
      
      // Generate avatar (first letter of name)
      const avatar = name.charAt(0).toUpperCase()
      
      // Calculate match score (simulate based on content length and keyword matches)
      const contentLength = content.length
      const keywordMatches = expertise.length
      const matchScore = Math.min(95, Math.max(60, 70 + keywordMatches * 5 + Math.floor(contentLength / 50)))
      
      // Calculate reward score (simulate based on professional_id and content quality)
      const rewardScore = Math.min(100, Math.max(70, 75 + (prof.professional_id % 30)))
      
      return {
        id: prof.professional_id.toString(),
        name,
        role,
        avatar,
        rewardScore,
        expertise,
        matchScore,
        location,
        experience: content.length > 200 ? content.substring(0, 200) + '...' : content,
        content
      }
    })
  }

  static getSummary(response: NavigatorResponse): string {
    return response.summary || 'I found some professionals who might be able to help you with your request. Here are the top matches based on your query.'
  }
}




