import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Search,
  Shield,
  Users,
  Archive,
  Settings,
  BarChart3,
  Clock,
  Download,
  Share2,
  FolderOpen,
  X,
  Menu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, CardDescription } from '@chakra-ui/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
const modules = [
  {
    id: 1,
    title: 'Document Management',
    description:
      'Upload, organize, and manage all your documents in one secure location.',
    icon: FileText,
    color: 'bg-blue-50 text-blue-600',
    features: ['File Organization', 'Version Control', 'Metadata Management'],
    path: '/documents/upload',
  },
  // {
  //   id: 2,
  //   title: "File Upload & Storage",
  //   description:
  //     "Drag and drop files with advanced upload capabilities and cloud storage.",
  //   icon: Upload,
  //   color: "bg-indigo-50 text-indigo-600",
  //   features: ["Bulk Upload", "Cloud Storage", "File Compression"],
  // },
  // {
  //   id: 3,
  //   title: "Search & Discovery",
  //   description:
  //     "Powerful search engine to find documents instantly using AI-powered indexing.",
  //   icon: Search,
  //   color: "bg-sky-50 text-sky-600",
  //   features: ["Full-Text Search", "AI Tagging", "Smart Filters"],
  // },
  {
    id: 4,
    title: 'Security & Compliance',
    description:
      'Enterprise-grade security with role-based access and compliance tracking.',
    icon: Shield,
    color: 'bg-blue-50 text-blue-700',
    features: ['Role-Based Access', 'Audit Trails', 'Encryptions'],
    path: '/settings',
  },
  // {
  //   id: 5,
  //   title: "Team Collaboration",
  //   description:
  //     "Share documents securely and collaborate with team members in real-time.",
  //   icon: Users,
  //   color: "bg-indigo-50 text-indigo-700",
  //   features: ["Real-time Sharing", "Comments", "Team Workspaces"],
  // },
  // {
  //   id: 6,
  //   title: "Archive Management",
  //   description:
  //     "Automated archiving with retention policies and compliance management.",
  //   icon: Archive,
  //   color: "bg-slate-50 text-slate-600",
  //   features: ["Auto-Archive", "Retention Policies", "Legal Hold"],
  // },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleModuleClick = (path: string) => {
    navigate(path);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="shadow bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center space-x-3">
              <div className="w-9 sm:w-10 h-9 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800">
                  DMS
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Document Management System
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/settings">
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-slate-200 rounded-md hover:bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center font-semibold text-slate-700"
                >
                  <Settings className="w-4 h-4" />
                  <span className="ml-2">Settings</span>
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button
                  size="sm"
                  className="bg-blue-600 rounded-md px-3 sm:px-4 py-1.5 sm:py-2 flex items-center font-semibold text-white"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="ml-2">Dashboard</span>
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-700 hover:bg-slate-100 focus:outline-none"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-3">
              <Link
                to="/settings"
                className="block w-full px-4 py-2 text-left rounded-md hover:bg-slate-100 text-slate-700 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </div>
              </Link>
              <Link
                to="/dashboard"
                className="block w-full px-4 py-2 text-left rounded-md bg-blue-600 text-white font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Dashboard
                </div>
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Welcome to <span className="text-blue-600">DMS</span>
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Your comprehensive document management solution. Upload, organize,
            search, and collaborate on documents with enterprise-grade security
            and intelligent automation.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="mb-12">
          <h3 className="text-2xl font-semibold text-slate-800 mb-2 text-center">
            System Modules
          </h3>
          <p className="text-slate-600 mb-8 text-center">
            Select a module to begin working with your documents
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module) => (
              <Card
                key={module.id}
                className="group hover:shadow-xl transition-all duration-500 border border-blue-50 hover:border-blue-100 cursor-pointer hover-scale animate-fade-in"
              >
                <div className="text-center pb-8 p-4">
                  <div
                    className={`w-16 h-16 rounded-2xl ${module.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <module.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-xl text-slate-800 group-hover:text-blue-600 transition-colors duration-300">
                    {module.title}
                  </CardTitle>
                  <div className="text-slate-600 leading-relaxed">
                    {module.description}
                  </div>
                </div>
                <CardContent className="pt-0">
                  <div className="space-y-2 mb-6">
                    {module.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center text-sm text-slate-600"
                      >
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 group-hover:shadow-lg"
                    onClick={() => handleModuleClick(module.path || '#')}
                  >
                    Open Module
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-slate-600">
            <p className="mb-2">© 2025 DMS. All rights reserved.</p>
            <p className="text-sm">
              Secure • Reliable • Scalable Document Management
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
