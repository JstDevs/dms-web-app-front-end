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
} from "lucide-react";
import {
  CurrentDocument,
  DocumentVersion,
  DocumentVersionChanges,
} from "@/types/Document";

interface DocumentVersionHistoryProps {
  document: CurrentDocument | null;
}

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  document,
}) => {
  const [selectedVersion, setSelectedVersion] =
    useState<DocumentVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<DocumentVersion | null>(
    null
  );
  const [showComparison, setShowComparison] = useState(false);

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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedVersion.VersionNumber}
              {selectedVersion.IsCurrentVersion && (
                <span className="ml-3 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                  Current
                </span>
              )}
            </h3>
          </div>
          {/* {!selectedVersion.IsCurrentVersion && (
            <button
              onClick={handleRestore}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
            >
              <RefreshCw size={16} />
              Restore this Version
            </button>
          )} */}
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
                    {/* {!version.IsCurrentVersion && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore();
                        }}
                        className="w-full text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        Restore
                      </button>
                    )} */}

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
    </div>
  );
};

export default DocumentVersionHistory;
