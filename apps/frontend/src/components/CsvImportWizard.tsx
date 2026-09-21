'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api';

export type CSVImportType = 'student' | 'teacher' | 'question' | 'attendance';

interface CsvImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  type: CSVImportType;
  title?: string;
  context?: { classId?: string; subjectId?: string; testId?: string };
  onSuccess?: (result: any) => void;
}

interface ValidationErrorItem {
  row: number;
  column: string;
  error: string;
  suggestedFix: string;
  rawData?: any;
}

export default function CsvImportWizard({
  isOpen,
  onClose,
  type,
  title,
  context,
  onSuccess,
}: CsvImportWizardProps) {
  // 8 Steps: 1: Upload, 2: Parse, 3: Preview, 4: Validate, 5: Show Errors, 6: Confirm, 7: Import, 8: Summary
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  
  // Validation stats
  const [validationStats, setValidationStats] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    duplicatesCount: number;
    errors: ValidationErrorItem[];
    validRows: any[];
  } | null>(null);

  // Final summary
  const [importSummary, setImportSummary] = useState<{
    totalUploaded: number;
    valid: number;
    invalid: number;
    duplicates: number;
    imported: number;
    details?: any;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetWizard = () => {
    setCurrentStep(1);
    setFile(null);
    setRawText('');
    setParsedRows([]);
    setHeaders([]);
    setValidationStats(null);
    setImportSummary(null);
    setIsValidating(false);
    setIsImporting(false);
  };

  const handleDownloadTemplate = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    window.open(`${backendUrl}/csv/templates/${type}`, '_blank');
  };

  // Simple and robust CSV parser handling quotes
  const parseCSVText = (csv: string) => {
    const lines = csv.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { parsedHeaders: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Skip comment lines
    const validLines = lines.filter((l) => !l.trim().startsWith('#'));
    if (validLines.length === 0) return { parsedHeaders: [], rows: [] };

    const parsedHeaders = parseLine(validLines[0]);
    const rows: any[] = [];

    for (let i = 1; i < validLines.length; i++) {
      const values = parseLine(validLines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
      const rowObj: Record<string, string> = {};
      parsedHeaders.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }

    return { parsedHeaders, rows };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRawText(text);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Step 1 -> Step 2 & 3: Parse CSV and Preview
  const handleProceedToParse = () => {
    if (!rawText.trim()) {
      alert('Please select or paste CSV content first.');
      return;
    }
    const { parsedHeaders, rows } = parseCSVText(rawText);
    if (rows.length === 0) {
      alert('No valid data rows found in the CSV.');
      return;
    }
    setHeaders(parsedHeaders);
    setParsedRows(rows);
    setCurrentStep(3); // Step 2 (Parse) is instantaneous, so go directly to Preview (Step 3)
  };

  // Step 3 -> Step 4 & 5/6: Validate with backend engine
  const handleValidateCSV = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to validate and import data.');
      return;
    }
    setIsValidating(true);
    try {
      const res = await api.validateCSV(token, type, parsedRows, context);
      setValidationStats({
        totalRows: res.totalRows || parsedRows.length,
        validCount: res.validCount || 0,
        invalidCount: res.invalidCount || 0,
        duplicatesCount: res.duplicatesCount || 0,
        errors: res.errors || [],
        validRows: res.validRows || [],
      });

      // If there are errors, show Step 5 (Show Errors), else jump straight to Step 6 (Confirm)
      if (res.errors && res.errors.length > 0) {
        setCurrentStep(5);
      } else {
        setCurrentStep(6);
      }
    } catch (err: any) {
      alert(err.message || 'Validation failed. Please check your data format.');
    } finally {
      setIsValidating(false);
    }
  };

  // Step 6 -> Step 7: Commit transaction
  const handleCommitImport = async () => {
    const token = localStorage.getItem('token');
    if (!token || !validationStats) return;

    setIsImporting(true);
    setCurrentStep(7); // Show Step 7 importing indicator
    try {
      const res = await api.commitCSV(token, type, validationStats.validRows, context);
      setImportSummary({
        totalUploaded: validationStats.totalRows,
        valid: validationStats.validCount,
        invalid: validationStats.invalidCount,
        duplicates: validationStats.duplicatesCount,
        imported: res.importedCount || validationStats.validCount,
        details: res,
      });
      setCurrentStep(8); // Step 8: Success summary
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      alert(err.message || 'Import failed during database commit.');
      setCurrentStep(6);
    } finally {
      setIsImporting(false);
    }
  };

  const stepLabels = [
    'Upload CSV',
    'Parse CSV',
    'Preview Data',
    'Validate',
    'Errors',
    'Confirm',
    'Import',
    'Summary',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {title || `Import ${type.charAt(0).toUpperCase() + type.slice(1)} Data`}
              </h2>
              <p className="text-xs text-neutral-400">
                8-step transactional CSV import with live validation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetWizard();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="px-6 py-3 bg-neutral-950/40 border-b border-neutral-800/60 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 min-w-[600px]">
            {stepLabels.map((lbl, idx) => {
              const stepNum = idx + 1;
              const isActive = currentStep === stepNum;
              const isDone = currentStep > stepNum;
              return (
                <div key={lbl} className="flex items-center gap-1.5 flex-1">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition ${
                      isActive
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                        : isDone
                        ? 'bg-emerald-950 border border-emerald-700 text-emerald-400'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : stepNum}
                  </div>
                  <span
                    className={`text-[11px] whitespace-nowrap font-medium ${
                      isActive ? 'text-white font-bold' : isDone ? 'text-neutral-300' : 'text-neutral-600'
                    }`}
                  >
                    {lbl}
                  </span>
                  {idx < stepLabels.length - 1 && (
                    <div className="h-0.5 flex-1 bg-neutral-800 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: UPLOAD CSV */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-400">Need the correct columns format?</div>
                  <div className="text-[11px] text-neutral-400">
                    Download official pre-formatted template with example records and header definitions.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Download {type.charAt(0).toUpperCase() + type.slice(1)} Template</span>
                </button>
              </div>

              {/* Drag and Drop / File Input */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-700 hover:border-emerald-500/60 rounded-3xl p-8 text-center cursor-pointer transition bg-neutral-950/40 hover:bg-neutral-950/80 group space-y-3"
              >
                <input
                  type="file"
                  accept=".csv,text/csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mx-auto w-12 h-12 rounded-2xl bg-neutral-900 group-hover:bg-emerald-500/20 text-neutral-400 group-hover:text-emerald-400 flex items-center justify-center transition">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {file ? file.name : 'Click to select or drag CSV file here'}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">Supports UTF-8 formatted .csv files</div>
                </div>
              </div>

              {/* Or paste CSV content */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center justify-between">
                  <span>Or paste CSV text directly:</span>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawText('');
                        setFile(null);
                      }}
                      className="text-[10px] text-neutral-500 hover:text-red-400"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste CSV rows here..."
                  className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW DATA */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Step 3: Preview Parsed Records</h3>
                  <p className="text-xs text-neutral-400">
                    Found {parsedRows.length} data rows across {headers.length} columns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleValidateCSV}
                  disabled={isValidating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/30"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Validating Rows...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Validate Dataset (Step 4)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto border border-neutral-800 rounded-2xl bg-neutral-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-300 font-mono text-[11px]">
                      <th className="p-3 w-12 text-center text-neutral-500">#</th>
                      {headers.map((h) => (
                        <th key={h} className="p-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-sans">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/40">
                        <td className="p-3 text-center font-mono text-[10px] text-neutral-500">
                          {idx + 1}
                        </td>
                        {headers.map((h) => (
                          <td key={h} className="p-3 text-neutral-300 max-w-[200px] truncate">
                            {row[h] || <span className="text-neutral-600 italic">empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <div className="text-[11px] text-neutral-500 text-center">
                  Showing first 10 rows of {parsedRows.length} total rows.
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SHOW ERRORS */}
          {currentStep === 5 && validationStats && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/50 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-red-300">
                    Step 5: Validation Issues Detected
                  </div>
                  <div className="text-xs text-neutral-300">
                    Found {validationStats.invalidCount} invalid entries out of{' '}
                    {validationStats.totalRows} uploaded rows. You can still import the{' '}
                    <strong className="text-emerald-400">{validationStats.validCount} valid rows</strong>{' '}
                    or fix errors in your CSV.
                  </div>
                </div>
              </div>

              {/* Errors Breakdown Table */}
              <div className="overflow-x-auto border border-neutral-800 rounded-2xl bg-neutral-950 max-h-[350px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-3 w-16 text-center">Row</th>
                      <th className="p-3 w-28">Column</th>
                      <th className="p-3">Error Detected</th>
                      <th className="p-3 text-emerald-400">Suggested Fix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {validationStats.errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/40">
                        <td className="p-3 text-center font-mono text-red-400 font-bold">
                          #{err.row}
                        </td>
                        <td className="p-3 font-mono text-neutral-300 font-semibold">{err.column}</td>
                        <td className="p-3 text-red-300">{err.error}</td>
                        <td className="p-3 text-emerald-300 font-medium">{err.suggestedFix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition"
                >
                  ← Re-upload Corrected CSV
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  disabled={validationStats.validCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <span>Proceed with {validationStats.validCount} Valid Records (Step 6)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRM IMPORT */}
          {currentStep === 6 && validationStats && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">Step 6: Confirm Batch Import</h3>
                <p className="text-xs text-neutral-400">
                  Please review the final metrics before committing transactions to the database.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-1">
                  <div className="text-[11px] text-neutral-400">Uploaded</div>
                  <div className="text-2xl font-black text-white">{validationStats.totalRows}</div>
                  <div className="text-[10px] text-neutral-500">Rows in CSV</div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-center space-y-1">
                  <div className="text-[11px] text-emerald-400">Valid</div>
                  <div className="text-2xl font-black text-emerald-400">{validationStats.validCount}</div>
                  <div className="text-[10px] text-emerald-500">Ready to insert</div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-1">
                  <div className="text-[11px] text-yellow-400">Duplicates</div>
                  <div className="text-2xl font-black text-yellow-400">
                    {validationStats.duplicatesCount}
                  </div>
                  <div className="text-[10px] text-neutral-500">Already in system</div>
                </div>

                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-800/30 text-center space-y-1">
                  <div className="text-[11px] text-red-400">Invalid</div>
                  <div className="text-2xl font-black text-red-400">{validationStats.invalidCount}</div>
                  <div className="text-[10px] text-neutral-500">Skipped</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs text-neutral-400">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Transactional Safety Guarantee</span>
                </div>
                <div>
                  All {validationStats.validCount} valid records will be committed atomically inside a
                  database transaction. If any system exception occurs, the transaction will rollback safely.
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold"
                >
                  ← Back to Preview
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={isImporting || validationStats.validCount === 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-xl shadow-emerald-600/30"
                >
                  <Upload className="h-4 w-4" />
                  <span>Execute Import (Step 7)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: IMPORTING IN PROGRESS */}
          {currentStep === 7 && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="h-10 w-10 text-emerald-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Step 7: Committing to Database...</h3>
                <p className="text-xs text-neutral-400">
                  Executing atomic transactions and linking academic relationships.
                </p>
              </div>
            </div>
          )}

          {/* STEP 8: SUCCESS SUMMARY */}
          {currentStep === 8 && importSummary && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-white">Step 8: Import Completed Successfully!</h3>
                <p className="text-xs text-neutral-400">
                  All valid records have been securely imported into the institutional database.
                </p>
              </div>

              {/* Summary Card as required in Master Prompt */}
              <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                  IMPORT AUDIT REPORT
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400">Uploaded</div>
                    <div className="text-xl font-black text-white">{importSummary.totalUploaded}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                    <div className="text-[10px] text-emerald-400">Valid</div>
                    <div className="text-xl font-black text-emerald-400">{importSummary.valid}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40">
                    <div className="text-[10px] text-red-400">Invalid</div>
                    <div className="text-xl font-black text-red-400">{importSummary.invalid}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-950/30 border border-yellow-800/40">
                    <div className="text-[10px] text-yellow-400">Duplicates</div>
                    <div className="text-xl font-black text-yellow-400">{importSummary.duplicates}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-600/20 border border-emerald-500 text-emerald-300 col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold">Imported</div>
                    <div className="text-xl font-black text-white">{importSummary.imported}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetWizard();
                    onClose();
                  }}
                  className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
                >
                  Done & Close Wizard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (for Step 1) */}
        {currentStep === 1 && (
          <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/60">
            <button
              type="button"
              onClick={() => {
                resetWizard();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedToParse}
              disabled={!rawText.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <span>Parse & Preview (Step 2 & 3)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
