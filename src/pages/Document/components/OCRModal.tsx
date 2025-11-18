import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@chakra-ui/react';
import { Select } from '@/components/ui/Select';
import {
  X,
  Scan,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { runOCR } from '../utils/ocrService';
import { FieldAllocation } from '../utils/fieldAllocationService';
import toast from 'react-hot-toast';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fields: FieldAllocation[]; // Text fields only
  onApplyToField: (fieldId: number, text: string) => void;
  preselectedFieldId?: number | null; // Optional: pre-select a field when opening
  usedSelections?: { fieldId: number; text: string }[];
}

export const OCRModal: React.FC<OCRModalProps> = ({
  isOpen,
  onClose,
  file,
  fields,
  onApplyToField,
  preselectedFieldId = null,
  usedSelections = [],
}) => {
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasRunOCR, setHasRunOCR] = useState(false);
  const usedFieldIds = usedSelections.map((entry) => entry.fieldId);

  // Reset state when modal closes or set preselected field when opens
  useEffect(() => {
    if (!isOpen) {
      setOcrText('');
      setSelectedText('');
      setSelectedFieldId(null);
      setHasRunOCR(false);
      setProgress(0);
    } else if (preselectedFieldId && !usedFieldIds.includes(preselectedFieldId)) {
      // Pre-select field when modal opens with preselected field
      setSelectedFieldId(preselectedFieldId);
    } else if (preselectedFieldId && usedFieldIds.includes(preselectedFieldId)) {
      toast.error('This field already has OCR text applied');
    }
  }, [isOpen, preselectedFieldId, usedFieldIds]);

  useEffect(() => {
    if (selectedFieldId && usedFieldIds.includes(selectedFieldId)) {
      setSelectedFieldId(null);
    }
  }, [usedFieldIds, selectedFieldId]);

  // Get selected text from user selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      }
    };

    if (isOpen && ocrText) {
      document.addEventListener('selectionchange', handleSelection);
      return () => {
        document.removeEventListener('selectionchange', handleSelection);
      };
    }
  }, [isOpen, ocrText]);

  const handleRunOCR = async () => {
    if (!file) {
      toast.error('No file selected');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setOcrText('');
    setHasRunOCR(false);

    try {
      const result = await runOCR(file, (prog) => {
        setProgress(Math.round(prog));
      });

      setOcrText(result.text);
      setHasRunOCR(true);
      toast.success('OCR completed successfully');
    } catch (error: any) {
      console.error('OCR error:', error);
      toast.error(error?.message || 'OCR processing failed');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleApplyToField = () => {
    if (!selectedFieldId) {
      toast.error('Please select a field first');
      return;
    }

    const textToApply = selectedText || ocrText;

    if (!textToApply.trim()) {
      toast.error('Please select text from OCR results or use all text');
      return;
    }

    onApplyToField(selectedFieldId, textToApply.trim());
    toast.success('Text applied to field successfully');
  };

  const handleCopyAll = () => {
    if (ocrText) {
      navigator.clipboard.writeText(ocrText);
      toast.success('Text copied to clipboard');
    }
  };

  const handleUseAllText = () => {
    setSelectedText(ocrText);
    toast.success('All text selected. Click "Apply to Field" to use it.');
  };

  if (!isOpen) return null;

  // Filter to text fields only (exclude date fields) and remove already used fields
  const textFields = fields.filter((f) => f.Type !== 'date' && f.Type !== 'Date');
  const availableFields = textFields.filter((field) => !usedFieldIds.includes(field.ID));

  const fieldOptions = availableFields.map((field) => ({
    value: field.ID.toString(),
    label: field.Field || field.Description || `Field ${field.ID}`,
  }));

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
      <Card className="w-[94vw] max-w-6xl min-h-[80vh] max-h-[95vh] flex flex-col overflow-hidden shadow-2xl rounded-3xl border border-white/10 animate-slide-up">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-row items-center justify-between py-5 px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">OCR Text Extraction</CardTitle>
              <p className="text-xs sm:text-base text-blue-100 mt-1">
                Extract text from document and apply to fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </CardHeader>

        <CardContent className="p-4 sm:p-8 overflow-y-auto flex-1 w-full">
          <div className="space-y-6">
          {/* File Info */}
            {file && (
              <div className="flex items-center gap-3 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-inner">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                  </p>
                </div>
              </div>
            )}

            {/* Field Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="w-4 h-4 text-blue-600" />
                Select Field to Populate <span className="text-red-500">*</span>
              </label>
              <Select
                placeholder="Choose a field..."
                value={selectedFieldId?.toString() || ''}
                onChange={(e) => setSelectedFieldId(Number(e.target.value))}
                options={fieldOptions}
                disabled={isProcessing || fieldOptions.length === 0}
              />
              {fieldOptions.length === 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  No text fields available for this document type
                </p>
              )}
              {usedSelections.length > 0 && (
                <p className="text-xs text-blue-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Fields already applied via OCR can no longer be selected.
                </p>
              )}
            </div>

            {/* OCR Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                onClick={handleRunOCR}
                disabled={!file || isProcessing}
                className={`w-full sm:w-auto px-5 py-3 rounded-lg font-semibold transition-all ${
                  isProcessing
                    ? 'opacity-60 cursor-not-allowed bg-gray-400'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing OCR... {progress > 0 && `${progress}%`}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Scan className="w-5 h-5 mr-2" />
                    Run OCR
                  </div>
                )}
              </Button>

              {/* Progress Bar */}
              {isProcessing && progress > 0 && (
                <div className="w-full sm:flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 shadow-inner"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* OCR Results */}
            {ocrText && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Extracted Text
                    {hasRunOCR && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCopyAll}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
                      title="Copy all text"
                    >
                      <Copy className="w-4 h-4" />
                      Copy All
                    </button>
                    <button
                      onClick={handleUseAllText}
                      className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                    >
                      Use All Text
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={ocrText}
                    className="w-full h-56 sm:h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-xs sm:text-sm bg-gray-50 shadow-inner"
                    placeholder="Extracted text will appear here..."
                    onSelect={(e) => {
                      const selection = e.currentTarget.value.substring(
                        e.currentTarget.selectionStart,
                        e.currentTarget.selectionEnd
                      );
                      if (selection.trim()) {
                        setSelectedText(selection.trim());
                      }
                    }}
                  />
                </div>

                {/* Selected Text Preview */}
                {selectedText && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      Selected Text:
                    </p>
                    <p className="text-sm text-gray-800">{selectedText}</p>
                  </div>
                )}

                {usedSelections.length > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Already Applied
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {usedSelections.map((entry) => {
                        const field = fields.find((f) => f.ID === entry.fieldId);
                        return (
                          <div
                            key={entry.fieldId}
                            className="p-2 bg-white rounded-lg border border-gray-200 text-xs text-gray-700"
                          >
                            <span className="font-semibold text-gray-900">
                              {field?.Field || `Field ${entry.fieldId}`}:
                            </span>{' '}
                            <span className="line-clamp-2">{entry.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800 flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Tip:</strong> Highlight/select the text you want
                      to use, or click "Use All Text" to apply all extracted
                      text to the selected field.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Apply Button */}
            {ocrText && selectedFieldId && (
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyToField}
                  disabled={!selectedFieldId || (!selectedText && !ocrText)}
                  className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
                    !selectedFieldId || (!selectedText && !ocrText)
                      ? 'opacity-50 cursor-not-allowed bg-gray-400'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Apply to Field
                  </div>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

