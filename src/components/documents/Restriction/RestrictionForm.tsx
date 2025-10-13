// import React from 'react';
// import { Plus, Loader2, Lock } from 'lucide-react';
// import { RestrictionFormData } from '@/types/Restriction';
// import { CurrentDocument } from '@/types/Document';

// interface RestrictionFormProps {
//   formData: RestrictionFormData;
//   onFormChange: (data: Partial<RestrictionFormData>) => void;
//   onSubmit: () => void;
//   isSubmitting: boolean;
//   document: CurrentDocument | null;
// }

// const RestrictionForm: React.FC<RestrictionFormProps> = ({
//   formData,
//   onFormChange,
//   onSubmit,
//   isSubmitting,
//   document,
// }) => {
//   const availableFields =
//     document?.OCRDocumentReadFields?.map((field) => field.Field) || [];

//   return (
//     <div className="px-6 py-4 border-b border-gray-200">
//       <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
//         <Plus className="h-5 w-5 text-blue-500" />
//         Add New Restriction
//       </h3>

//       <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
//           {/* Field Selection */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Field Name *
//             </label>
//             <select
//               value={formData.field}
//               onChange={(e) => onFormChange({ field: e.target.value })}
//               className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
//               disabled={isSubmitting}
//             >
//               <option value="">Select a field</option>
//               {availableFields.map((field) => (
//                 <option key={field} value={field}>
//                   {field}
//                 </option>
//               ))}
//               <option value="open">Open Area (Custom)</option>
//             </select>
//           </div>

//           {/* Collaborator Selection */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Collaborator *
//             </label>
//             <select
//               value={formData.userId || ''}
//               onChange={(e) =>
//                 onFormChange({ userId: Number(e.target.value) || null })
//               }
//               className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
//               disabled={isSubmitting}
//             >
//               <option value="">Select a collaborator</option>
//               {document?.collaborations?.map((collab) => (
//                 <option key={collab.ID} value={collab.CollaboratorID}>
//                   {collab.CollaboratorName}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* Restriction Type */}
//         <div className="mb-4">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Restriction Type
//           </label>
//           <div className="flex gap-4">
//             <label className="flex items-center">
//               <input
//                 type="radio"
//                 value="field"
//                 checked={formData.restrictedType === 'field'}
//                 onChange={(e) =>
//                   onFormChange({
//                     restrictedType: e.target.value as 'field' | 'open',
//                   })
//                 }
//                 className="mr-2"
//                 disabled={isSubmitting}
//               />
//               Field Restriction
//             </label>
//             <label className="flex items-center">
//               <input
//                 type="radio"
//                 value="open"
//                 checked={formData.restrictedType === 'open'}
//                 onChange={(e) =>
//                   onFormChange({
//                     restrictedType: e.target.value as 'field' | 'open',
//                   })
//                 }
//                 className="mr-2"
//                 disabled={isSubmitting}
//               />
//               Open Area Restriction
//             </label>
//           </div>
//         </div>

//         {/* Coordinates Input */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               X-axis
//             </label>
//             <input
//               type="number"
//               value={formData.coordinates.xaxis}
//               onChange={(e) =>
//                 onFormChange({
//                   coordinates: {
//                     ...formData.coordinates,
//                     xaxis: Number(e.target.value),
//                   },
//                 })
//               }
//               className="w-full border border-gray-300 rounded-lg p-2 text-sm"
//               disabled={isSubmitting}
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Y-axis
//             </label>
//             <input
//               type="number"
//               value={formData.coordinates.yaxis}
//               onChange={(e) =>
//                 onFormChange({
//                   coordinates: {
//                     ...formData.coordinates,
//                     yaxis: Number(e.target.value),
//                   },
//                 })
//               }
//               className="w-full border border-gray-300 rounded-lg p-2 text-sm"
//               disabled={isSubmitting}
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Width
//             </label>
//             <input
//               type="number"
//               value={formData.coordinates.width}
//               onChange={(e) =>
//                 onFormChange({
//                   coordinates: {
//                     ...formData.coordinates,
//                     width: Number(e.target.value),
//                   },
//                 })
//               }
//               className="w-full border border-gray-300 rounded-lg p-2 text-sm"
//               disabled={isSubmitting}
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Height
//             </label>
//             <input
//               type="number"
//               value={formData.coordinates.height}
//               onChange={(e) =>
//                 onFormChange({
//                   coordinates: {
//                     ...formData.coordinates,
//                     height: Number(e.target.value),
//                   },
//                 })
//               }
//               className="w-full border border-gray-300 rounded-lg p-2 text-sm"
//               disabled={isSubmitting}
//             />
//           </div>
//         </div>

//         {/* Reason Input */}
//         <div className="mb-4">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Reason for Restriction *
//           </label>
//           <textarea
//             className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
//             rows={3}
//             placeholder="Explain why this restriction is needed..."
//             value={formData.reason}
//             onChange={(e) => onFormChange({ reason: e.target.value })}
//             disabled={isSubmitting}
//           />
//         </div>

//         {/* Submit Button */}
//         <button
//           onClick={onSubmit}
//           disabled={
//             !formData.field ||
//             !formData.userId ||
//             !formData.reason.trim() ||
//             isSubmitting
//           }
//           className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
//         >
//           {isSubmitting ? (
//             <Loader2 size={16} className="animate-spin" />
//           ) : (
//             <Lock size={16} />
//           )}
//           {isSubmitting ? 'Adding Restriction...' : 'Add Restriction'}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default RestrictionForm;
import React from 'react';
import { Plus, Loader2, Lock, MapPin, Eye, Target } from 'lucide-react';
import { RestrictionFormData } from '@/types/Restriction';
import { CurrentDocument } from '@/types/Document';

interface RestrictionFormProps {
  formData: RestrictionFormData;
  onFormChange: (data: Partial<RestrictionFormData>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  document: CurrentDocument | null;
  selectedArea: { x: number; y: number; width: number; height: number } | null;
  onClearSelection: () => void;
}

const RestrictionForm: React.FC<RestrictionFormProps> = ({
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
  document,
  selectedArea,
  onClearSelection,
}) => {
  const availableFields =
    document?.OCRDocumentReadFields?.map((field) => field.Field) || [];

  const isCustomArea = formData.field === 'custom_area';
  const canSubmit =
    formData.field &&
    formData.userId &&
    formData.reason.trim() &&
    (!isCustomArea || selectedArea);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-500" />
          Add New Restriction
        </h3>
        <p className="text-sm text-gray-600">
          Choose between field-specific restrictions or custom document areas
        </p>
      </div>

      <div className="space-y-6">
        {/* Restriction Type Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Restriction Type *
            </label>
            <div className="space-y-3">
              {/* Field Restriction Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  formData.field && formData.field !== 'custom_area'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onFormChange({ field: '' })}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 rounded-full p-2">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Field Restriction
                    </h4>
                    <p className="text-sm text-gray-500">
                      Restrict specific OCR-detected fields
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Area Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  formData.field === 'custom_area'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onFormChange({ field: 'custom_area' })}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 rounded-full p-2">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Custom Area</h4>
                    <p className="text-sm text-gray-500">
                      Draw custom areas on the document
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collaborator Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Collaborator *
            </label>
            <select
              value={formData.userId || ''}
              onChange={(e) =>
                onFormChange({ userId: Number(e.target.value) || null })
              }
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              disabled={isSubmitting}
            >
              <option value="">Choose a collaborator to restrict</option>
              {document?.collaborations?.map((collab) => (
                <option key={collab.ID} value={collab.CollaboratorID}>
                  {collab.CollaboratorName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Field Selection - Only show if field restriction is selected */}
        {formData.field && formData.field !== 'custom_area' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-800 mb-3">
              Select Document Field *
            </label>
            <select
              value={formData.field}
              onChange={(e) => onFormChange({ field: e.target.value })}
              className="w-full border border-blue-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              disabled={isSubmitting}
            >
              <option value="">Choose a field to restrict</option>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Area Instructions */}
        {formData.field === 'custom_area' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-orange-500 rounded-full p-1">
                <Eye className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-orange-800 mb-2">
                  Custom Area Selection
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  The document preview will appear below. Click and drag to
                  select the area you want to restrict.
                </p>
                {selectedArea && (
                  <div className="bg-orange-100 rounded-lg p-3 border border-orange-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-800 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Selected Area
                      </span>
                      <button
                        onClick={onClearSelection}
                        className="text-xs text-orange-600 hover:text-orange-800 underline"
                      >
                        Clear Selection
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-orange-600">Position:</span>
                        <div className="font-mono">
                          ({selectedArea.x}, {selectedArea.y})
                        </div>
                      </div>
                      <div>
                        <span className="text-orange-600">Size:</span>
                        <div className="font-mono">
                          {selectedArea.width} × {selectedArea.height}px
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reason Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Reason for Restriction *
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            rows={4}
            placeholder={`Explain why this ${
              isCustomArea ? 'area' : 'field'
            } should be restricted...`}
            value={formData.reason}
            onChange={(e) => onFormChange({ reason: e.target.value })}
            disabled={isSubmitting}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Provide a clear justification for this restriction</span>
            <span>{formData.reason.length}/500</span>
          </div>
        </div>

        {/* Validation Messages */}
        {formData.field === 'custom_area' && !selectedArea && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-400 rounded-full p-1">
                <Eye className="h-3 w-3 text-white" />
              </div>
              <p className="text-sm text-yellow-800">
                Please select an area on the document preview to proceed.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
              canSubmit && !isSubmitting
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Lock size={16} />
            )}
            {isSubmitting
              ? 'Adding Restriction...'
              : `Add ${isCustomArea ? 'Area' : 'Field'} Restriction`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestrictionForm;
