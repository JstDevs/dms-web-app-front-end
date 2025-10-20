import axios from '@/api/axios';

export interface ActivityLogData {
  action: string;
  userId: number;
  userName: string;
  documentId?: number;
  documentName?: string;
  details?: string;
  metadata?: Record<string, any>;
}

// Centralized activity logging function
export const logActivity = async (activityData: ActivityLogData) => {
  try {
    // Try to send to backend first
    await axios.post('/audit/activity', {
      action: activityData.action,
      userId: activityData.userId,
      userName: activityData.userName,
      documentId: activityData.documentId || 0,
      documentName: activityData.documentName || '',
      details: activityData.details || '',
      metadata: activityData.metadata || {},
      timestamp: new Date().toISOString(),
      ipAddress: '', // Will be filled by backend
      userAgent: navigator.userAgent
    });
  } catch (error) {
    console.warn('Backend logging failed, storing locally:', error);
    
    // Fallback: Store in localStorage for demo purposes
    const activity = {
      id: Date.now() + Math.random(),
      action: activityData.action,
      userId: activityData.userId,
      userName: activityData.userName,
      documentId: activityData.documentId || 0,
      documentName: activityData.documentName || '',
      details: activityData.details || '',
      metadata: activityData.metadata || {},
      timestamp: new Date().toISOString(),
      ipAddress: '',
      userAgent: navigator.userAgent
    };
    
    
    const existingActivities = JSON.parse(localStorage.getItem('userActivities') || '[]');
    existingActivities.push(activity);
    
    // Keep only last 200 activities to prevent localStorage bloat
    if (existingActivities.length > 200) {
      existingActivities.splice(0, existingActivities.length - 200);
    }
    
    localStorage.setItem('userActivities', JSON.stringify(existingActivities));
  }
};

// Helper functions for specific activity types
export const logDocumentActivity = async (
  action: string,
  userId: number,
  userName: string,
  documentId: number,
  documentName: string,
  details?: string
) => {
  await logActivity({
    action,
    userId,
    userName,
    documentId,
    documentName,
    details
  });
};

export const logCollaborationActivity = async (
  action: string,
  userId: number,
  userName: string,
  documentId: number,
  documentName: string,
  collaboratorName?: string,
  permissionLevel?: string
) => {
  await logActivity({
    action,
    userId,
    userName,
    documentId,
    documentName,
    details: collaboratorName ? `Collaborator: ${collaboratorName}` : '',
    metadata: { permissionLevel }
  });
};

export const logSecurityActivity = async (
  action: string,
  userId: number,
  userName: string,
  documentId: number,
  documentName: string,
  restrictionType?: string,
  reason?: string
) => {
  await logActivity({
    action,
    userId,
    userName,
    documentId,
    documentName,
    details: restrictionType ? `Type: ${restrictionType}` : '',
    metadata: { reason }
  });
};

export const logSystemActivity = async (
  action: string,
  userId: number,
  userName: string,
  entityType: string,
  entityName: string,
  details?: string
) => {
  await logActivity({
    action,
    userId,
    userName,
    details: `${entityType}: ${entityName}${details ? ` - ${details}` : ''}`
  });
};

export const logOCRActivity = async (
  action: string,
  userId: number,
  userName: string,
  documentId: number,
  documentName: string,
  templateName?: string,
  success?: boolean
) => {
  await logActivity({
    action,
    userId,
    userName,
    documentId,
    documentName,
    details: templateName ? `Template: ${templateName}` : '',
    metadata: { success }
  });
};

export const logApprovalActivity = async (
  action: string,
  userId: number,
  userName: string,
  documentId: number,
  documentName: string,
  approverName?: string,
  comments?: string
) => {
  await logActivity({
    action,
    userId,
    userName,
    documentId,
    documentName,
    details: approverName ? `Approver: ${approverName}` : '',
    metadata: { comments }
  });
};
