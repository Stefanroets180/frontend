import { ReportExport, ReportExportRequest } from '@/types/report-export';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const reportExportService = {
  async requestExport(request: ReportExportRequest): Promise<ReportExport> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/v1/report-exports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to request export');
    }

    return response.json();
  },

  async getExports(): Promise<ReportExport[]> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/v1/report-exports`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch exports');
    }

    return response.json();
  },

  async getExport(exportId: string): Promise<ReportExport> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/v1/report-exports/${exportId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch export');
    }

    return response.json();
  },

  async deleteExport(exportId: string): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/v1/report-exports/${exportId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete export');
    }
  },
};
