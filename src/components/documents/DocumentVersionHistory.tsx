import React, { useState } from "react";
import {
  Clock,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  FileText,
  User,
  Calendar,
  Edit3,
  Shield,
  AlertTriangle,
  MessageSquare,
  File,
  Send,
  AlignLeft,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import {
  CurrentDocument,
  DocumentVersion,
  DocumentVersionChanges,
} from "@/types/Document";
import toast from "react-hot-toast";
import axios from "@/api/axios";
import Modal from "../ui/Modal";
import { getToken } from "@/utils/token";

interface DocumentVersionHistoryProps {
  document: CurrentDocument | null;
}

// Normalize filepath URL to use correct base URL
const normalizeFilepathUrl = (filepath: string | null | undefined): string => {
  if (!filepath) return '';
  
  // If already a full URL, check if it's localhost and replace with API base URL
  if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
    // Check if it contains localhost
    if (filepath.includes('localhost') || filepath.includes('127.0.0.1')) {
      // Extract the path from the URL
      const url = new URL(filepath);
      const path = url.pathname + url.search + url.hash;
      // Use API base URL instead
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      return `${apiBaseUrl}${path}`;
    }
    // Already a valid full URL, return as is
    return filepath;
  }
  
  // If it's a relative path, prepend API base URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  // Ensure path starts with /
  const normalizedPath = filepath.startsWith('/') ? filepath : `/${filepath}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  document,
}) => {
  const [selectedVersion, setSelectedVersion] =
    useState<DocumentVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<DocumentVersion | null>(
    null
  );
  const [showComparison, setShowComparison] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<DocumentVersion | null>(null);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  const allVersions = document?.versions || [];
  const currentVersion =
    allVersions.find((v) => v.IsCurrentVersion) || allVersions[0];

  const handleVersionSelect = (version: DocumentVersion) => {
    setSelectedVersion(version);
    setShowComparison(false);
    setCompareVersion(null);
  };

  const handleCompareSelect = (version: DocumentVersion) => {
    if (selectedVersion && selectedVersion.ID !== version.ID) {
      setCompareVersion(version);
      setShowComparison(true);
    }
  };

  const handleRestore = () => {
    if (!selectedVersion) return;

    // Show success message
    alert(`Version ${selectedVersion.VersionNumber} will be restored`);
  };

  const handleViewVersion = (version: DocumentVersion, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!version.filepath && !document?.document[0]?.ID) {
      toast.error('File not available for this version');
      return;
    }
    
    setViewingVersion(version);
  };

  const handleDownloadVersion = async (version: DocumentVersion, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (!document?.document[0]?.ID) {
      toast.error('Document ID not available');
      return;
    }

    const documentId = document.document[0].ID;
    setIsDownloading(version.ID);

    try {
      let fileUrl: string;
      let fileName: string;

      // Option 1: Use filepath if available
      if (version.filepath) {
        fileUrl = normalizeFilepathUrl(version.filepath);
        // Extract filename from filepath or use version number
        const pathParts = version.filepath.split('/');
        fileName = pathParts[pathParts.length - 1] || `document_v${version.VersionNumber}`;
      } else {
        // Option 2: Use version file endpoint as fallback
        fileUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/documents/documents/${documentId}/versions/${version.ID}/file`;
        fileName = `document_v${version.VersionNumber}`;
      }

      // Fetch the file with authentication
      const token = getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(fileUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Determine file extension from blob type or filename
      let extension = '';
      if (blob.type) {
        if (blob.type.includes('pdf')) extension = '.pdf';
        else if (blob.type.includes('word')) extension = '.docx';
        else if (blob.type.includes('excel') || blob.type.includes('spreadsheet')) extension = '.xlsx';
        else if (blob.type.includes('image')) {
          if (blob.type.includes('png')) extension = '.png';
          else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) extension = '.jpg';
        }
      }
      
      // If no extension from blob, try to get from filename
      if (!extension && fileName.includes('.')) {
        extension = fileName.substring(fileName.lastIndexOf('.'));
      }
      
      // Ensure filename has extension
      if (!fileName.includes('.')) {
        fileName = `${fileName}${extension || '.pdf'}`;
      }

      // Create download link
      // Use window.document to avoid conflict with prop name 'document'
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Version ${version.VersionNumber} downloaded successfully`);
    } catch (error: any) {
      console.error('Failed to download version:', error);
      toast.error(error?.message || 'Failed to download version file');
    } finally {
      setIsDownloading(null);
    }
  };

  const getFileType = (filepath?: string): string => {
    if (!filepath) return 'unknown';
    
    const lowerPath = filepath.toLowerCase();
    if (lowerPath.endsWith('.pdf')) return 'pdf';
    if (lowerPath.endsWith('.docx')) return 'docx';
    if (lowerPath.endsWith('.doc')) return 'doc';
    if (lowerPath.endsWith('.xlsx')) return 'xlsx';
    if (lowerPath.endsWith('.xls')) return 'xls';
    if (lowerPath.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'image';
    return 'unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isChangesObject = (
    changes: string | DocumentVersionChanges
  ): changes is DocumentVersionChanges => {
    return typeof changes === "object" && changes !== null;
  };

  const renderChangesPreview = (changes: string | DocumentVersionChanges) => {
    if (typeof changes === "string") {
      return <p className="text-xs text-gray-600 line-clamp-2">{changes}</p>;
    }

    const changeItems = [];
    if (changes.FileName) changeItems.push(`File: ${changes.FileName}`);
    if (changes.FileDate)
      changeItems.push(
        `Date: ${new Date(changes.FileDate).toLocaleDateString()}`
      );
    if (changes.Expiration !== undefined)
      changeItems.push(`Expiration: ${changes.Expiration ? "Yes" : "No"}`);
    if (changes.Confidential !== undefined)
      changeItems.push(`Confidential: ${changes.Confidential ? "Yes" : "No"}`);
    if (changes.Remarks) changeItems.push(`Remarks: ${changes.Remarks}`);

    return (
      <p className="text-xs text-gray-600 line-clamp-2">
        {changeItems.length > 0 ? changeItems.join(", ") : "Document updated"}
      </p>
    );
  };

  const renderChangesDetails = (changes: string | DocumentVersionChanges) => {
    if (typeof changes === "string") {
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 leading-relaxed">{changes}</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="grid gap-4">
          {changes.FileName && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-blue-100 rounded-lg">
                <File size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">File Name</p>
                <p className="text-gray-900">{changes.FileName}</p>
              </div>
            </div>
          )}

          {changes.FileDate && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">File Date</p>
                <p className="text-gray-900">
                  {new Date(changes.FileDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {changes.FileDescription && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <FileText size={16} className="text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  File Description
                </p>
                <p className="text-gray-900">{changes.FileDescription}</p>
              </div>
            </div>
          )}

          {changes.Expiration !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle size={16} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Expiration</p>
                <p className="text-gray-900">
                  {changes.Expiration ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          )}

          {changes.ExpirationDate && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock size={16} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Expiration Date
                </p>
                <p className="text-gray-900">
                  {new Date(changes.ExpirationDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {changes.Confidential !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Confidential
                </p>
                <p className="text-gray-900">
                  {changes.Confidential ? "Yes" : "No"}
                </p>
              </div>
            </div>
          )}

          {changes.publishing_status !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Send size={16} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Publishing Status
                </p>
                <p className="text-gray-900">
                  {changes.publishing_status === "true"
                    ? "Published"
                    : "Not Published"}
                </p>
              </div>
            </div>
          )}
        </div>

        {changes.Description && (
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <AlignLeft size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Description
                </p>
                <p className="text-gray-900 leading-relaxed">
                  {changes.Description}
                </p>
              </div>
            </div>
          </div>
        )}

        {changes.Remarks && (
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MessageSquare size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </p>
                <p className="text-gray-900 leading-relaxed">
                  {changes.Remarks}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVersionComparison = () => {
    if (!selectedVersion || !compareVersion) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            Comparing Versions
          </h3>
          <button
            onClick={() => {
              setCompareVersion(null);
              setShowComparison(false);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Version
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-2 md:p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                {selectedVersion.VersionNumber}
              </h4>
              <span className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-200 rounded-full">
                Selected
              </span>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                {formatDate(selectedVersion.ModificationDate)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={14} />
                Modified by User {selectedVersion.ModifiedBy}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-blue-200 p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Edit3 size={14} />
                Changes:
              </h5>
              {renderChangesDetails(selectedVersion.Changes)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-2 md:p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                {compareVersion.VersionNumber}
              </h4>
              <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-200 rounded-full">
                Compare
              </span>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                {formatDate(compareVersion.ModificationDate)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={14} />
                Modified by User {compareVersion.ModifiedBy}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Edit3 size={14} />
                Changes:
              </h5>
              {renderChangesDetails(compareVersion.Changes)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVersionDetails = () => {
    if (!selectedVersion) return null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">
              {selectedVersion.VersionNumber}
              {selectedVersion.IsCurrentVersion && (
                <span className="ml-3 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                  Current
                </span>
              )}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {selectedVersion.filepath || document?.document[0]?.ID ? (
              <>
                <button
                  onClick={() => handleViewVersion(selectedVersion)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                >
                  <Eye size={16} />
                  View File
                </button>
                <button
                  onClick={() => handleDownloadVersion(selectedVersion)}
                  disabled={isDownloading === selectedVersion.ID}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
                >
                  {isDownloading === selectedVersion.ID ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {isDownloading === selectedVersion.ID ? 'Downloading...' : 'Download'}
                </button>
              </>
            ) : (
              <div className="text-sm text-gray-500 italic">
                File not available for this version
              </div>
            )}
          </div>
           
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 md:p-6 border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Modified Date
                  </p>
                  <p className="text-gray-900">
                    {formatDate(selectedVersion.ModificationDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Modified By
                  </p>
                  <p className="text-gray-900">
                    User {selectedVersion.ModifiedBy}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Version Status
                  </p>
                  <p className="text-gray-900">
                    {selectedVersion.IsCurrentVersion
                      ? "Current Version"
                      : "Historical Version"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Edit3 size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Change Type
                  </p>
                  <p className="text-gray-900">
                    {isChangesObject(selectedVersion.Changes)
                      ? "Structured Edit"
                      : "Text Change"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-2 md:p-6 shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Edit3 size={18} className="text-gray-600" />
            Version Changes
          </h4>
          {renderChangesDetails(selectedVersion.Changes)}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
        <p className="text-sm text-gray-600 mt-1">
          View and compare previous versions of this document
        </p>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[600px]">
        {/* Version List Sidebar */}
        <div className="w-full lg:w-80 border-r border-gray-200 bg-gray-50">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              All Versions ({allVersions.length})
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
            {allVersions.map((version) => (
              <div
                key={version.ID}
                className={`border-b border-gray-200 p-4 cursor-pointer transition-all duration-200 hover:bg-white ${
                  selectedVersion?.ID === version.ID
                    ? "bg-white shadow-sm border-l-4 border-l-blue-500"
                    : ""
                }`}
                onClick={() => handleVersionSelect(version)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {version.VersionNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    {isChangesObject(version.Changes) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <Edit3 size={10} className="mr-1" />
                        Structured
                      </span>
                    )}
                    {version.IsCurrentVersion && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Current
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{formatDate(version.ModificationDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User size={12} />
                    <span>User {version.ModifiedBy}</span>
                  </div>
                  {renderChangesPreview(version.Changes)}
                </div>

                {selectedVersion?.ID === version.ID && !compareVersion && (
                  <div className="mt-3 space-y-2">
                    {/* View and Download buttons */}
                    {version.filepath || document?.document[0]?.ID ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleViewVersion(version, e)}
                          className="flex-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye size={12} />
                          View
                        </button>
                        <button
                          onClick={(e) => handleDownloadVersion(version, e)}
                          disabled={isDownloading === version.ID}
                          className="flex-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                        >
                          {isDownloading === version.ID ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          {isDownloading === version.ID ? 'Downloading...' : 'Download'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-1">
                        File not available
                      </div>
                    )}

                    {allVersions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Find another version to compare with
                          const otherVersion = allVersions.find(
                            (v) => v.ID !== version.ID
                          );
                          if (otherVersion) {
                            handleCompareSelect(otherVersion);
                          }
                        }}
                        className="w-full text-xs border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                      >
                        Compare
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                )}

                {compareVersion?.ID === version.ID && (
                  <div className="mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareVersion(null);
                        setShowComparison(false);
                      }}
                      className="w-full text-xs text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Cancel Comparison
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-2 md:p-6">
          {!selectedVersion ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <FileText size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a version to view details
              </h3>
              <p className="text-gray-500">
                Choose a version from the list to see its details and changes
              </p>
            </div>
          ) : showComparison && compareVersion ? (
            renderVersionComparison()
          ) : (
            renderVersionDetails()
          )}
        </div>
      </div>

      {/* Version File Viewer Modal */}
      {viewingVersion && (
        <Modal isOpen={!!viewingVersion} onClose={() => setViewingVersion(null)}>
          <div className="w-full h-full">
            {(() => {
              const fileType = getFileType(viewingVersion.filepath);
              let fileUrl: string;

              if (viewingVersion.filepath) {
                fileUrl = normalizeFilepathUrl(viewingVersion.filepath);
              } else if (document?.document[0]?.ID) {
                fileUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/documents/documents/${document.document[0].ID}/versions/${viewingVersion.ID}/file`;
              } else {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <FileText className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      File Not Available
                    </p>
                    <p className="text-sm text-gray-600">
                      The file for version {viewingVersion.VersionNumber} is not available.
                    </p>
                  </div>
                );
              }

              if (fileType === 'pdf') {
                return (
                  <div className="w-full h-full flex items-center justify-center">
                    <iframe
                      src={`${fileUrl}#toolbar=1`}
                      title={`Version ${viewingVersion.VersionNumber} Viewer`}
                      className="w-full border-0 rounded-lg"
                      style={{
                        height: '85vh',
                        minHeight: '600px',
                        maxHeight: '85vh'
                      }}
                      onError={(e) => {
                        console.error('PDF loading error:', e);
                        toast.error('Failed to load PDF. Please try downloading the file instead.');
                      }}
                    />
                  </div>
                );
              } else if (fileType === 'image') {
                return (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={fileUrl}
                      alt={`Version ${viewingVersion.VersionNumber}`}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-lg"
                      onError={(e) => {
                        console.error('Image loading error:', e);
                        toast.error('Failed to load image.');
                      }}
                    />
                  </div>
                );
              } else {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <FileText className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      Preview Not Available
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      This file type cannot be previewed in the browser. Please download the file to view it.
                    </p>
                    <button
                      onClick={() => handleDownloadVersion(viewingVersion)}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Download className="h-4 w-4" />
                      Download Version {viewingVersion.VersionNumber}
                    </button>
                  </div>
                );
              }
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DocumentVersionHistory;
