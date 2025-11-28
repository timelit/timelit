 // Local API client for Timelit infrastructure
 const API_BASE_URL =
   import.meta.env.VITE_API_URL ||
   import.meta.env.VITE_API_BASE_URL ||
   '/api';

// --- Event helpers: map between backend camelCase and frontend snake_case ---
const mapEventFromServer = (event) => {
  if (!event) return event;

  const start = event.start_time || event.startTime;
  const end = event.end_time || event.endTime;

  return {
    ...event,
    id: event.id || event._id,
    start_time: start,
    end_time: end,
    is_all_day: event.is_all_day ?? event.allDay ?? false,
    created_by: event.created_by || event.createdBy,
  };
};

const mapEventToServer = (event) => {
  if (!event) return event;

  const payload = { ...event };
  const start = event.start_time || event.startTime;
  const end = event.end_time || event.endTime;

  if (start) payload.startTime = start;
  if (end) payload.endTime = end;
  if (event.is_all_day !== undefined) payload.allDay = event.is_all_day;
  if (event.created_by) payload.createdBy = event.created_by;

  delete payload.start_time;
  delete payload.end_time;
  delete payload.is_all_day;
  delete payload.created_by;

  return payload;
};

// --- Task tag helpers (stored in localStorage for now) ---
const TASK_TAGS_KEY = 'timelit_task_tags';

const loadTaskTags = () => {
  try {
    const raw = localStorage.getItem(TASK_TAGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.warn('Failed to load task tags from localStorage:', err);
    return [];
  }
};

const saveTaskTags = (tags) => {
  try {
    localStorage.setItem(TASK_TAGS_KEY, JSON.stringify(tags));
  } catch (err) {
    console.warn('Failed to save task tags to localStorage:', err);
  }
};

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Add authentication token if available
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    const config = {
      headers,
      ...options
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle empty responses or non-JSON responses gracefully
        let errorMessage = 'API request failed';
        let errorDetails = null;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
            errorDetails = error;
          } else {
            const text = await response.text();
            if (text) {
              errorMessage = `HTTP ${response.status}: ${text}`;
            } else {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          console.warn('Failed to parse error response:', parseError);
        }
        
        const error = new Error(errorMessage);
        if (errorDetails) {
          error.details = errorDetails;
        }
        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (!text.trim()) {
          return { success: true, data: null };
        }
        return JSON.parse(text);
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }


  // Entities
  entities = {
    Event: {
      get: async (id) => {
        const response = await this.request(`/events/${id}`);
        return mapEventFromServer(response.data);
      },

      filter: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await this.request(`/events${queryString ? `?${queryString}` : ''}`);
        const events = response.data || [];
        return events.map(mapEventFromServer);
      },

      create: async (data) => {
        const response = await this.request('/events', {
          method: 'POST',
          body: JSON.stringify(mapEventToServer(data))
        });
        return mapEventFromServer(response.data);
      },

      update: async (id, data) => {
        const response = await this.request(`/events/${id}`, {
          method: 'PUT',
          body: JSON.stringify(mapEventToServer(data))
        });
        return mapEventFromServer(response.data);
      },

      delete: async (id) => {
        return await this.request(`/events/${id}`, {
          method: 'DELETE'
        });
      },

      bulkCreate: async (events) => {
        const response = await this.request('/events/bulk', {
          method: 'POST',
          body: JSON.stringify({ events: events.map(mapEventToServer) })
        });
        const created = response.data || [];
        return created.map(mapEventFromServer);
      }
    },

    Task: {
      get: async (id) => {
        return await this.request(`/tasks/${id}`);
      },

      filter: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await this.request(`/tasks?${queryString}`);
        return response.data;
      },

      create: async (data) => {
        const response = await this.request('/tasks', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return response.data;
      },

      update: async (id, data) => {
        const response = await this.request(`/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        return response.data;
      },

      delete: async (id) => {
        return await this.request(`/tasks/${id}`, {
          method: 'DELETE'
        });
      }
    },

    TaskList: {
      filter: async (filters = {}) => {
        const response = await this.request('/tasks/lists');
        return response.data;
      },

      create: async (data) => {
        const response = await this.request('/tasks/lists', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return response.data;
      },

      update: async (id, data) => {
        const response = await this.request(`/tasks/lists/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        return response.data;
      },

      delete: async (id) => {
        return await this.request(`/tasks/lists/${id}`, {
          method: 'DELETE'
        });
      }
    },

    TaskTag: {
      filter: async (filters = {}) => {
        const tags = loadTaskTags();
        if (filters.created_by) {
          return tags.filter(t => t.created_by === filters.created_by);
        }
        return tags;
      },

      create: async (data) => {
        const tags = loadTaskTags();
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const tag = { id, ...data };
        tags.push(tag);
        saveTaskTags(tags);
        return tag;
      },

      update: async (id, data) => {
        const tags = loadTaskTags();
        const idx = tags.findIndex(t => t.id === id);
        if (idx === -1) return null;
        tags[idx] = { ...tags[idx], ...data };
        saveTaskTags(tags);
        return tags[idx];
      },

      delete: async (id) => {
        const tags = loadTaskTags();
        const filtered = tags.filter(t => t.id !== id);
        saveTaskTags(filtered);
        return { success: true };
      }
    },



  };



}

// Create and export the client instance
export const timelit = new ApiClient();
