import React, { useState } from "react";
import { format } from "date-fns";
import ReactDiffViewer from "react-diff-viewer-continued";
import { Document, Version } from "../../types/Document";
import { Clock, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@chakra-ui/react";
// import { Button } from "../ui/Button";

interface DocumentVersionHistoryProps {
  document: Document;
}

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  document,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const currentVersion = {
    id: "current",
    number: document.versions.length + 1,
    createdAt: document.lastModifiedAt,
    createdBy: document.lastModifiedBy,
    content: document.content,
  };

  const allVersions = [currentVersion, ...document.versions];

  const handleVersionSelect = (version: Version) => {
    setSelectedVersion(version);
    setShowComparison(false);
  };

  const handleCompareSelect = (version: Version) => {
    setCompareVersion(version);
    setShowComparison(true);
  };

  const handleRestore = () => {
    if (!selectedVersion) return;

    // In a real app, this would call an API to restore the version
    toast.success(`Restored to version ${selectedVersion.number}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-medium text-gray-900">Version History</h2>
        <p className="text-sm text-gray-500 mt-1">
          View and compare previous versions of this document
        </p>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Version list */}
        <div className="w-full md:w-1/3 border-r border-gray-200 bg-gray-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">All Versions</h3>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {allVersions.map((version, index) => (
              <div
                key={version.id}
                className={`border-b border-gray-200 p-4 cursor-pointer hover:bg-gray-100 transition-colors ${
                  selectedVersion?.id === version.id ? "bg-blue-50" : ""
                }`}
                onClick={() => handleVersionSelect(version)}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    v{version.number}
                  </span>
                  {selectedVersion?.id === version.id &&
                    compareVersion === null && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore();
                        }}
                        className="text-xs text-blue-600 hover:opacity-80 flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        Restore
                      </Button>
                    )}
                </div>
                <p className="text-sm font-medium text-gray-900 mt-2">
                  {version.id === "current"
                    ? "Current Version"
                    : `Version ${version.number}`}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <Clock size={12} className="mr-1" />
                  <span>
                    {format(new Date(version.createdAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  By {version.createdBy}
                </p>

                {selectedVersion?.id === version.id &&
                  compareVersion === null &&
                  version.id !== "current" && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentVersionIndex = allVersions.findIndex(
                            (v) => v.id === "current"
                          );
                          handleCompareSelect(allVersions[currentVersionIndex]);
                        }}
                        className="text-xs border border-gray-300 bg-gray-100 hover:bg-gray-200 text-black px-2 py-1 rounded-md flex items-center gap-1"
                      >
                        Compare with Current
                        <ArrowRight size={12} />
                      </Button>
                    </div>
                  )}

                {compareVersion?.id === version.id && (
                  <div className="mt-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareVersion(null);
                        setShowComparison(false);
                      }}
                      className="text-xs text-blue-600 hover:opacity-80 flex items-center gap-1"
                    >
                      Cancel Comparison
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Version content or comparison */}
        <div className="w-full md:w-2/3 p-6">
          {!selectedVersion ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-gray-500">
                Select a version to view its content
              </p>
            </div>
          ) : showComparison && compareVersion ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Comparing Versions
                </h3>
                <Button
                  onClick={() => {
                    setCompareVersion(null);
                    setShowComparison(false);
                  }}
                  className="text-sm text-blue-600 hover:opacity-80 flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Back to Version
                </Button>
              </div>

              <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-md">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Version {selectedVersion.number}
                  </span>
                  <div className="text-xs text-gray-500">
                    {format(new Date(selectedVersion.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="text-gray-400">vs</div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {compareVersion.id === "current"
                      ? "Current Version"
                      : `Version ${compareVersion.number}`}
                  </span>
                  <div className="text-xs text-gray-500">
                    {format(new Date(compareVersion.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
              </div>

              <ReactDiffViewer
                oldValue={selectedVersion.content}
                newValue={compareVersion.content}
                splitView={true}
                useDarkTheme={false}
                leftTitle={`Version ${selectedVersion.number}`}
                rightTitle={
                  compareVersion.id === "current"
                    ? "Current Version"
                    : `Version ${compareVersion.number}`
                }
              />
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between flex-wrap">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedVersion.id === "current"
                    ? "Current Version"
                    : `Version ${selectedVersion.number}`}
                </h3>

                {selectedVersion.id !== "current" && (
                  <Button
                    onClick={handleRestore}
                    className=" flex-initial px-2 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <RefreshCw size={14} />
                    Restore this Version
                  </Button>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                  <Clock size={14} />
                  {format(
                    new Date(selectedVersion.createdAt),
                    "MMMM d, yyyy h:mm a"
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Modified by {selectedVersion.createdBy}
                </div>
              </div>

              <div className="border border-gray-200 rounded-md p-4 mt-4 whitespace-pre-wrap text-gray-800">
                {selectedVersion.content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionHistory;
