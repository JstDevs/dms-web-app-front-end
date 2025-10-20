import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocument } from '../../contexts/DocumentContext';
import DocumentVersionHistory from '../../components/documents/DocumentVersionHistory';
import DocumentCollaboration from '../../components/documents/DocumentCollaboration';
import DocumentApproval from '../../components/documents/DocumentApproval';
import DocumentAuditTrail from '../../components/documents/DocumentAuditTrail';
import {
  ChevronLeft,
  History,
  MessageSquare,
  CheckCircle,
  ClipboardList,
  Loader,
} from 'lucide-react';
import FieldRestrictions from '@/components/documents/DocumentRestriction';
import DocumentCurrentView from '@/components/documents/DocumentCurrentView';

type TabType =
  | 'document'
  | 'versions'
  | 'collaboration'
  | 'approval'
  | 'audit'
  | 'restrictions';

const DocumentView: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { currentDocument, loading, fetchDocument } = useDocument();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('document');

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'document':
        return <DocumentCurrentView document={currentDocument} />;
      case 'versions':
        return <DocumentVersionHistory document={currentDocument} />;
      case 'collaboration':
        return <DocumentCollaboration document={currentDocument} />;
      case 'approval':
        return <DocumentApproval document={currentDocument} />;
      case 'audit':
        return <DocumentAuditTrail document={currentDocument} />;
      case 'restrictions':
        return <FieldRestrictions document={currentDocument} />;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'document', name: 'Document', icon: <ClipboardList size={16} /> },
    { id: 'versions', name: 'Versions', icon: <History size={16} /> },
    { id: 'collaboration', name: 'Collaboration', icon: <MessageSquare size={16} /> },
    { id: 'approval', name: 'Approvals', icon: <CheckCircle size={16} /> },
    { id: 'audit', name: 'Audit Trail', icon: <ClipboardList size={16} /> },
    { id: 'restrictions', name: 'Restrictions', icon: <ClipboardList size={16} /> },
  ];

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in">
        <div className="relative">
          {/* Spinning border */}
          <div className="h-12 w-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          {/* Center Loader Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader size={22} className="text-blue-600 animate-pulse" />
          </div>
        </div>

        <p className="mt-4 text-gray-600 text-sm font-medium tracking-wide">
          Loading Document...
        </p>

        {/* Animated progress bar */}
        <div className="mt-6 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-[progress_2s_ease-in-out_infinite]" />
        </div>

        {/* Skeleton preview */}
        <div className="mt-10 w-3/4 space-y-3">
          <div className="h-5 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded-lg animate-pulse w-5/6"></div>
          <div className="h-5 bg-gray-200 rounded-lg animate-pulse w-4/6"></div>
        </div>
      </div>
    );

  if (!currentDocument)
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
        Document not found
      </div>
    );

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center flex-1 w-full">
          <button
            onClick={() => navigate('/documents/library')}
            className="mr-2 p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {currentDocument?.document[0]?.FileName}
          </h1>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 pb-2">
        <nav className="flex flex-nowrap -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center py-3 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}
    </div>
  );
};

export default DocumentView;
