// Local API client for Timelit infrastructure
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth methods
  auth = {
    login: async (credentials) => {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (response.token) {
        this.setToken(response.token);
      }
      return response;
    },

    register: async (userData) => {
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (response.token) {
        this.setToken(response.token);
      }
      return response;
    },

    logout: () => {
      this.removeToken();
    },

    getCurrentUser: async () => {
      return await this.request('/auth/me');
    }
  };

  // Entities
  entities = {
    Event: {
      get: async (id) => {
        return await this.request(`/events/${id}`);
      },

      filter: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await this.request(`/events?${queryString}`);
        return response.data;
      },

      create: async (data) => {
        const response = await this.request('/events', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return response.data;
      },

      update: async (id, data) => {
        const response = await this.request(`/events/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        return response.data;
      },

      delete: async (id) => {
        return await this.request(`/events/${id}`, {
          method: 'DELETE'
        });
      },

      bulkCreate: async (events) => {
        const response = await this.request('/events/bulk', {
          method: 'POST',
          body: JSON.stringify({ events })
        });
        return response.data;
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

    UserPreferences: {
      get: async () => {
        const response = await this.request('/users/preferences');
        return response.data;
      },

      update: async (id, data) => {
        const response = await this.request('/users/preferences', {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        return response.data;
      }
    },

    MoodEntry: {
      filter: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await this.request(`/users/mood?${queryString}`);
        return response.data;
      },

      create: async (data) => {
        const response = await this.request('/users/mood', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return response.data;
      },

      update: async (id, data) => {
        // Mood entries are updated via POST (upsert)
        return await this.entities.MoodEntry.create(data);
      }
    },

    PomodoroSession: {
      filter: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await this.request(`/users/pomodoro?${queryString}`);
        return response.data;
      },

      update: async (id, data) => {
        const response = await this.request(`/users/pomodoro/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        return response.data;
      }
    }
  };

  // Functions (Google OAuth)
  functions = {
    googleCalendarOAuth: async () => {
      // Redirect to Google OAuth
      window.location.href = `${this.baseURL}/auth/google`;
    },

    googleCalendarWebhook: async (data) => {
      // Handle webhook data
      return data;
    },

    deleteUserAccount: async () => {
      return await this.request('/auth/deleteaccount', {
        method: 'DELETE'
      });
    }
  };

  // Integrations
  integrations = {
    Core: {
      InvokeLLM: async (params) => {
        const response = await this.request('/integrations/llm', {
          method: 'POST',
          body: JSON.stringify(params)
        });
        return response.data;
      },

      SendEmail: async (params) => {
        const response = await this.request('/integrations/email', {
          method: 'POST',
          body: JSON.stringify(params)
        });
        return response.data;
      },

      UploadFile: async (params) => {
        const response = await this.request('/integrations/upload', {
          method: 'POST',
          body: JSON.stringify(params)
        });
        return response.data;
      },

      GenerateImage: async (params) => {
        const response = await this.request('/integrations/image', {
          method: 'POST',
          body: JSON.stringify(params)
        });
        return response.data;
      },

      ExtractDataFromUploadedFile: async (params) => {
        const response = await this.request('/integrations/extract-data', {
          method: 'POST',
          body: JSON.stringify(params)
        });
        return response.data;
      },

      CreateFileSignedUrl: async (params) => {
        const response = await this.request('/integrations/signed-url', {
          method: 'POST',
          body: JSON.stringify(params)
        });
        return response.data;
      },

      UploadPrivateFile: async (params) => {
        // Similar to UploadFile but for private files
        return await this.integrations.Core.UploadFile(params);
      }
    }
  };
}

// Create and export the client instance
export const timelit = new ApiClient();
