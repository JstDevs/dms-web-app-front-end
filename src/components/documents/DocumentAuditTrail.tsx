import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AuditTrail, CurrentDocument } from '@/types/Document';
import { format } from 'date-fns';
import {
  Clock,
  Search,
  UserCircle,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@chakra-ui/react';
import { PaginationControls } from '@/components/ui/PaginationControls';
import axios from '@/api/axios';
import { User } from '@/types/User';
import {
  Eye,
  Download,
  Upload,
  Edit,
  Trash2,
  Users,
  Shield,
  CheckCircle,
  AlertTriangle,
  Settings,
  Zap,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';

interface DocumentAuditTrailProps {
  document: CurrentDocument | null;
}

const DocumentAuditTrail: React.FC<DocumentAuditTrailProps> = ({
  document,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [usersMap, setUsersMap] = useState<Map<number, string>>(new Map());
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);
  const [loading, setLoading] = useState(false);

  if (!document) return null;

  // Fetch audit trails for the document
  const fetchAuditTrails = useCallback(async () => {
    if (!document?.document?.[0]?.ID) {
      setAuditTrails([]);
      return;
    }
    
    setLoading(true);
    try {
      // Try to fetch audit trails specifically for this document
      const documentId = document.document[0].ID;
      console.log('🔍 Fetching audit trails for document ID:', documentId);
      
      // First, use the audit trails from the document prop (from analytics endpoint)
      let trails = document.auditTrails || [];
      console.log('📋 Initial trails from document prop:', trails.length);
      
      // Also check localStorage for recent activities that might not be in backend yet
      try {
        const localActivities = JSON.parse(localStorage.getItem('userActivities') || '[]');
        const recentDocumentActivities = localActivities
          .filter((activity: any) => 
            activity.documentId === documentId && 
            activity.action === 'DOWNLOADED' &&
            // Only include activities from the last 5 minutes
            new Date(activity.timestamp).getTime() > Date.now() - 5 * 60 * 1000
          )
          .map((activity: any) => ({
            ID: activity.id || Date.now(),
            DocumentID: documentId,
            LinkID: '',
            Action: activity.action,
            ActionBy: activity.userId,
            ActionDate: activity.timestamp,
            IPAddress: activity.ipAddress || '',
            UserAgent: activity.userAgent || '',
            SessionID: null,
            Description: activity.details || activity.description || null,
            actor: {
              id: activity.userId,
              userName: activity.userName
            },
            OldValues: null,
            NewValues: null,
            ChangedFields: null,
            AdditionalData: activity.metadata || null
          }));
        
        if (recentDocumentActivities.length > 0) {
          console.log('💾 Found recent activities in localStorage:', recentDocumentActivities.length);
          // Merge with existing trails, avoiding duplicates
          const existingIds = new Set(trails.map((t: AuditTrail) => t.ID));
          const newLocalTrails = recentDocumentActivities.filter((t: any) => !existingIds.has(t.ID));
          trails = [...newLocalTrails, ...trails]; // Put local activities first (most recent)
        }
      } catch (error) {
        console.debug('Could not check localStorage for activities:', error);
      }
      
      // Also try to fetch from activities-dashboard endpoint
      // Try with documentId parameter first
      try {
        const response = await axios.get('/documents/activities-dashboard', {
          params: {
            documentId: documentId,
            page: 1,
            pageSize: 1000, // Get all audit trails for this document
          }
        });
        
        if (response.data?.success && response.data?.data?.auditTrails) {
          const fetchedTrails = response.data.data.auditTrails;
          console.log('📥 Fetched trails from activities-dashboard:', fetchedTrails.length);
          
          // Filter to only include trails for this document
          const documentTrails = fetchedTrails.filter((t: any) => 
            t.DocumentID === documentId || 
            t.documentId === documentId || 
            t.document?.ID === documentId ||
            t.documentID === documentId
          );
          
          console.log('✅ Filtered trails for this document:', documentTrails.length);
          
          // Merge with existing trails, avoiding duplicates by ID
          const existingIds = new Set(trails.map((t: AuditTrail) => t.ID));
          const newTrails = documentTrails.filter((t: any) => !existingIds.has(t.ID));
          console.log('🆕 New trails to add:', newTrails.length);
          
          trails = [...trails, ...newTrails];
        }
      } catch (error: any) {
        // If the endpoint doesn't support documentId filter, try without it
        console.debug('⚠️ Could not fetch with documentId filter, trying without filter:', error?.message);
        
        try {
          // Try fetching all activities and filter client-side
          const response = await axios.get('/documents/activities-dashboard', {
            params: {
              page: 1,
              pageSize: 1000,
            }
          });
          
          if (response.data?.success && response.data?.data?.auditTrails) {
            const allTrails = response.data.data.auditTrails;
            const documentTrails = allTrails.filter((t: any) => 
              t.DocumentID === documentId || 
              t.documentId === documentId || 
              t.document?.ID === documentId ||
              t.documentID === documentId
            );
            
            const existingIds = new Set(trails.map((t: AuditTrail) => t.ID));
            const newTrails = documentTrails.filter((t: any) => !existingIds.has(t.ID));
            trails = [...trails, ...newTrails];
            console.log('✅ Added trails from unfiltered fetch:', newTrails.length);
          }
        } catch (error2) {
          console.debug('⚠️ Could not fetch audit trails from activities-dashboard:', error2);
        }
      }
      
      console.log('📊 Total audit trails after merge:', trails.length);
      setAuditTrails(trails);
    } catch (error) {
      console.error('❌ Failed to fetch audit trails:', error);
      // Fallback to document.auditTrails
      setAuditTrails(document.auditTrails || []);
    } finally {
      setLoading(false);
    }
  }, [document?.document?.[0]?.ID, document?.auditTrails]);

  // Fetch audit trails when document changes
  useEffect(() => {
    fetchAuditTrails();
    
    // Also refresh after delays to catch any newly logged activities
    // (e.g., download activities that were just logged)
    const timeout1 = setTimeout(() => {
      console.log('🔄 Auto-refreshing audit trail (first attempt)...');
      fetchAuditTrails();
    }, 1500); // 1.5 second delay
    
    const timeout2 = setTimeout(() => {
      console.log('🔄 Auto-refreshing audit trail (second attempt)...');
      fetchAuditTrails();
    }, 3000); // 3 second delay
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [fetchAuditTrails]);

  // Fetch users to resolve user names if needed
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get('/users');
        const users: User[] = data.users || [];
        const map = new Map<number, string>();
        users.forEach((user) => {
          if (user.ID) {
            map.set(user.ID, user.UserName);
          }
        });
        setUsersMap(map);
      } catch (error) {
        console.warn('Failed to fetch users for audit trail:', error);
      }
    };
    fetchUsers();
  }, []);

  // Action meta mapping (label, colors, icon, layout style)
  const ACTION_META: Record<string, { 
    label: string; 
    dotBg: string; 
    dotText: string; 
    badgeBg: string; 
    badgeText: string; 
    cardBg: string; 
    cardBorder: string; 
    icon: React.ElementType;
    layout: 'default' | 'highlight' | 'minimal' | 'detailed';
    animation: 'none' | 'pulse' | 'bounce' | 'fade';
  }> = {
    // Document - Different layouts for visual variety
    VIEWED: { 
      label: 'Viewed', 
      dotBg: 'bg-blue-100', 
      dotText: 'text-blue-600', 
      badgeBg: 'bg-blue-100', 
      badgeText: 'text-blue-700', 
      cardBg: 'bg-blue-50', 
      cardBorder: 'border-blue-200', 
      icon: Eye,
      layout: 'minimal',
      animation: 'fade'
    },
    DOWNLOADED: { 
      label: 'Downloaded', 
      dotBg: 'bg-cyan-100', 
      dotText: 'text-cyan-600', 
      badgeBg: 'bg-cyan-100', 
      badgeText: 'text-cyan-700', 
      cardBg: 'bg-cyan-50', 
      cardBorder: 'border-cyan-200', 
      icon: Download,
      layout: 'highlight',
      animation: 'pulse'
    },
    CREATED: { 
      label: 'Created', 
      dotBg: 'bg-emerald-100', 
      dotText: 'text-emerald-600', 
      badgeBg: 'bg-emerald-100', 
      badgeText: 'text-emerald-700', 
      cardBg: 'bg-emerald-50', 
      cardBorder: 'border-emerald-200', 
      icon: Upload,
      layout: 'detailed',
      animation: 'bounce'
    },
    UPDATED: { 
      label: 'Updated', 
      dotBg: 'bg-indigo-100', 
      dotText: 'text-indigo-600', 
      badgeBg: 'bg-indigo-100', 
      badgeText: 'text-indigo-700', 
      cardBg: 'bg-indigo-50', 
      cardBorder: 'border-indigo-200', 
      icon: Edit,
      layout: 'default',
      animation: 'none'
    },
    DELETED: { 
      label: 'Deleted', 
      dotBg: 'bg-rose-100', 
      dotText: 'text-rose-600', 
      badgeBg: 'bg-rose-100', 
      badgeText: 'text-rose-700', 
      cardBg: 'bg-rose-50', 
      cardBorder: 'border-rose-200', 
      icon: Trash2,
      layout: 'highlight',
      animation: 'pulse'
    },
    DOCUMENT_SHARED: { 
      label: 'Shared', 
      dotBg: 'bg-teal-100', 
      dotText: 'text-teal-600', 
      badgeBg: 'bg-teal-100', 
      badgeText: 'text-teal-700', 
      cardBg: 'bg-teal-50', 
      cardBorder: 'border-teal-200', 
      icon: Users,
      layout: 'detailed',
      animation: 'fade'
    },
    DOCUMENT_UNSHARED: { 
      label: 'Unshared', 
      dotBg: 'bg-slate-200', 
      dotText: 'text-slate-600', 
      badgeBg: 'bg-slate-200', 
      badgeText: 'text-slate-700', 
      cardBg: 'bg-slate-50', 
      cardBorder: 'border-slate-200', 
      icon: Users,
      layout: 'minimal',
      animation: 'none'
    },

    // Versions
    VERSION_CREATED: { 
      label: 'Version Created', 
      dotBg: 'bg-violet-100', 
      dotText: 'text-violet-600', 
      badgeBg: 'bg-violet-100', 
      badgeText: 'text-violet-700', 
      cardBg: 'bg-violet-50', 
      cardBorder: 'border-violet-200', 
      icon: Upload,
      layout: 'detailed',
      animation: 'bounce'
    },
    VERSION_RESTORED: { 
      label: 'Version Restored', 
      dotBg: 'bg-fuchsia-100', 
      dotText: 'text-fuchsia-600', 
      badgeBg: 'bg-fuchsia-100', 
      badgeText: 'text-fuchsia-700', 
      cardBg: 'bg-fuchsia-50', 
      cardBorder: 'border-fuchsia-200', 
      icon: RotateCcw,
      layout: 'highlight',
      animation: 'pulse'
    },
    VERSION_FINALIZED: { 
      label: 'Version Finalized', 
      dotBg: 'bg-amber-100', 
      dotText: 'text-amber-600', 
      badgeBg: 'bg-amber-100', 
      badgeText: 'text-amber-700', 
      cardBg: 'bg-amber-50', 
      cardBorder: 'border-amber-200', 
      icon: CheckCircle,
      layout: 'highlight',
      animation: 'bounce'
    },

    // Collaboration
    COLLABORATOR_ADDED: { 
      label: 'Collaborator Added', 
      dotBg: 'bg-purple-100', 
      dotText: 'text-purple-600', 
      badgeBg: 'bg-purple-100', 
      badgeText: 'text-purple-700', 
      cardBg: 'bg-purple-50', 
      cardBorder: 'border-purple-200', 
      icon: Users,
      layout: 'detailed',
      animation: 'fade'
    },
    COLLABORATOR_REMOVED: { 
      label: 'Collaborator Removed', 
      dotBg: 'bg-purple-100', 
      dotText: 'text-purple-600', 
      badgeBg: 'bg-purple-100', 
      badgeText: 'text-purple-700', 
      cardBg: 'bg-purple-50', 
      cardBorder: 'border-purple-200', 
      icon: Users,
      layout: 'default',
      animation: 'none'
    },
    COLLABORATOR_PERMISSION_CHANGED: { 
      label: 'Permission Changed', 
      dotBg: 'bg-purple-100', 
      dotText: 'text-purple-600', 
      badgeBg: 'bg-purple-100', 
      badgeText: 'text-purple-700', 
      cardBg: 'bg-purple-50', 
      cardBorder: 'border-purple-200', 
      icon: Shield,
      layout: 'highlight',
      animation: 'pulse'
    },
    COMMENT_ADDED: { 
      label: 'Comment Added', 
      dotBg: 'bg-amber-100', 
      dotText: 'text-amber-600', 
      badgeBg: 'bg-amber-100', 
      badgeText: 'text-amber-700', 
      cardBg: 'bg-amber-50', 
      cardBorder: 'border-amber-200', 
      icon: MessageSquare,
      layout: 'minimal',
      animation: 'fade'
    },
    COMMENT_DELETED: { 
      label: 'Comment Deleted', 
      dotBg: 'bg-amber-100', 
      dotText: 'text-amber-600', 
      badgeBg: 'bg-amber-100', 
      badgeText: 'text-amber-700', 
      cardBg: 'bg-amber-50', 
      cardBorder: 'border-amber-200', 
      icon: MessageSquare,
      layout: 'minimal',
      animation: 'none'
    },

    // Approval
    DOCUMENT_SUBMITTED_FOR_APPROVAL: { 
      label: 'Submitted for Approval', 
      dotBg: 'bg-orange-100', 
      dotText: 'text-orange-600', 
      badgeBg: 'bg-orange-100', 
      badgeText: 'text-orange-700', 
      cardBg: 'bg-orange-50', 
      cardBorder: 'border-orange-200', 
      icon: CheckCircle,
      layout: 'highlight',
      animation: 'pulse'
    },
    DOCUMENT_APPROVED: { 
      label: 'Approved', 
      dotBg: 'bg-green-100', 
      dotText: 'text-green-600', 
      badgeBg: 'bg-green-100', 
      badgeText: 'text-green-700', 
      cardBg: 'bg-green-50', 
      cardBorder: 'border-green-200', 
      icon: CheckCircle,
      layout: 'highlight',
      animation: 'bounce'
    },
    DOCUMENT_REJECTED: { 
      label: 'Rejected', 
      dotBg: 'bg-red-100', 
      dotText: 'text-red-600', 
      badgeBg: 'bg-red-100', 
      badgeText: 'text-red-700', 
      cardBg: 'bg-red-50', 
      cardBorder: 'border-red-200', 
      icon: AlertTriangle,
      layout: 'highlight',
      animation: 'pulse'
    },
    APPROVAL_MATRIX_CREATED: { 
      label: 'Approval Matrix Created', 
      dotBg: 'bg-orange-100', 
      dotText: 'text-orange-600', 
      badgeBg: 'bg-orange-100', 
      badgeText: 'text-orange-700', 
      cardBg: 'bg-orange-50', 
      cardBorder: 'border-orange-200', 
      icon: Settings,
      layout: 'detailed',
      animation: 'fade'
    },
    APPROVAL_MATRIX_UPDATED: { 
      label: 'Approval Matrix Updated', 
      dotBg: 'bg-orange-100', 
      dotText: 'text-orange-600', 
      badgeBg: 'bg-orange-100', 
      badgeText: 'text-orange-700', 
      cardBg: 'bg-orange-50', 
      cardBorder: 'border-orange-200', 
      icon: Settings,
      layout: 'default',
      animation: 'none'
    },

    // Security
    RESTRICTION_ADDED: { 
      label: 'Restriction Added', 
      dotBg: 'bg-red-100', 
      dotText: 'text-red-600', 
      badgeBg: 'bg-red-100', 
      badgeText: 'text-red-700', 
      cardBg: 'bg-red-50', 
      cardBorder: 'border-red-200', 
      icon: Shield,
      layout: 'highlight',
      animation: 'pulse'
    },
    RESTRICTION_REMOVED: { 
      label: 'Restriction Removed', 
      dotBg: 'bg-red-100', 
      dotText: 'text-red-600', 
      badgeBg: 'bg-red-100', 
      badgeText: 'text-red-700', 
      cardBg: 'bg-red-50', 
      cardBorder: 'border-red-200', 
      icon: Shield,
      layout: 'default',
      animation: 'none'
    },
    CONFIDENTIAL_ACCESS: { 
      label: 'Confidential Access', 
      dotBg: 'bg-red-100', 
      dotText: 'text-red-600', 
      badgeBg: 'bg-red-100', 
      badgeText: 'text-red-700', 
      cardBg: 'bg-red-50', 
      cardBorder: 'border-red-200', 
      icon: Shield,
      layout: 'highlight',
      animation: 'pulse'
    },

    // OCR
    OCR_READ: { 
      label: 'OCR Read', 
      dotBg: 'bg-yellow-100', 
      dotText: 'text-yellow-600', 
      badgeBg: 'bg-yellow-100', 
      badgeText: 'text-yellow-700', 
      cardBg: 'bg-yellow-50', 
      cardBorder: 'border-yellow-200', 
      icon: Zap,
      layout: 'minimal',
      animation: 'fade'
    },
    OCR_TEMPLATE_APPLIED: { 
      label: 'Template Applied', 
      dotBg: 'bg-yellow-100', 
      dotText: 'text-yellow-600', 
      badgeBg: 'bg-yellow-100', 
      badgeText: 'text-yellow-700', 
      cardBg: 'bg-yellow-50', 
      cardBorder: 'border-yellow-200', 
      icon: Settings,
      layout: 'detailed',
      animation: 'bounce'
    },
    OCR_FIELDS_EXTRACTED: { 
      label: 'Fields Extracted', 
      dotBg: 'bg-yellow-100', 
      dotText: 'text-yellow-600', 
      badgeBg: 'bg-yellow-100', 
      badgeText: 'text-yellow-700', 
      cardBg: 'bg-yellow-50', 
      cardBorder: 'border-yellow-200', 
      icon: Zap,
      layout: 'default',
      animation: 'none'
    },
  };

  const getActionMeta = (action: string) => {
    return (
      ACTION_META[action] || {
        label: action,
        dotBg: 'bg-gray-100',
        dotText: 'text-gray-600',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-700',
        cardBg: 'bg-gray-50',
        cardBorder: 'border-gray-200',
        icon: UserCircle,
        layout: 'default',
        animation: 'none'
      }
    );
  };

  // Use auditTrails from state (which includes fetched trails)
  const sourceEntries = useMemo<AuditTrail[]>(() => {
    // Use auditTrails from state if available, otherwise fallback to document.auditTrails
    const base = auditTrails.length > 0 ? auditTrails : (document.auditTrails || []);
    console.log('🔍 Audit trail source entries:', base.length, base);
    
    // Normalize audit trail entries to ensure they have the correct structure
    const normalized = base.map((entry: any) => {
      // Get user ID from various possible fields
      const userId = entry.actor?.id || 
                     entry.ActionBy || 
                     entry.actionBy || 
                     entry.user?.ID ||
                     entry.user?.id ||
                     entry.userId ||
                     entry.UserID ||
                     0;
      
      // Get user name from various possible fields (check nested objects first, then flat fields)
      let userName = entry.actor?.userName ||
                     entry.actor?.user_name ||
                     entry.user?.UserName ||
                     entry.user?.userName ||
                     entry.user?.user_name ||
                     entry.userName ||
                     entry.user_name ||
                     entry.UserName ||
                     entry.CreatedBy ||
                     entry.createdBy ||
                     (entry.actor && typeof entry.actor === 'object' && entry.actor.userName);
      
      // If we still don't have a user name but we have a user ID, try to get it from the users map
      if (!userName && userId && usersMap.size > 0) {
        userName = usersMap.get(Number(userId)) || null;
      }
      
      // Final fallback to Unknown - only show warning if usersMap is loaded and user still not found
      if (!userName) {
        userName = userId ? `User ${userId}` : 'Unknown';
        // Only log warning if usersMap has been populated (users loaded) and user ID exists
        // This prevents warnings during initial load when users haven't been fetched yet
        if (userId && usersMap.size > 0) {
          // Use debug level instead of warn to reduce console noise
          // These warnings typically indicate deleted users or data inconsistencies
          if (process.env.NODE_ENV === 'development') {
            console.debug('User name not found for user ID:', userId, '(User may have been deleted)');
          }
        }
      }
      
      return {
        ...entry,
        actor: {
          id: userId,
          userName: userName
        }
      };
    });
    
    return normalized.sort((a, b) => new Date(b.ActionDate).getTime() - new Date(a.ActionDate).getTime());
  }, [auditTrails, document.auditTrails, usersMap]);

  // Set total items based on source entries
  useEffect(() => {
    setTotalItems(sourceEntries.length);
  }, [sourceEntries]);

  // Filter entries based on search and filters
  const allFilteredEntries = sourceEntries.filter((entry) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !entry.Action.toLowerCase().includes(searchLower) &&
        !(entry.actor?.userName || '').toLowerCase().includes(searchLower) &&
        !(entry.Description?.toLowerCase().includes(searchLower) ?? false)
      ) {
        return false;
      }
    }

    // User filter
    if (selectedUser && entry.actor?.id?.toString() !== selectedUser) {
      return false;
    }

    // Action filter
    if (selectedAction && entry.Action !== selectedAction) {
      return false;
    }

    // Date range filter
    // const actionDate = new Date(entry.ActionDate);
    // if (dateRange.from && actionDate <= new Date(dateRange.from)) {
    //   return false;
    // }
    // if (dateRange.to && actionDate >= new Date(dateRange.to)) {
    //   return false;
    // }
    const actionDate = new Date(entry.ActionDate);
    const actionDateOnly = new Date(
      actionDate.getFullYear(),
      actionDate.getMonth(),
      actionDate.getDate()
    );

    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      const fromDateOnly = new Date(
        fromDate.getFullYear(),
        fromDate.getMonth(),
        fromDate.getDate()
      );
      if (actionDateOnly < fromDateOnly) {
        return false;
      }
    }

    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      const toDateOnly = new Date(
        toDate.getFullYear(),
        toDate.getMonth(),
        toDate.getDate() + 1
      ); // +1 to include the entire day
      if (actionDateOnly >= toDateOnly) {
        return false;
      }
    }
    return true;
  });

  // Apply pagination to filtered entries
  const filteredEntries = allFilteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Update total items based on filtered results
  useEffect(() => {
    setTotalItems(allFilteredEntries.length);
  }, [allFilteredEntries]);

  // Get unique users and actions for filters
  const uniqueUserNames = sourceEntries.reduce((acc, entry) => {
    const actorId = entry.actor?.id?.toString() || '0';
    if (!acc.some((user) => user.id === actorId)) {
      acc.push({ id: actorId, name: entry.actor?.userName || 'Unknown' });
    }
    return acc;
  }, [] as { id: string; name: string }[]);

  const uniqueActions = Array.from(
    new Set(sourceEntries.map((entry) => entry.Action))
  );

  // Group entries by date
  const entriesByDate: { [date: string]: AuditTrail[] } = {};
  filteredEntries.forEach((entry) => {
    const date = format(new Date(entry.ActionDate), 'yyyy-MM-dd');
    if (!entriesByDate[date]) {
      entriesByDate[date] = [];
    }
    entriesByDate[date].push(entry);
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedUser(null);
    setSelectedAction(null);
    setDateRange({ from: '', to: '' });
  };

  // Format changed fields if they exist
  const formatChanges = (entry: AuditTrail) => {
    if (!entry.ChangedFields) return null;

    try {
      const changedFields = JSON.parse(entry.ChangedFields);
      const oldValues = entry.OldValues ? JSON.parse(entry.OldValues) : {};
      const newValues = entry.NewValues ? JSON.parse(entry.NewValues) : {};

      return Object.keys(changedFields).map((field) => (
        <div key={field} className="text-xs">
          <span className="text-gray-700">{field}: </span>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 mt-1">
            <div className="bg-red-50 p-1 rounded text-red-800 line-through">
              {oldValues[field]?.toString() || 'null'}
            </div>
            <div className="hidden sm:block text-gray-400">→</div>
            <div className="bg-green-50 p-1 rounded text-green-800">
              {newValues[field]?.toString() || 'null'}
            </div>
          </div>
        </div>
      ));
    } catch (e) {
      console.error('Error parsing changed fields:', e);
      return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-900">Audit Trail</h2>
            <p className="text-sm text-gray-500 mt-1">
              View the complete history of changes to this document
            </p>
          </div>
          <Button
            onClick={fetchAuditTrails}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-md shadow-sm"
            title="Refresh audit trail"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              <div>
                <label
                  htmlFor="user-filter"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  User
                </label>
                <select
                  id="user-filter"
                  className="block w-full pl-3 pr-2 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={selectedUser || ''}
                  onChange={(e) => setSelectedUser(e.target.value || null)}
                >
                  <option value="" hidden>
                    All Users
                  </option>
                  {uniqueUserNames?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="action-filter"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Action
                </label>
                <select
                  id="action-filter"
                  className="block w-full pl-3 pr-2 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={selectedAction || ''}
                  onChange={(e) => setSelectedAction(e.target.value || null)}
                >
                  <option value="" hidden>
                    All Actions
                  </option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="date-from"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  From Date
                </label>
                <input
                  type="date"
                  id="date-from"
                  className="block w-full px-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, from: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="date-to"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  To Date
                </label>
                <input
                  type="date"
                  id="date-to"
                  className="block w-full px-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, to: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleClearFilters}
                className="text-sm border border-gray-300 px-2 bg-gray-100 hover:bg-gray-200 text-black"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit trail timeline */}
      <div className="p-6 overflow-y-auto max-h-[calc(100vh-350px)]">
        {Object.keys(entriesByDate).length > 0 ? (
          Object.keys(entriesByDate)
            .sort()
            .reverse()
            .map((date) => (
              <div key={date} className="mb-8 last:mb-0">
                <h3 className="text-sm font-medium text-gray-500 mb-4">
                  {format(new Date(date), 'MMMM d, yyyy')}
                </h3>

                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-gray-200"></div>

                  <div className="space-y-6">
                    {entriesByDate[date].map((entry) => {
                      const meta = getActionMeta(entry.Action);
                      const Icon = meta.icon;
                      
                      // Animation classes
                      const animationClass = meta.animation === 'pulse' ? 'animate-pulse' : 
                                           meta.animation === 'bounce' ? 'animate-bounce' : 
                                           meta.animation === 'fade' ? 'animate-fade-in' : '';
                      
                      // Layout-specific rendering
                      const renderEventCard = () => {
                        switch (meta.layout) {
                          case 'minimal':
                            return (
                              <div className={`${meta.cardBg} p-3 rounded-md border ${meta.cardBorder} shadow-sm ${animationClass}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badgeBg} ${meta.badgeText}`}>
                                    <Icon className="h-3 w-3" />
                                    {meta.label}
                                  </span>
                                  <span className="text-sm text-gray-600">{entry.actor.userName}</span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(entry.ActionDate).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            );
                          
                          case 'highlight':
                            return (
                              <div className={`${meta.cardBg} p-4 rounded-lg border-2 ${meta.cardBorder} shadow-lg ${animationClass}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-full ${meta.dotBg} flex items-center justify-center`}>
                                      <Icon className={`h-5 w-5 ${meta.dotText}`} />
                                    </div>
                                    <div>
                                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${meta.badgeBg} ${meta.badgeText}`}>
                                        <Icon className="h-4 w-4" />
                                        {meta.label}
                                      </span>
                                      <p className="text-sm text-gray-900 mt-1">
                                        <span className="font-semibold">{entry.actor.userName}</span>
                                        {entry.Description && (
                                          <span className="text-gray-600 ml-2">- {entry.Description}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">
                                      {new Date(entry.ActionDate).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          
                          case 'detailed':
                            return (
                              <div className={`${meta.cardBg} p-5 rounded-xl border ${meta.cardBorder} shadow-md ${animationClass}`}>
                                <div className="flex items-start gap-4">
                                  <div className={`h-12 w-12 rounded-full ${meta.dotBg} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`h-6 w-6 ${meta.dotText}`} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${meta.badgeBg} ${meta.badgeText}`}>
                                        <Icon className="h-4 w-4" />
                                        {meta.label}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-900 mb-1">
                                      <span className="font-semibold">{entry.actor.userName}</span>
                                      <span className="text-gray-600 ml-2">{entry.Action.toLowerCase()}</span>
                                      {entry.Description && (
                                        <span className="text-gray-600 ml-2">- {entry.Description}</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {new Date(entry.ActionDate).toLocaleString()}
                                    </p>
                                    {entry.ChangedFields && (
                                      <div className="mt-3 bg-white p-3 rounded-md border">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Changes:</p>
                                        <div className="space-y-1">
                                          {formatChanges(entry)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                        </div>
                            );

                          default: // 'default'
                            return (
                              <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${meta.cardBg} p-4 rounded-lg border ${meta.cardBorder} shadow-sm ${animationClass}`}>
                          <div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badgeBg} ${meta.badgeText} mb-1`}>
                                    <Icon className="h-3.5 w-3.5" />
                                    {meta.label}
                                  </span>
                            <p className="text-sm text-gray-900">
                                    <span className="font-medium">{entry.actor.userName}</span>
                                    <span className="text-gray-600 ml-2">{entry.Action.toLowerCase()}</span>
                              {entry.Description && (
                                      <span className="text-gray-600 ml-2">- {entry.Description}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                                    {new Date(entry.ActionDate).toLocaleString()}
                            </p>
                          </div>
                          {entry.ChangedFields && (
                                  <div className="mt-3 sm:mt-0 bg-white p-3 rounded-md max-w-md">
                                    <p className="text-xs font-medium text-gray-700 mb-2">Changes:</p>
                              <div className="space-y-2">
                                {formatChanges(entry)}
                              </div>
                            </div>
                          )}
                        </div>
                            );
                        }
                      };

                      return (
                        <div
                          key={entry.ID}
                          className="relative pl-10"
                        >
                          <div className={`absolute left-0 top-0 mt-1.5 h-8 w-8 rounded-full ${meta.dotBg} flex items-center justify-center z-10`}>
                            <Icon className={`h-5 w-5 ${meta.dotText}`} />
                          </div>
                          {renderEventCard()}
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No audit records found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ||
              selectedUser ||
              selectedAction ||
              dateRange.from ||
              dateRange.to
                ? 'Try adjusting your filters'
                : 'Changes to this document will appear here'}
            </p>
          </div>
        )}

        {/* Pagination */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
};

export default DocumentAuditTrail;
