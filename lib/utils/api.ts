// Utility functions for API calls and error handling

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export async function safeApiCall<T>(
  apiCall: () => Promise<Response>,
  errorMessage = 'An error occurred'
): Promise<ApiResponse<T>> {
  try {
    const response = await apiCall();
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || errorMessage
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : errorMessage
    };
  }
}

// Debounce utility for search and input handling
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Format member count for display
export function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate random member count for demo purposes
export function generateRandomMemberCount(type: 'chapter' | 'secret'): number {
  const base = type === 'chapter' ? 100 : 50;
  const variation = type === 'chapter' ? 500 : 200;
  return base + Math.floor(Math.random() * variation);
}


