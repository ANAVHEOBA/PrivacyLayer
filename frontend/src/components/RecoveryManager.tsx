'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Lock,
  FileJson,
  QrCode,
  Clipboard,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Key,
  Trash2,
  FileCheck,
  X,
  ShieldCheck,
  Info,
} from 'lucide-react';

// Note type definition
interface Note {
  nullifier: string;
  secret: string;
  commitment: string;
  denomination: number;
}

interface ImportResult {
  imported: Note[];
  failed: Array<{ note: unknown; reason: string }>;
  total: number;
}

export function RecoveryManager() {
  const [importMethod, setImportMethod] = useState<'file' | 'qr' | 'text' | 'clipboard'>('file');
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importedNotes, setImportedNotes] = useState<Note[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectFormat = (data: string): 'encrypted' | 'json' | 'unknown' => {
    try {
      const trimmed = data.trim();

      // Try base64 decode
      try {
        const decoded = atob(trimmed);
        const parsed = JSON.parse(decoded);
        if (parsed.ciphertext || parsed.algorithm) {
          return 'encrypted';
        }
        if (parsed.notes || Array.isArray(parsed)) {
          return 'json';
        }
      } catch {}

      // Try direct JSON
      const parsed = JSON.parse(trimmed);
      if (parsed.ciphertext || parsed.algorithm) {
        return 'encrypted';
      }
      if (parsed.notes || Array.isArray(parsed)) {
        return 'json';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const validateNote = (note: unknown): note is Note => {
    if (typeof note !== 'object' || note === null) return false;

    const n = note as Record<string, unknown>;

    return (
      typeof n.nullifier === 'string' &&
      typeof n.secret === 'string' &&
      typeof n.commitment === 'string' &&
      typeof n.denomination === 'number' &&
      /^0x[0-9a-fA-F]{64}$/.test(n.nullifier as string) &&
      /^0x[0-9a-fA-F]{64}$/.test(n.secret as string) &&
      /^0x[0-9a-fA-F]{64}$/.test(n.commitment as string)
    );
  };

  const processImport = useCallback(async () => {
    setErrors([]);
    setSuccess(null);
    setImportResult(null);

    if (!inputText.trim()) {
      setErrors(['Please provide backup data']);
      return;
    }

    const format = detectFormat(inputText);

    if (format === 'unknown') {
      setErrors(['Could not detect backup format. Please check your input.']);
      return;
    }

    setIsProcessing(true);

    try {
      let notes: Note[] = [];

      if (format === 'encrypted') {
        if (!password) {
          setErrors(['Password is required for encrypted backups']);
          setIsProcessing(false);
          return;
        }

        // Simulate decryption
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
          let decrypted: string;
          try {
            decrypted = atob(inputText.trim());
          } catch {
            decrypted = inputText.trim();
          }

          const data = JSON.parse(decrypted);
          notes = data.notes || [];
        } catch {
          setErrors(['Decryption failed. Please check your password.']);
          setIsProcessing(false);
          return;
        }
      } else {
        // JSON format
        const data = JSON.parse(inputText.trim());
        notes = Array.isArray(data) ? data : data.notes || [];
      }

      // Validate notes
      const result: ImportResult = {
        imported: [],
        failed: [],
        total: notes.length,
      };

      for (const note of notes) {
        if (validateNote(note)) {
          result.imported.push(note);
        } else {
          result.failed.push({
            note,
            reason: 'Invalid note format or missing fields',
          });
        }
      }

      setImportResult(result);

      if (result.imported.length > 0) {
        setSuccess(`Successfully validated ${result.imported.length} note(s)`);
        setImportedNotes(result.imported);
      }

      if (result.failed.length > 0) {
        setErrors([`${result.failed.length} note(s) failed validation`]);
      }
    } catch (error) {
      setErrors([`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, password]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setInputText(text);
      setImportMethod('file');
    } catch {
      setErrors(['Failed to read file']);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
      setSuccess('Pasted from clipboard');
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setErrors(['Failed to read clipboard']);
    }
  };

  const removeNote = (index: number) => {
    setImportedNotes(prev => prev.filter((_, i) => i !== index));
  };

  const confirmImport = () => {
    // In real app, this would save to wallet/storage
    setSuccess(`Imported ${importedNotes.length} note(s) successfully!`);
    setImportedNotes([]);
    setInputText('');
    setPassword('');
    setImportResult(null);
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary-400" />
        Recover Notes
      </h2>

      <div className="space-y-6">
        {/* Import Method */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Import Method
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => setImportMethod('file')}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                importMethod === 'file'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              File
            </button>
            <button
              onClick={() => setImportMethod('qr')}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                importMethod === 'qr'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
            <button
              onClick={() => setImportMethod('text')}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                importMethod === 'text'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <FileJson className="w-4 h-4" />
              Text
            </button>
            <button
              onClick={() => setImportMethod('clipboard')}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                importMethod === 'clipboard'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              Clipboard
            </button>
          </div>
        </div>

        {/* File Upload */}
        {importMethod === 'file' && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.bak,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-primary-500 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-slate-300">Click to upload backup file</p>
              <p className="text-xs text-slate-500 mt-1">.json, .bak, .txt</p>
            </button>
          </div>
        )}

        {/* Text/QR Input */}
        {(importMethod === 'text' || importMethod === 'qr') && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {importMethod === 'qr' ? 'QR Code Data' : 'Backup Data'}
            </label>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                importMethod === 'qr'
                  ? 'Paste QR code data here...'
                  : 'Paste backup JSON or encrypted data...'
              }
              rows={6}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono text-sm"
            />
          </div>
        )}

        {/* Clipboard */}
        {importMethod === 'clipboard' && (
          <button
            onClick={handlePaste}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Clipboard className="w-4 h-4" />
            Paste from Clipboard
          </button>
        )}

        {/* Password for Encrypted */}
        {inputText && detectFormat(inputText) === 'encrypted' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Decryption Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter decryption password"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* Format Indicator */}
        {inputText && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Detected format:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                detectFormat(inputText) === 'encrypted'
                  ? 'bg-amber-500/20 text-amber-300'
                  : detectFormat(inputText) === 'json'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {detectFormat(inputText).toUpperCase()}
            </span>
          </div>
        )}

        {/* Errors */}
        <AnimatePresence>
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                <AlertTriangle className="w-4 h-4" />
                Errors
              </div>
              <ul className="text-sm text-red-200 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-300">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Process Button */}
        <button
          onClick={processImport}
          disabled={isProcessing || !inputText.trim()}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              Validate & Import
            </>
          )}
        </button>

        {/* Import Result */}
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{importResult.total}</div>
                <div className="text-xs text-slate-400">Total</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{importResult.imported.length}</div>
                <div className="text-xs text-green-300">Valid</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{importResult.failed.length}</div>
                <div className="text-xs text-red-300">Invalid</div>
              </div>
            </div>

            {/* Imported Notes Preview */}
            {importedNotes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">
                  Imported Notes Preview
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {importedNotes.map((note, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-white">
                            {note.denomination} XLM
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-slate-400">
                            {note.commitment.slice(0, 10)}...
                          </code>
                          <button
                            onClick={() => removeNote(index)}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Import */}
            {importedNotes.length > 0 && (
              <button
                onClick={confirmImport}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Import ({importedNotes.length} notes)
              </button>
            )}
          </motion.div>
        )}

        {/* Info Notice */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Import Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300/80">
              <li>Supports encrypted backups and plain JSON</li>
              <li>Each note is validated before import</li>
              <li>Invalid notes are shown separately</li>
              <li>Review imported notes before confirming</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}