import React, { createContext, useContext, useState } from 'react';
import { fetchDocumentAnalytics } from '@/pages/Document/utils/documentHelpers';
import { fetchDocuments } from '@/pages/Document/utils/uploadAPIs';
import {
  CurrentDocument,
  DocumentContextType,
  DocumentListType,
} from '@/types/Document';

const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentDocument, setCurrentDocument] =
    useState<CurrentDocument | null>(null);
  const [documentList, setDocumentList] = useState<DocumentListType>({
    documents: [],
    filteredDocs: [],
    currentPage: 1,
    totalPages: 1,
    totalDocuments: 0,
    loading: false,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = React.useCallback(async (id: string) => {
    setCurrentDocument(null);
    try {
      setLoading(true);
      setError(null);
      const document = await fetchDocumentAnalytics(id);
      if (!document) throw new Error('Document not found');
      if (document.success) {
        setCurrentDocument(document.data);
        return document.data;
      }
    } catch (err) {
      setError('Failed to fetch document');
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocumentList = React.useCallback(
    async (userId: number, page: number = 1) => {
      try {
        setDocumentList((prev) => ({ ...prev, loading: true, error: null }));
        const { data } = await fetchDocuments(userId, page);

        setDocumentList((prev) => ({
          ...prev,
          documents: data.documents,
          filteredDocs: data.documents,
          currentPage: page,
          totalDocuments: data.pagination.totalItems,
          totalPages: data.pagination.totalPages || 1,
          loading: false,
        }));
      } catch (err) {
        setDocumentList((prev) => ({
          ...prev,
          error: 'Failed to fetch documents',
          loading: false,
        }));
        console.error('Failed to fetch documents', err);
      }
    },
    []
  );

  const filterDocuments = React.useCallback(
    (filterFn: (doc: any) => boolean) => {
      setDocumentList((prev) => ({
        ...prev,
        filteredDocs: prev.documents.filter(filterFn),
      }));
    },
    []
  );

  const updateDocument = React.useCallback(
    (updatedDocument: CurrentDocument) => {
      setCurrentDocument(updatedDocument);
    },
    []
  );

  return (
    <DocumentContext.Provider
      value={{
        currentDocument,
        documentList,
        loading,
        error,
        fetchDocument,
        fetchDocumentList,
        filterDocuments,
        updateDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export default DocumentContext;

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};
