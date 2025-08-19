import { Select } from '@/components/ui/Select';
import { Badge, Button } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { Rect } from './Unrecorded';
import toast from 'react-hot-toast';
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  updateTemplate,
} from './utils/template';
import { useOCRFields } from './Fields/useOCRFields';
import {
  convertBufferToFile,
  convertPdfToImage,
} from './utils/templateHelpers';
// import { Template } from "./utils/useTemplates";
import {
  ArrowLeft,
  Building,
  Calendar,
  Edit,
  Eye,
  FileText,
  FolderOpen,
  Image,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { DeleteDialog } from '@/components/ui/DeleteDialog';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
// import { PDFDocument } from 'pdf-lib';
type OCRUnrecordedFields = {
  id: number;
  fieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
interface Template {
  ID: number;
  name: string;
  departmentId: number;
  subDepartmentId: number;
  imageWidth: number;
  imageHeight: number;
  samplePdfPath: string;
  header: string;
  createdAt: string;
  updatedAt: string;
  Department: { ID: number; Name: string };
  SubDepartment: { ID: number; Name: string };
  fields: OCRUnrecordedFields[];
}
export const TemplateOCR = () => {
  // View state management
  const [currentView, setCurrentView] = useState<
    'list' | 'create' | 'edit' | 'view'
  >('list');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [headerName, setHeaderName] = useState('');
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [selectionArea, setSelectionArea] = useState<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [imageDisplayDimensions, setImageDisplayDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [selectedField, setSelectedField] = useState<{
    ID: number;
    Field: string;
  } | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [ocrFields, setOcrFields] = useState<OCRUnrecordedFields[]>([]);

  const [formData, setFormData] = useState({
    department: '',
    subdepartment: '',
    template: '',
    header: '',
    samplePdf: null as File | null,
    imageURL: '',
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { fields, loading: fieldsLoading, error: fieldsError } = useOCRFields();
  // Use the nested department hook
  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();
  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // Update sub-departments when department selection changes
  useEffect(() => {
    if (formData.department && departmentOptions.length > 0) {
      const selectedDeptId = departmentOptions.find(
        (dept) => dept.value === formData.department
      )?.value;

      if (selectedDeptId) {
        const subs = getSubDepartmentOptions(Number(selectedDeptId));
        setSubDepartmentOptions(subs);
        // Only reset if the current subDept doesn't exist in new options
        if (!subs.some((sub) => sub.label === formData.subdepartment)) {
          setFormData((prev) => ({ ...prev, subdepartment: '' }));
        }
      }
    } else {
      setSubDepartmentOptions([]);
      if (formData.subdepartment) {
        // Only reset if there's a value
        setFormData((prev) => ({ ...prev, subdepartment: '' }));
      }
    }
  }, [formData.department, departmentOptions]);
  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);
  const templatePermissions = useModulePermissions(10); // 1 = MODULE_ID
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templatesData = await fetchTemplates();
      // console.log(templatesData);
      if (templatesData.length > 0) {
        setTemplates(templatesData);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      department: '',
      subdepartment: '',
      template: '',
      header: '',
      samplePdf: null,
      imageURL: '',
    });
    setTemplateName('');
    setHeaderName('');
    setSelectedPDF(null);
    setPdfImage(null);
    setSelectionArea(null);
    setOcrFields([]);
    setSelectedField(null);
    setImageNaturalDimensions({ width: 0, height: 0 });
    setImageDisplayDimensions({ width: 0, height: 0 });
  };

  const handleImageLoad = () => {
    console.log('Image loaded', imgRef.current);
    if (imgRef.current) {
      const img = imgRef.current;
      setImageNaturalDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setImageDisplayDimensions({
        width: img.clientWidth,
        height: img.clientHeight,
      });
    }
  };

  const convertDisplayToNaturalCoordinates = (displayCoords: Rect): Rect => {
    const scaleX = imageNaturalDimensions.width / imageDisplayDimensions.width;
    const scaleY =
      imageNaturalDimensions.height / imageDisplayDimensions.height;

    return {
      x: Math.round(displayCoords.x * scaleX),
      y: Math.round(displayCoords.y * scaleY),
      width: Math.round(displayCoords.width * scaleX),
      height: Math.round(displayCoords.height * scaleY),
    };
  };

  const convertNaturalToDisplayCoordinates = (naturalCoords: Rect): Rect => {
    const scaleX = imageDisplayDimensions.width / imageNaturalDimensions.width;
    const scaleY =
      imageDisplayDimensions.height / imageNaturalDimensions.height;

    return {
      x: naturalCoords.x * scaleX,
      y: naturalCoords.y * scaleY,
      width: naturalCoords.width * scaleX,
      height: naturalCoords.height * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || currentView === 'view') return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPoint({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !startPoint || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionArea({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  // Add these new handlers alongside your existing mouse handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!imgRef.current || currentView === 'view') return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = imgRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setStartPoint({ x, y });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !startPoint || !imgRef.current) return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = imgRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setSelectionArea({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSaveField = () => {
    if (!selectionArea || !selectedField) {
      toast.error('Please select a field and draw an area.');
      setSelectionArea(null);
      return;
    }

    if (ocrFields.some((f) => f.fieldName === selectedField.Field)) {
      toast.error('Field already exists.');
      setSelectionArea(null);
      return;
    }

    // Convert display coordinates to natural image coordinates
    const naturalCoords = convertDisplayToNaturalCoordinates(selectionArea);

    const newField = {
      id: selectedField.ID,
      fieldName: selectedField.Field,
      x: naturalCoords.x,
      y: naturalCoords.y,
      width: naturalCoords.width,
      height: naturalCoords.height,
    };

    setOcrFields((prev) => [...prev, newField]);
    setSelectionArea(null);
    toast.success('Field saved!');
  };

  const handleDeleteField = (fieldId: number) => {
    if (!ocrFields.some((field) => field.id === fieldId)) {
      toast.error('Field not found.');
      return;
    }
    setOcrFields((prev) => prev.filter((field) => field.id !== fieldId));
    setSelectionArea(null);
    setSelectedField(null);
    toast.success('Field deleted!');
  };

  const handleSaveTemplate = async () => {
    if (!imageNaturalDimensions.width || !imageNaturalDimensions.height) {
      toast.error('Image dimensions not available');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('departmentId', String(formData.department));
    formDataToSend.append('subDepartmentId', String(formData.subdepartment));
    formDataToSend.append('imageWidth', String(imageNaturalDimensions.width));
    formDataToSend.append('imageHeight', String(imageNaturalDimensions.height));
    formDataToSend.append('header', formData.header || '');
    formDataToSend.append('name', formData.template || '');
    formDataToSend.append('fields', JSON.stringify(ocrFields));

    // File handling logic
    if (currentView === 'edit') {
      // Case 1: New file was selected
      if (selectedPDF) {
        formDataToSend.append('samplePdf', selectedPDF);
      }
      // Case 2: No new file selected, but we have existing template
      else if (selectedTemplate) {
        // Fetch the original file if needed
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/static/public/templates/${
            selectedTemplate.samplePdfPath
          }`
        );
        const blob = await response.blob();
        const file = new File(
          [blob],
          selectedTemplate.samplePdfPath.split('/').pop() || 'template.pdf',
          {
            type: blob.type,
          }
        );
        formDataToSend.append('samplePdf', file);
      } else {
        toast.error('File is missing or invalid.');
        return;
      }
    }
    // Create new template case
    else {
      if (!selectedPDF) {
        toast.error('File is required');
        return;
      }
      formDataToSend.append('samplePdf', selectedPDF);
    }

    try {
      if (currentView === 'edit' && selectedTemplate) {
        await updateTemplate(selectedTemplate.ID, formDataToSend);
        toast.success('Template updated successfully!');
      } else {
        await createTemplate(formDataToSend);
        toast.success('Template created successfully!');
      }

      resetForm();
      setCurrentView('list');
      loadTemplates();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save template');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
      toast.error('Only PDF or Image files are allowed.');
      return;
    }

    setFormData((prev) => ({ ...prev, samplePdf: file }));
    setSelectedPDF(file);

    if (isPDF) {
      const buffer = await file.arrayBuffer();
      const imageFromPDF = await convertPdfToImage(buffer);
      setPdfImage(imageFromPDF);
    } else if (isImage) {
      const imageURL = URL.createObjectURL(file);
      setPdfImage(imageURL);
    }
  };

  const loadTemplateFile = async (template: Template) => {
    const fileUrl = `${
      import.meta.env.VITE_API_BASE_URL
    }/static/public/templates/${template.samplePdfPath}`;
    console.log({ template, fileUrl });
    try {
      // Check file extension
      const isPDF = template.samplePdfPath?.toLowerCase().endsWith('.pdf');

      if (isPDF) {
        // Handle PDF conversion
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();
        return await convertPdfToImage(buffer);
      } else {
        // Handle direct image display
        return fileUrl;
      }
    } catch (error) {
      console.error('Failed to load template file:', error);
      throw error;
    }
  };

  const handleEditTemplate = async (template: Template) => {
    console.log({ template });
    try {
      const previewImage = await loadTemplateFile(template);

      setSelectedTemplate(template);
      // TODO CHANGE SUBDEPARTMENT ID
      setFormData({
        department: String(template.departmentId),
        subdepartment: String(template.subDepartmentId),
        template: template.name,
        header: template.header,
        samplePdf: null,
        imageURL: previewImage,
      });

      setPdfImage(previewImage);
      setTemplateName(template.name);
      setHeaderName(template.header);
      setOcrFields(template.fields);
      setCurrentView('edit');
    } catch (error) {
      toast.error('Failed to load template');
    }
  };

  const handleViewTemplate = async (template: Template) => {
    try {
      const previewImage = await loadTemplateFile(template);

      setSelectedTemplate(template);
      setFormData({
        department: String(template.departmentId),
        subdepartment: String(template.subDepartmentId),
        template: template.name,
        header: template.header,
        samplePdf: null,
        imageURL: previewImage,
      });

      setPdfImage(previewImage);
      setOcrFields(template.fields);
      setCurrentView('view');
    } catch (error) {
      toast.error('Failed to load template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await deleteTemplate(templateId);
      toast.success('Template deleted successfully!');
      loadTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileExtension = (filePath: string) => {
    return filePath?.split('.').pop()?.toLowerCase() || '';
  };

  const isImageFile = (filePath: string) => {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'];
    return imageExtensions.includes(getFileExtension(filePath));
  };
  const renderTemplatesList = () => (
    <div className="bg-white rounded-lg shadow-md p-2 sm:p-6">
      <div className="flex justify-between sm:items-center max-sm:flex-col  mb-6 flex-wrap gap-4">
        <header className="text-left flex-1 ">
          <h1 className="text-3xl font-bold text-blue-800">Templates</h1>
          <p className="mt-2 text-gray-600 block">Manage all templates here</p>
        </header>
        {templatePermissions?.Add && (
          <Button
            onClick={() => setCurrentView('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded text-sm"
          >
            <Plus size={16} />
            Create Template
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg text-gray-600">
            Loading templates...
          </span>
        </div>
      ) : (
        <div className="grid gap-4 lg:gap-6">
          {templates.map((template) => (
            <Card
              key={template.ID}
              className="group hover:shadow-xl transition-all duration-300 border border-gray-200 shadow-sm hover:-translate-y-1 bg-white"
            >
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isImageFile(template.samplePdfPath) ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Image className="mr-1 w-4" />
                            Image
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <FileText className="mr-1 w-4" />
                            PDF
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {template.header}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      onClick={() => handleViewTemplate(template)}
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Eye size={16} />
                    </Button>
                    {templatePermissions?.Edit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="h-9 w-9 p-0 hover:bg-green-50 hover:text-green-600 transition-colors"
                      >
                        <Edit size={16} />
                      </Button>
                    )}
                    {templatePermissions?.Delete && (
                      <DeleteDialog
                        onConfirm={() => handleDeleteTemplate(template.ID)}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </DeleteDialog>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="pt-0">
                {/* Template Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building size={14} className="text-gray-400" />
                    <span className="font-medium">Department:</span>
                    <span className="truncate">
                      {template.Department?.Name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={14} className="text-gray-400" />
                    <span className="font-medium">Sub-Dept:</span>
                    <span className="truncate">
                      {template.SubDepartment?.Name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FolderOpen size={14} className="text-gray-400" />
                    <span className="font-medium">Fields:</span>
                    <span>{template.fields.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="font-medium">Created:</span>
                    <span>{formatDate(template.createdAt)}</span>
                  </div>
                </div>

                {/* Template Dimensions */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Image className="text-gray-400" />
                    <span className="font-medium">Dimensions:</span>
                    <span>
                      {template.imageWidth} × {template.imageHeight}px
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText size={14} className="text-gray-400" />
                    <span className="font-medium">Sample:</span>
                    <span className="truncate">{template.samplePdfPath}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="font-medium">Updated:</span>
                    <span>{formatDate(template.updatedAt)}</span>
                  </div>
                </div>

                {/* Fields Preview */}
                <div className="flex flex-wrap gap-2">
                  {template.fields.slice(0, 4).map((field) => (
                    <Badge
                      key={field.id}
                      variant="outline"
                      className="text-xs bg-gray-50 text-gray-700 border-gray-200"
                    >
                      {field.fieldName}
                    </Badge>
                  ))}
                  {template.fields.length > 4 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      +{template.fields.length - 4} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
  console.log(formData);
  const renderTemplateForm = () => (
    <div className="flex flex-col bg-white rounded-md shadow-lg">
      {/* Header */}
      <header className="text-left flex-1 py-4 px-3 sm:px-6 border-b">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              resetForm();
              setCurrentView('list');
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-blue-800">
              {currentView === 'create'
                ? 'Create Template'
                : currentView === 'edit'
                ? 'Edit Template'
                : 'View Template'}
            </h1>
            <p className="mt-2 text-gray-600">
              {currentView === 'view'
                ? 'Template details'
                : 'Manage template documents here'}
            </p>
          </div>
        </div>
      </header>

      {/* Top Row - Department, Sub-Department, Load Button */}
      <div className="flex flex-col gap-2 sm:flex-row p-2 sm:p-4">
        <div className="flex-1">
          <Select
            label="Department"
            value={formData.department}
            onChange={(e: any) =>
              setFormData({ ...formData, department: e.target.value })
            }
            placeholder="Select a Department"
            options={departmentOptions}
            disabled={currentView === 'view' || loadingDepartments}
          />
        </div>
        <div className="flex-1">
          <Select
            label="Sub-Department"
            value={formData.subdepartment}
            onChange={(e: any) =>
              setFormData({ ...formData, subdepartment: e.target.value })
            }
            placeholder={
              !formData.department
                ? 'Select a Department First'
                : subDepartmentOptions.length === 0
                ? 'No Sub-Departments Available'
                : 'Select a Sub-Department'
            }
            options={subDepartmentOptions}
            disabled={currentView === 'view' || !formData.department}
          />
        </div>
        {currentView !== 'view' && currentView !== 'edit' && (
          <div className="flex items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf, image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm cursor-pointer"
            >
              Upload File
            </Button>
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="flex gap-4 p-2 sm:p-4 w-full max-lg:flex-col">
        {/* Left Side */}
        <div className="w-full lg:w-1/2 p-2 sm:p-6 space-y-4 border-r bg-white">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Template Name
            </label>
            <input
              type="text"
              className="mt-1 border w-full px-2 py-1 rounded disabled:bg-slate-300 disabled:text-gray-500"
              placeholder="Template Name"
              disabled={
                Boolean(currentView === 'view') ||
                Boolean(templateName && currentView !== 'edit')
              }
              value={formData.template}
              onChange={(e) =>
                setFormData((pre) => ({ ...pre, template: e.target.value }))
              }
            />
            {currentView !== 'view' && (
              <div className="flex gap-2 my-3">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm flex-1"
                  onClick={() => {
                    if (!formData.template) {
                      toast.error('Please enter template name');
                      return;
                    }
                    setTemplateName(formData.template);
                    toast.success('Template Added successfully!');
                  }}
                  disabled={
                    Boolean(!formData.template) ||
                    Boolean(templateName && currentView !== 'edit')
                  }
                >
                  {currentView === 'edit' ? 'Update Template' : 'Add Template'}
                </Button>
              </div>
            )}
          </div>

          {/* Header */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Header
            </label>
            <input
              type="text"
              className="mt-1 border w-full px-2 py-1 rounded disabled:bg-slate-300 disabled:text-gray-500"
              placeholder="e.g., CERTIFICATE OF LIVE BIRTH"
              disabled={
                Boolean(currentView === 'view') ||
                Boolean(headerName && currentView !== 'edit')
              }
              value={formData.header}
              onChange={(e) =>
                setFormData((pre) => ({ ...pre, header: e.target.value }))
              }
            />
            {currentView !== 'view' && (
              <div className="flex gap-2 my-3">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm mt-1 w-full"
                  onClick={() => {
                    if (!formData.header) {
                      toast.error('Please enter header name');
                      return;
                    }
                    setHeaderName(formData.header);
                    toast.success('Header Tag Added successfully!');
                  }}
                  disabled={
                    Boolean(!formData.header) ||
                    Boolean(headerName && currentView !== 'edit')
                  }
                >
                  {currentView === 'edit'
                    ? 'Update Header Tag'
                    : 'Save Header Tag'}
                </Button>
              </div>
            )}
          </div>

          {/* Field Dropdown + Save/Delete */}
          {currentView !== 'view' && (
            <div className="flex gap-2 w-full items-end max-sm:flex-col">
              <Select
                label="Fields"
                value={selectedField?.ID || ''}
                onChange={(e: any) => {
                  const selected = fields.find(
                    (f) => f.ID === parseInt(e.target.value)
                  );
                  setSelectedField(selected || null);
                }}
                placeholder="Select a Field"
                options={fields.map((field) => ({
                  value: field.ID.toString(),
                  label: field.Field,
                }))}
              />
              <div className="flex-1 flex gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm flex-initial px-4"
                  disabled={!selectionArea || !selectedField}
                  onClick={handleSaveField}
                >
                  Save Field
                </Button>

                <Button
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded text-sm flex-initial px-4"
                  disabled={!selectedField}
                  onClick={() => handleDeleteField(selectedField?.ID || 0)}
                >
                  Delete Field
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Image and Coordinates */}
        <div className="w-full lg:w-1/2 p-2 sm:p-4 bg-white space-y-6">
          {/* Coordinates Table */}
          <div className="overflow-auto max-h-40 border rounded">
            <table className="text-sm w-full table-auto border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Field Name</th>
                  <th className="border px-2 py-1">X</th>
                  <th className="border px-2 py-1">Y</th>
                  <th className="border px-2 py-1">Width</th>
                  <th className="border px-2 py-1">Height</th>
                </tr>
              </thead>
              <tbody>
                {ocrFields.map((field) => (
                  <tr key={field.id}>
                    <td className="border px-2 py-1">{field.fieldName}</td>
                    <td className="border px-2 py-1 text-center">{field.x}</td>
                    <td className="border px-2 py-1 text-center">{field.y}</td>
                    <td className="border px-2 py-1 text-center">
                      {field.width}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {field.height}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Image Dimensions Info */}
          {imageNaturalDimensions.width > 0 && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <p>
                Natural: {imageNaturalDimensions.width} ×{' '}
                {imageNaturalDimensions.height}
              </p>
              <p>
                Display: {Math.round(imageDisplayDimensions.width)} ×{' '}
                {Math.round(imageDisplayDimensions.height)}
              </p>
            </div>
          )}

          {/* Image Selection Panel */}
          <div
            className="w-full"
            style={{
              maxHeight: '60vh',
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              backgroundColor: '#f9fafb',
            }}
          >
            <div
              className="relative"
              style={{
                cursor: currentView === 'view' ? 'default' : 'crosshair',
                width: 'fit-content', // Changed from 100%
                minWidth: '100%',
                touchAction: 'none', // Prevent default touch behaviors
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Image */}
              {pdfImage || formData.imageURL ? (
                <img
                  ref={imgRef}
                  src={pdfImage || formData.imageURL}
                  style={{
                    display: 'block',
                    maxWidth: 'none', // Changed from max-w-full
                    height: 'auto',
                    minWidth: '100%',
                  }}
                  crossOrigin="anonymous"
                  alt="Template"
                  // className="block max-w-full h-auto"
                  draggable={false}
                  onError={(e) => console.error('Image error:', e)}
                  onLoad={handleImageLoad}
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-gray-500 bg-gray-50">
                  No File Selected
                </div>
              )}

              {/* Live dragging rectangle */}
              {selectionArea && isDragging && currentView !== 'view' && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-300 bg-opacity-30 pointer-events-none"
                  style={{
                    left: `${selectionArea.x}px`,
                    top: `${selectionArea.y}px`,
                    width: `${selectionArea.width}px`,
                    height: `${selectionArea.height}px`,
                  }}
                />
              )}

              {/* OCR saved boxes */}
              {ocrFields.map((field) => {
                const displayCoords =
                  imageNaturalDimensions.width > 0
                    ? convertNaturalToDisplayCoordinates(field)
                    : field;

                return (
                  <div
                    key={field.id}
                    className="absolute border-2 border-green-600 bg-green-200 bg-opacity-20"
                    style={{
                      left: `${displayCoords.x}px`,
                      top: `${displayCoords.y}px`,
                      width: `${displayCoords.width}px`,
                      height: `${displayCoords.height}px`,
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-green-600 text-white text-xs px-1 rounded">
                      {field.fieldName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm"
              onClick={() => {
                resetForm();
                setCurrentView('list');
              }}
            >
              {currentView === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {currentView !== 'view' && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                onClick={handleSaveTemplate}
                disabled={
                  !ocrFields.length ||
                  !templateName ||
                  !headerName ||
                  !formData.department ||
                  !formData.subdepartment
                }
              >
                {currentView === 'edit' ? 'Update Template' : 'Save Template'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  if (fieldsError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        Error: {fieldsError}
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] bg-gray-50">
      {currentView === 'list' ? renderTemplatesList() : renderTemplateForm()}
    </div>
  );
};
