import React, { useState, useEffect, useMemo } from 'react';
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
  Info,
  FileCheck,
  Sparkles,
  Target,
  Clock,
  FileX,
  Zap,
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
  const [processingStage, setProcessingStage] = useState<string>('');
  const usedFieldIds = usedSelections.map((entry) => entry.fieldId);

  // Calculate statistics
  const stats = useMemo(() => {
    const textFields = fields.filter((f) => f.Type !== 'date' && f.Type !== 'Date');
    const availableFields = textFields.filter((field) => !usedFieldIds.includes(field.ID));
    const wordCount = ocrText ? ocrText.trim().split(/\s+/).filter(Boolean).length : 0;
    const charCount = ocrText ? ocrText.length : 0;
    const lineCount = ocrText ? ocrText.split('\n').filter(Boolean).length : 0;

    return {
      totalFields: textFields.length,
      availableFields: availableFields.length,
      usedFields: usedSelections.length,
      wordCount,
      charCount,
      lineCount,
    };
  }, [fields, usedFieldIds, usedSelections.length, ocrText]);

  // Reset state when modal closes or set preselected field when opens
  useEffect(() => {
    if (!isOpen) {
      setOcrText('');
      setSelectedText('');
      setSelectedFieldId(null);
      setHasRunOCR(false);
      setProgress(0);
      setProcessingStage('');
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
    setProcessingStage('Initializing OCR engine...');

    try {
      let currentProgress = 0;
      
      // Simulate stage updates
      const stageInterval = setInterval(() => {
        if (currentProgress < 30) {
          setProcessingStage('Loading document...');
        } else if (currentProgress < 60) {
          setProcessingStage('Analyzing document structure...');
        } else if (currentProgress < 90) {
          setProcessingStage('Extracting text...');
        } else {
          setProcessingStage('Finalizing results...');
        }
      }, 500);

      const result = await runOCR(file, (prog) => {
        currentProgress = Math.round(prog);
        setProgress(currentProgress);
      });

      clearInterval(stageInterval);
      setOcrText(result.text);
      setHasRunOCR(true);
      setProcessingStage('OCR completed successfully');
      toast.success('OCR completed successfully');
    } catch (error: any) {
      console.error('OCR error:', error);
      setProcessingStage('OCR processing failed');
      toast.error(error?.message || 'OCR processing failed');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setTimeout(() => setProcessingStage(''), 2000);
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

  const selectedField = fields.find((f) => f.ID === selectedFieldId);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-7xl h-[90vh] max-h-[95vh] flex flex-col overflow-hidden shadow-2xl rounded-2xl border border-gray-200/50 bg-white animate-[fadeIn_0.3s_ease-out]">
        {/* Enhanced Header */}
        <CardHeader className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white flex flex-row items-center justify-between py-6 px-6 sm:px-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <Scan className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold mb-1">
                OCR Text Extraction
              </CardTitle>
              <p className="text-sm sm:text-base text-blue-100/90 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Intelligent document text recognition and field mapping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gradient-to-br from-gray-50 to-blue-50/30">
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-medium text-gray-600">Available Fields</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.availableFields}</p>
                <p className="text-xs text-gray-500 mt-1">of {stats.totalFields} total</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600">Used Fields</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.usedFields}</p>
                <p className="text-xs text-gray-500 mt-1">already applied</p>
              </div>
              {ocrText && (
                <>
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-600">Words</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.wordCount}</p>
                    <p className="text-xs text-gray-500 mt-1">extracted</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-gray-600">Characters</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.charCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">in {stats.lineCount} lines</p>
                  </div>
                </>
              )}
            </div>

            {/* File Information Card */}
            {file && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-gray-900 truncate">{file.name}</h3>
                      {hasRunOCR && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Processed
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <FileX className="w-4 h-4" />
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Info className="w-4 h-4" />
                        <span className="capitalize">{file.type.split('/')[1] || file.type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Uploaded {new Date(file.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Field Selection Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Target Field Selection
                  <span className="text-red-500">*</span>
                </label>
                {selectedField && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                    {selectedField.Field || selectedField.Description}
                  </span>
                )}
              </div>
              <Select
                placeholder="Select a field to populate with OCR text..."
                value={selectedFieldId?.toString() || ''}
                onChange={(e) => setSelectedFieldId(Number(e.target.value))}
                options={fieldOptions}
                disabled={isProcessing || fieldOptions.length === 0}
              />
              <div className="mt-4 space-y-2">
                {fieldOptions.length === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">No Available Fields</p>
                      <p className="text-xs text-amber-700 mt-1">
                        No text fields are available for this document type, or all fields have already been populated.
                      </p>
                    </div>
                  </div>
                )}
                {usedSelections.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Protected Fields</p>
                      <p className="text-xs text-blue-700 mt-1">
                        {usedSelections.length} field{usedSelections.length !== 1 ? 's' : ''} already have OCR text applied and cannot be modified.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OCR Processing Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    OCR Processing
                  </h3>
                  <p className="text-sm text-gray-600">
                    Extract text from your document using advanced OCR technology
                  </p>
                </div>
                <Button
                  onClick={handleRunOCR}
                  disabled={!file || isProcessing}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                    isProcessing
                      ? 'opacity-60 cursor-not-allowed bg-gray-400 text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Scan className="w-5 h-5" />
                      <span>Run OCR Extraction</span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Enhanced Progress Bar */}
              {isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{processingStage}</span>
                    <span className="font-bold text-indigo-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300 shadow-lg relative overflow-hidden"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* OCR Results Section */}
            {ocrText && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Extracted Text Results
                      {hasRunOCR && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      )}
                    </label>
                    <p className="text-sm text-gray-600">
                      Select text to apply, or use all extracted content
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCopyAll}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium hover:shadow-md"
                      title="Copy all text to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                      Copy All
                    </button>
                    <button
                      onClick={handleUseAllText}
                      className="px-4 py-2 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-all duration-200 font-medium hover:shadow-md"
                    >
                      Use All Text
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={ocrText}
                    className="w-full h-72 sm:h-80 p-5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm bg-gray-50 shadow-inner leading-relaxed"
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
                  <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 text-xs text-gray-600 font-medium shadow-sm">
                    {stats.wordCount} words • {stats.charCount} chars
                  </div>
                </div>

                {/* Selected Text Preview */}
                {selectedText && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl shadow-sm">
                    <p className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Selected Text Preview:
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed bg-white/50 p-3 rounded-lg border border-indigo-100">
                      {selectedText}
                    </p>
                    <p className="text-xs text-indigo-700 mt-2">
                      {selectedText.split(/\s+/).filter(Boolean).length} words selected
                    </p>
                  </div>
                )}

                {/* Already Applied Fields */}
                {usedSelections.length > 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-gray-600" />
                      Previously Applied Fields ({usedSelections.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {usedSelections.map((entry) => {
                        const field = fields.find((f) => f.ID === entry.fieldId);
                        return (
                          <div
                            key={entry.fieldId}
                            className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-semibold text-gray-900 text-sm">
                                {field?.Field || `Field ${entry.fieldId}`}
                              </span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                Applied
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                              {entry.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Helpful Instructions */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-900 flex items-start gap-3 leading-relaxed">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">How to use:</strong> Highlight any portion of the extracted text above to select it, 
                      or click "Use All Text" to apply the entire content. Once you've selected your target field and text, 
                      click "Apply to Field" to populate the field with the selected OCR text.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {ocrText && selectedFieldId && (
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t-2 border-gray-200">
                <Button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-all duration-200 hover:shadow-md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyToField}
                  disabled={!selectedFieldId || (!selectedText && !ocrText)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                    !selectedFieldId || (!selectedText && !ocrText)
                      ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Apply to Field</span>
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

