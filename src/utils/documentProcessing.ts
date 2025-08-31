import { supabase } from '@/integrations/supabase/client';

export interface ProcessedDocument {
  id: string;
  name: string;
  type: 'resume' | 'job_description' | 'supporting_document';
  content_text: string;
  metadata: Record<string, any>;
}

// Enhanced PDF text extraction using pdf-parse
export const extractPDFText = async (file: File): Promise<string> => {
  try {
    const pdfParse = await import('pdf-parse');
    const arrayBuffer = await file.arrayBuffer();
    const data = await pdfParse.default(arrayBuffer);
    
    if (data.text && data.text.trim().length > 0) {
      return data.text;
    } else {
      return `PDF Document: ${file.name}
Size: ${Math.round(file.size / 1024)} KB
Pages: ${data.numpages || 'Unknown'}

Note: PDF was processed but no readable text was found. This might be a scanned document or image-based PDF.`;
    }
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return `PDF Document: ${file.name}
Size: ${Math.round(file.size / 1024)} KB

Note: Error extracting PDF content. The file may be corrupted or require advanced processing.`;
  }
};

// Enhanced Word document extraction
export const extractWordText = async (file: File): Promise<string> => {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.value && result.value.trim().length > 0) {
      return result.value;
    } else {
      return `Word Document: ${file.name}
Size: ${Math.round(file.size / 1024)} KB

Note: Word document was processed but no readable text was found.`;
    }
  } catch (error) {
    console.error('Error extracting Word text:', error);
    return `Word Document: ${file.name}
Size: ${Math.round(file.size / 1024)} KB

Note: Error extracting Word document content. The file may be corrupted or in an unsupported format.`;
  }
};

// Enhanced file processing with better content validation
export const processDocumentFile = async (file: File): Promise<string> => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  try {
    // Handle text files
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const text = await file.text();
      if (text.trim().length === 0) {
        return `Empty text file: ${file.name}`;
      }
      return text;
    }
    
    // Handle PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractPDFText(file);
    }
    
    // Handle Word documents
    if (fileType.includes('word') || 
        fileType.includes('document') || 
        fileName.endsWith('.doc') || 
        fileName.endsWith('.docx')) {
      return await extractWordText(file);
    }
    
    // Handle other common document types
    if (fileName.endsWith('.rtf')) {
      return `RTF Document: ${file.name}\nNote: RTF text extraction requires additional processing.`;
    }
    
    // For unknown types, provide helpful information
    return `Document: ${file.name}
Type: ${fileType || 'Unknown'}
Size: ${Math.round(file.size / 1024)} KB

Note: This file type requires specific processing for text extraction.
The AI will use the filename and document type to generate relevant content.`;
    
  } catch (error) {
    console.error('Error processing document file:', error);
    return `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Validate document content to ensure it's meaningful
export const validateDocumentContent = (content: string, fileName: string): {
  isValid: boolean;
  reason?: string;
} => {
  if (!content || content.trim().length === 0) {
    return { isValid: false, reason: 'Empty content' };
  }
  
  if (content.trim().length < 50) {
    return { isValid: false, reason: 'Content too short' };
  }
  
  // Check if it's mostly placeholder text or error messages
  const placeholderKeywords = [
    'note:', 'requires integration', 'error extracting', 'no readable text',
    'corrupted', 'advanced processing', 'server-side processing'
  ];
  const hasPlaceholderText = placeholderKeywords.some(keyword => 
    content.toLowerCase().includes(keyword)
  );
  
  if (hasPlaceholderText) {
    return { 
      isValid: false, 
      reason: 'Document content not properly extracted - text extraction failed' 
    };
  }
  
  // Check for meaningful content indicators
  const meaningfulIndicators = [
    'experience', 'skills', 'education', 'work', 'project', 'responsibility',
    'requirements', 'qualifications', 'role', 'position', 'company'
  ];
  const hasMeaningfulContent = meaningfulIndicators.some(indicator =>
    content.toLowerCase().includes(indicator)
  );
  
  if (!hasMeaningfulContent && content.length < 200) {
    return {
      isValid: false,
      reason: 'Document content appears generic - may need manual review'
    };
  }
  
  return { isValid: true };
};

// Create comprehensive document summary for AI processing
export const createDocumentSummary = (documents: ProcessedDocument[]): string => {
  if (documents.length === 0) {
    return 'No documents provided.';
  }
  
  const summary = documents.map(doc => {
    const validation = validateDocumentContent(doc.content_text, doc.name);
    
    if (validation.isValid) {
      return `=== ${doc.type.toUpperCase()}: ${doc.name} ===
${doc.content_text}
`;
    } else {
      return `=== ${doc.type.toUpperCase()}: ${doc.name} ===
Document Type: ${doc.type}
Filename: ${doc.name}
Note: Full content extraction pending - AI will use document type and filename context.
${validation.reason}
`;
    }
  }).join('\n\n');
  
  return `UPLOADED DOCUMENTS ANALYSIS:

${summary}

IMPORTANT FOR AI: 
- Focus on document types and filenames if content extraction is pending
- Generate relevant interview topics based on document types (resume, job description, etc.)
- If content is available, use specific details from the documents
- Create personalized content that matches the uploaded document types`;
};