import React from 'react';
import {
  Lock,
  Unlock,
  Loader2,
  UserCircle,
  Eye,
  EyeOff,
  Target,
  Square,
  MapPin,
} from 'lucide-react';
import { Restriction } from '@/types/Restriction';
import { CurrentDocument } from '@/types/Document';

interface RestrictionListProps {
  restrictions: Restriction[];
  expandedUser: number | null;
  setExpandedUser: (userId: number | null) => void;
  onRemoveRestriction: (restrictionId: number) => void;
  processingRestriction: number | null;
  document: CurrentDocument | null;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RestrictionList: React.FC<RestrictionListProps> = ({
  restrictions,
  expandedUser,
  setExpandedUser,
  onRemoveRestriction,
  processingRestriction,
  document,
}) => {
  // Group restrictions by collaborator
  const restrictionsByCollaborator =
    document?.collaborations?.reduce((acc, collaborator) => {
      acc[collaborator.CollaboratorID] = restrictions.filter(
        (restriction) => restriction.UserID === collaborator.CollaboratorID
      );
      return acc;
    }, {} as Record<number, Restriction[]>) || {};

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Active Restrictions ({restrictions.length})
        </h3>
        <p className="text-sm text-gray-600">
          Manage existing field and area restrictions for each collaborator
        </p>
      </div>

      {document?.collaborations?.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <UserCircle size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium text-lg mb-1">
            No collaborators found
          </p>
          <p className="text-sm text-gray-500">
            Add collaborators to the document to manage access restrictions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {document?.collaborations?.map((collab) => {
            const collaboratorRestrictions =
              restrictionsByCollaborator[collab.CollaboratorID] || [];
            const isExpanded = expandedUser === collab.CollaboratorID;

            // Separate field and area restrictions
            const fieldRestrictions = collaboratorRestrictions.filter(
              (r) => r.restrictedType === 'field'
            );
            const areaRestrictions = collaboratorRestrictions.filter(
              (r) => r.restrictedType === 'open'
            );

            return (
              <div
                key={collab.ID}
                className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Collaborator Header */}
                <div
                  className={`flex items-center justify-between p-5 cursor-pointer transition-all duration-200 ${
                    collaboratorRestrictions.length > 0
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150'
                  }`}
                  onClick={() =>
                    setExpandedUser(isExpanded ? null : collab.CollaboratorID)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center shadow-sm ${
                        collaboratorRestrictions.length > 0
                          ? 'bg-gradient-to-r from-red-500 to-orange-500'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600'
                      }`}
                    >
                      <UserCircle className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">
                        {collab.CollaboratorName}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">
                          {collaboratorRestrictions.length > 0
                            ? `${collaboratorRestrictions.length} restriction${
                                collaboratorRestrictions.length !== 1 ? 's' : ''
                              }`
                            : 'No restrictions'}
                        </span>
                        {fieldRestrictions.length > 0 && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {fieldRestrictions.length} field
                            {fieldRestrictions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {areaRestrictions.length > 0 && (
                          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                            {areaRestrictions.length} area
                            {areaRestrictions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {collaboratorRestrictions.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <EyeOff className="h-4 w-4 mr-1" />
                        Restricted
                      </span>
                    )}
                    <div className="text-gray-400">
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="bg-white border-t border-gray-200">
                    {collaboratorRestrictions.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-3 bg-green-100 rounded-full w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                          <Eye size={24} className="text-green-600" />
                        </div>
                        <p className="text-gray-600 font-medium text-lg mb-1">
                          Full Access
                        </p>
                        <p className="text-sm text-gray-500">
                          This collaborator can view all document fields and
                          areas
                        </p>
                      </div>
                    ) : (
                      <div className="p-5">
                        {/* Field Restrictions Section */}
                        {fieldRestrictions.length > 0 && (
                          <div className="mb-6">
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-500" />
                              Field Restrictions ({fieldRestrictions.length})
                            </h5>
                            <div className="space-y-3">
                              {fieldRestrictions.map((restriction) => (
                                <div
                                  key={restriction.ID}
                                  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Lock className="h-4 w-4 text-blue-500" />
                                        <span className="font-medium text-gray-900">
                                          {restriction.Field}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                                          Field
                                        </span>
                                      </div>
                                      {restriction.Reason && (
                                        <p className="text-sm text-gray-600 mb-2">
                                          <span className="font-medium">
                                            Reason:
                                          </span>{' '}
                                          {restriction.Reason}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        Created on{' '}
                                        {formatDate(restriction.CreatedDate)} by{' '}
                                        {restriction.CreatedBy}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        onRemoveRestriction(restriction.ID)
                                      }
                                      disabled={
                                        processingRestriction === restriction.ID
                                      }
                                      className="ml-4 flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                                    >
                                      {processingRestriction ===
                                      restriction.ID ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Unlock size={14} />
                                      )}
                                      {processingRestriction === restriction.ID
                                        ? 'Removing...'
                                        : 'Remove'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Area Restrictions Section */}
                        {areaRestrictions.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Square className="h-4 w-4 text-orange-500" />
                              Custom Area Restrictions (
                              {areaRestrictions.length})
                            </h5>
                            <div className="space-y-3">
                              {areaRestrictions.map((restriction) => (
                                <div
                                  key={restriction.ID}
                                  className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Square className="h-4 w-4 text-orange-500" />
                                        <span className="font-medium text-gray-900">
                                          {restriction.Field}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded">
                                          Custom Area
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 mb-2">
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                          <MapPin className="h-3 w-3" />
                                          <span className="font-medium">
                                            Position:
                                          </span>
                                          <span className="font-mono text-xs">
                                            ({restriction.xaxis},{' '}
                                            {restriction.yaxis})
                                          </span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Size:
                                          </span>
                                          <span className="font-mono text-xs ml-1">
                                            {restriction.width} ×{' '}
                                            {restriction.height}px
                                          </span>
                                        </div>
                                      </div>
                                      {restriction.Reason && (
                                        <p className="text-sm text-gray-600 mb-2">
                                          <span className="font-medium">
                                            Reason:
                                          </span>{' '}
                                          {restriction.Reason}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        Created on{' '}
                                        {formatDate(restriction.CreatedDate)} by{' '}
                                        {restriction.CreatedBy}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        onRemoveRestriction(restriction.ID)
                                      }
                                      disabled={
                                        processingRestriction === restriction.ID
                                      }
                                      className="ml-4 flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                                    >
                                      {processingRestriction ===
                                      restriction.ID ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Unlock size={14} />
                                      )}
                                      {processingRestriction === restriction.ID
                                        ? 'Removing...'
                                        : 'Remove'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RestrictionList;
