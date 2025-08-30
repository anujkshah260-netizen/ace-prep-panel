import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, FileText, Briefcase, File, 
  Trash2, Download, Eye, Sparkles,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Document {
  id: string;
  name: string;
  type: 'resume' | 'job_description' | 'supporting_document';
  file_path: string;
  file_size?: number;
  content_text?: string;
  created_at: string;
}

interface DocumentSession {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export const DocumentManager = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessions, setSessions] = useState<DocumentSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DocumentSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    }
  }, [toast]);

  const loadSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('document_sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, []);

  // Load documents and sessions on mount
  useEffect(() => {
    loadDocuments();
    loadSessions();
  }, [loadDocuments, loadSessions]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      // Get current user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      for (const file of Array.from(files)) {
        try {
          // Determine document type based on file name
          const type = determineDocumentType(file.name);
          
          // Create a unique file path
          const timestamp = Date.now();
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${user.id}/${timestamp}_${sanitizedName}`;
          
          console.log('Uploading file:', { name: file.name, type, path: filePath, size: file.size });
          
          // Upload file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          console.log('File uploaded to storage:', uploadData);

          // Extract text content (basic text extraction)
          const contentText = await extractTextFromFile(file);

          // Save document metadata to database
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert([{
              name: file.name,
              type,
              file_path: filePath,
              file_size: file.size,
              content_text: contentText,
              user_id: user.id,
              metadata: {
                mime_type: file.type,
                uploaded_at: new Date().toISOString()
              }
            }])
            .select()
            .single();

          if (docError) {
            console.error('Database insert error:', docError);
            throw new Error(`Database insert failed: ${docError.message}`);
          }

          console.log('Document saved to database:', docData);

          // Add to current session if one is selected
          if (currentSession) {
            const { error: sessionError } = await supabase
              .from('session_documents')
              .insert([{
                session_id: currentSession.id,
                document_id: docData.id
              }]);
            
            if (sessionError) {
              console.error('Session document link error:', sessionError);
              // Don't fail the upload for this, just log it
            }
          }

          toast({
            title: "Success",
            description: `${file.name} uploaded successfully!`
          });
          
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
            variant: "destructive"
          });
          // Continue with other files
        }
      }

      // Reload documents after all uploads
      await loadDocuments();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const determineDocumentType = (fileName: string): 'resume' | 'job_description' | 'supporting_document' => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('resume') || lowerName.includes('cv')) return 'resume';
    if (lowerName.includes('jd') || lowerName.includes('job') || lowerName.includes('description')) return 'job_description';
    return 'supporting_document';
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    try {
      // For text files, extract the actual content
      if (file.type === 'text/plain') {
        return await file.text();
      }
      
      // For PDFs and other files, we'll need to use a service
      // For now, return a placeholder that indicates the file type
      if (file.type === 'application/pdf') {
        return `PDF document: ${file.name}\n\nNote: PDF text extraction requires integration with a service like AWS Textract, Google Vision, or similar. For now, this is a placeholder.`;
      }
      
      if (file.type.includes('word') || file.type.includes('document')) {
        return `Word document: ${file.name}\n\nNote: Word document text extraction requires integration with a service. For now, this is a placeholder.`;
      }
      
      // For other file types
      return `File: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nNote: Text extraction for this file type requires additional integration.`;
      
    } catch (error) {
      console.error('Error extracting text from file:', error);
      return `Error extracting text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const createNewSession = async () => {
    if (!newSessionName.trim()) return;

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('document_sessions')
        .insert([{
          name: newSessionName,
          description: newSessionDescription,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setSessions([data, ...sessions]);
      setCurrentSession(data);
      setNewSessionName('');
      setNewSessionDescription('');
      setShowNewSessionForm(false);

      toast({
        title: "Success",
        description: "New session created!"
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive"
      });
    }
  };

  const generateInterviewTabs = async () => {
    if (!currentSession || documents.length === 0) {
      toast({
        title: "Warning",
        description: "Please select a session and upload documents first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Collect all document content
      const allContent = documents
        .filter(doc => doc.content_text)
        .map(doc => `${doc.type.toUpperCase()}: ${doc.content_text}`)
        .join('\n\n');

      // Generate tabs using OpenAI
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call the generate-content function
      const { generateInterviewTabs } = await import('@/api/generate-content');
      const result = await generateInterviewTabs({
        action: 'generate_tabs',
        content: allContent,
        sessionId: currentSession.id,
        userId: user.id
      });
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Interview tabs generated successfully!"
        });
        // Refresh topics
        window.location.reload();
      } else {
        throw new Error(result.error || 'Generation failed');
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate interview tabs",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const autoGenerateTopicsAndContent = async () => {
    if (documents.length === 0) {
      toast({
        title: "Warning",
        description: "Please upload documents first",
        variant: "destructive"
      });
      return;
    }

    setIsAutoGenerating(true);
    setGenerationProgress(0);

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Collect all document content
      const allContent = documents
        .filter(doc => doc.content_text)
        .map(doc => `${doc.type.toUpperCase()}: ${doc.content_text}`)
        .join('\n\n');

      // Call the generate-content function for auto-generation
      const { generateDefaultTabs } = await import('@/api/generate-content');
      const result = await generateDefaultTabs({
        action: 'generate_default_tabs',
        userId: user.id,
        content: allContent,
        documents: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          content: doc.content_text || ''
        }))
      });
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Generated ${result.topicsCreated || 0} topics with AI-powered content!`
        });
        // Refresh topics
        window.location.reload();
      } else {
        throw new Error(result.error || 'Auto-generation failed');
      }

    } catch (error) {
      console.error('Auto-generation error:', error);
      toast({
        title: "Error",
        description: "Failed to auto-generate topics and content",
        variant: "destructive"
      });
    } finally {
      setIsAutoGenerating(false);
      setGenerationProgress(0);
    }
  };

  const viewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `${document.name} download started`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      // First get the document to get the file path
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path, name')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage first
      if (document?.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Mark as inactive in database (soft delete)
      const { error: dbError } = await supabase
        .from('documents')
        .update({ is_active: false })
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Remove from session_documents if it exists
      await supabase
        .from('session_documents')
        .delete()
        .eq('document_id', documentId);

      // Update local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Success",
        description: `${document?.name || 'Document'} deleted successfully!`
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'resume': return <FileText className="w-5 h-5" />;
      case 'job_description': return <Briefcase className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'resume': return 'Resume';
      case 'job_description': return 'Job Description';
      default: return 'Supporting Doc';
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Interview Preparation Session
          </CardTitle>
          <CardDescription>
            Upload your documents and generate AI-powered interview preparation tabs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session Selection/Creation */}
          <div className="flex items-center gap-4">
            <select 
              value={currentSession?.id || ''} 
              onChange={(e) => {
                const session = sessions.find(s => s.id === e.target.value);
                setCurrentSession(session || null);
              }}
              className="flex-1 p-2 border rounded-md"
            >
              <option value="">Select a session...</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            <Button 
              onClick={() => setShowNewSessionForm(!showNewSessionForm)}
              variant="outline"
            >
              {showNewSessionForm ? 'Cancel' : 'New Session'}
            </Button>
          </div>

          {/* New Session Form */}
          {showNewSessionForm && (
            <div className="space-y-3 p-4 border rounded-md bg-muted/50">
              <Input
                placeholder="Session name (e.g., Google Data Engineer Interview)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
              />
              <Textarea
                placeholder="Session description (optional)"
                value={newSessionDescription}
                onChange={(e) => setNewSessionDescription(e.target.value)}
                rows={2}
              />
              <Button onClick={createNewSession} disabled={!newSessionName.trim()}>
                Create Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload your resume, job description, and any supporting documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Drag and drop files here, or click to browse
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Choose Files
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Document Type Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-semibold">Resume/CV</h4>
                <p className="text-sm text-muted-foreground">
                  Upload your current resume or CV
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Briefcase className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-semibold">Job Description</h4>
                <p className="text-sm text-muted-foreground">
                  Upload the job posting or description
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <File className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <h4 className="font-semibold">Supporting Docs</h4>
                <p className="text-sm text-muted-foreground">
                  Any additional relevant documents
                </p>
              </div>
            </div>

            {/* Auto-Generation Section */}
            {documents.length > 0 && (
              <div className="mt-6 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-800">AI-Powered Auto-Generation</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Let AI automatically read your documents and create personalized interview topics with content
                  </p>
                  <Button 
                    onClick={autoGenerateTopicsAndContent}
                    disabled={isAutoGenerating || documents.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                    size="lg"
                  >
                    {isAutoGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        AI is Creating Topics & Content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Create Topics & Content with AI
                      </>
                    )}
                  </Button>
                  
                  {isAutoGenerating && (
                    <div className="space-y-2">
                      <Progress value={generationProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">
                        AI is analyzing your documents and creating personalized interview content...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              Manage your uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getDocumentIcon(doc.type)}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {getDocumentTypeLabel(doc.type)}
                        </Badge>
                        {doc.file_size && (
                          <span className="text-sm text-muted-foreground">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => viewDocument(doc)}
                      title="View document details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => downloadDocument(doc)}
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deleteDocument(doc.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Tabs */}
      {documents.length > 0 && currentSession && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Interview Tabs</CardTitle>
            <CardDescription>
              Use AI to generate interview preparation tabs based on your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">What will be generated:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Introduction & Summary with key points</li>
                  <li>• Recent Projects & Experience highlights</li>
                  <li>• Behavioral Questions & Answers</li>
                  <li>• Technical Questions based on JD & Resume</li>
                  <li>• Speaking Scripts for each topic</li>
                  <li>• Cross-Questions & Follow-ups</li>
                </ul>
              </div>

              <Button 
                onClick={generateInterviewTabs}
                disabled={isGenerating || documents.length === 0}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Tabs...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Interview Tabs
                  </>
                )}
              </Button>

              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={generationProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    AI is analyzing your documents and generating interview preparation content...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Details Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDocumentModal(false)}
              >
                ×
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {getDocumentTypeLabel(selectedDocument.type)}
                  </Badge>
                  {selectedDocument.file_size && (
                    <span className="text-sm text-muted-foreground">
                      {(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedDocument.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {selectedDocument.content_text && (
                  <div>
                    <h4 className="font-medium mb-2">Content Preview</h4>
                    <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                      {selectedDocument.content_text}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadDocument(selectedDocument)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDocumentModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
