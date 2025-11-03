import { timelit } from './timelitClient';




export const Core = timelit.integrations.Core;

export const InvokeLLM = timelit.integrations.Core.InvokeLLM;

export const SendEmail = timelit.integrations.Core.SendEmail;

export const UploadFile = timelit.integrations.Core.UploadFile;

export const GenerateImage = timelit.integrations.Core.GenerateImage;

export const ExtractDataFromUploadedFile = timelit.integrations.Core.ExtractDataFromUploadedFile;

export const CreateFileSignedUrl = timelit.integrations.Core.CreateFileSignedUrl;

export const UploadPrivateFile = timelit.integrations.Core.UploadPrivateFile;

export const GoogleCalendar = {
  disconnect: async () => {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/integrations/google-calendar/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },

  sync: async () => {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/integrations/google-calendar/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },

  getEvents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/integrations/google-calendar/events?${queryString}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },

  createEvent: async (eventData) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/integrations/google-calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(eventData)
    });
    return response.json();
  }
};






