'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import {
  validateFile,
  extractTextFromFile,
  extractHeadings,
  splitByParagraphs,
  createSingleEntry,
  detectEntityType,
  type ParsedSection,
} from '@/lib/import-parser';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  onSuccess: () => void;
}

type ImportStep = 'upload' | 'processing' | 'success' | 'error';
type ImportOption = 'single' | 'headings' | 'paragraphs';

interface ImportResult {
  createdCount: number;
  summary: Record<string, number>;
}

export function ImportModal({
  open,
  onOpenChange,
  campaignId,
  userId,
  onSuccess,
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [importOption, setImportOption] = useState<ImportOption>('headings');
  const [defaultCategory, setDefaultCategory] = useState('Imported Notes');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [processingFile, setProcessingFile] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    acceptedFiles.forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx',
      ],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processImport = async () => {
    if (uploadedFiles.length === 0 && !pastedText.trim()) {
      toast.error('Please upload files or paste text to import');
      return;
    }

    setStep('processing');
    setProgress(0);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log('[ImportModal] Session:', session);
      console.log('[ImportModal] Token:', session?.access_token);

      if (!session) {
        throw new Error('Not authenticated');
      }

      const allSections: ParsedSection[] = [];

      if (pastedText.trim()) {
        setProcessingFile('Pasted text');
        setProgress(10);

        let sections: ParsedSection[];
        switch (importOption) {
          case 'single':
            sections = [createSingleEntry(pastedText, 'Direct Paste')];
            break;
          case 'headings':
            sections = extractHeadings(pastedText);
            break;
          case 'paragraphs':
            sections = splitByParagraphs(pastedText);
            break;
        }
        allSections.push(...sections);
      }

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setProcessingFile(file.name);
        setProgress(20 + (i / uploadedFiles.length) * 40);

        const text = await extractTextFromFile(file);

        if (!text.trim()) {
          throw new Error(
            `No content detected in ${file.name}. Please check the file and try again.`
          );
        }

        let sections: ParsedSection[];
        switch (importOption) {
          case 'single':
            sections = [createSingleEntry(text, file.name)];
            break;
          case 'headings':
            sections = extractHeadings(text);
            break;
          case 'paragraphs':
            sections = splitByParagraphs(text);
            break;
        }
        allSections.push(...sections);
      }

      setProgress(70);
      setProcessingFile('Creating memory entries...');

      const createdEntries = [];
      const typeSummary: Record<string, number> = {};

      for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        const entryType = detectEntityType(section.title, section.content);

        const response = await fetch('/api/memory/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            campaignId,
            userId,
            name: section.title,
            type: entryType,
            category: defaultCategory,
            content: section.content,
            tags: ['Imported', new Date().toISOString().split('T')[0]],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create memory entry');
        }

        const data = await response.json();
        createdEntries.push(data.data);

        typeSummary[entryType] = (typeSummary[entryType] || 0) + 1;

        setProgress(70 + ((i + 1) / allSections.length) * 30);
      }

      setResult({
        createdCount: createdEntries.length,
        summary: typeSummary,
      });
      setStep('success');
      toast.success(`Successfully imported ${createdEntries.length} entries!`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Import failed. Please check your connection and try again.'
      );
      setStep('error');
      toast.error('Import failed');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    setStep('upload');
    setUploadedFiles([]);
    setPastedText('');
    setImportOption('headings');
    setDefaultCategory('Imported Notes');
    setProgress(0);
    setError(null);
    setResult(null);
    setProcessingFile('');
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Import Campaign Data</DialogTitle>
        <DialogDescription>
          Upload files or paste text to import into your campaign memory
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Campaign Notes
          </Label>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              {isDragActive
                ? 'Drop files here'
                : 'Drop files here or click to browse'}
            </p>
            <Button type="button" variant="outline" size="sm">
              Click to select files
            </Button>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Supported formats:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>Plain text (.txt)</li>
              <li>Markdown (.md)</li>
              <li>Word documents (.docx)</li>
            </ul>
            <p className="mt-2">Maximum file size: 10MB</p>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="pastedText" className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Or paste text directly
          </Label>
          <Textarea
            id="pastedText"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your campaign notes here..."
            rows={10}
            className="resize-none font-mono text-sm"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-base">Import options</Label>
          <RadioGroup value={importOption} onValueChange={(v) => setImportOption(v as ImportOption)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single" className="font-normal cursor-pointer">
                Create one entry (all text in single entry)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="headings" id="headings" />
              <Label htmlFor="headings" className="font-normal cursor-pointer">
                Split by headings (H1/H2 creates new entry)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="paragraphs" id="paragraphs" />
              <Label htmlFor="paragraphs" className="font-normal cursor-pointer">
                Split by paragraphs (blank line = new entry)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Default category</Label>
          <Select value={defaultCategory} onValueChange={setDefaultCategory}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Imported Notes">Imported Notes</SelectItem>
              <SelectItem value="NPC">NPC</SelectItem>
              <SelectItem value="Location">Location</SelectItem>
              <SelectItem value="Monster">Monster</SelectItem>
              <SelectItem value="Item">Item</SelectItem>
              <SelectItem value="Quest">Quest</SelectItem>
              <SelectItem value="Session">Session</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={processImport}
          disabled={uploadedFiles.length === 0 && !pastedText.trim()}
        >
          Import
        </Button>
      </DialogFooter>
    </>
  );

  const renderProcessingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Importing your data...</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Processing: {processingFile}</p>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
        </div>
      </div>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Import Successful!
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div>
          <p className="text-sm font-medium mb-2">
            Created {result?.createdCount} memory entries:
          </p>
          <ul className="space-y-1">
            {Object.entries(result?.summary || {}).map(([type, count]) => (
              <li key={type} className="text-sm text-muted-foreground ml-4">
                • {count} {type}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setStep('upload')}>
          Import More
        </Button>
        <Button type="button" onClick={handleClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );

  const renderErrorStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Import Failed
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="button" onClick={() => setStep('upload')}>
          Try Again
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'success' && renderSuccessStep()}
        {step === 'error' && renderErrorStep()}
      </DialogContent>
    </Dialog>
  );
}
