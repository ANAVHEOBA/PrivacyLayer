'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Lock,
  Download,
  Copy,
  FileJson,
  QrCode,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Key,
  Info,
} from 'lucide-react';

// Note type definition
interface Note {
  nullifier: string;
  secret: string;
  commitment: string;
  denomination: number;
}

// Mock notes for demo (in real app, these would come from wallet/storage)
const MOCK_NOTES: Note[] = [
  {
    nullifier: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    secret: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    commitment: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    denomination: 100,
  },
  {
    nullifier: '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef',
    secret: '0xedcba0987654321edcba0987654321edcba0987654321edcba0987654321',
    commitment: '0xbcdef1234567890abcde1234567890abcdef1234567890abcdef12345678901',
    denomination: 1000,
  },
];

interface PasswordStrength {
  score: number;
  feedback: string[];
  isStrong: boolean;
}

export function BackupManager() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [backupLabel, setBackupLabel] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptedBackup, setEncryptedBackup] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'encrypted' | 'json' | 'qr'>('encrypted');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  // Load notes (mock for demo)
  useEffect(() => {
    setNotes(MOCK_NOTES);
  }, []);

  // Check password strength
  useEffect(() => {
    if (password) {
      const result = checkPasswordStrength(password);
      setPasswordStrength(result);
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const checkPasswordStrength = (pwd: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (pwd.length >= 16) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    score = Math.min(4, Math.floor(score));

    if (pwd.length < 8) feedback.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) feedback.push('Add uppercase letters');
    if (!/[a-z]/.test(pwd)) feedback.push('Add lowercase letters');
    if (!/[0-9]/.test(pwd)) feedback.push('Add numbers');
    if (!/[^A-Za-z0-9]/.test(pwd)) feedback.push('Add special characters');

    return { score, feedback, isStrong: score >= 3 };
  };

  const toggleNoteSelection = (index: number) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedNotes(newSelected);
  };

  const selectAllNotes = () => {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.keys()));
    }
  };

  const handleExport = useCallback(async () => {
    setErrors([]);
    setSuccess(null);

    const notesToExport = notes.filter((_, i) => selectedNotes.has(i));

    if (notesToExport.length === 0) {
      setErrors(['Please select at least one note to backup']);
      return;
    }

    if (exportFormat === 'encrypted') {
      if (!password) {
        setErrors(['Password is required for encrypted backup']);
        return;
      }

      if (password !== confirmPassword) {
        setErrors(['Passwords do not match']);
        return;
      }

      if (!passwordStrength?.isStrong) {
        setErrors(['Please use a stronger password']);
        return;
      }

      setIsEncrypting(true);

      try {
        // Simulate encryption (in real app, use SDK)
        const backupData = {
          version: 1,
          algorithm: 'AES-256-GCM',
          kdf: 'PBKDF2',
          timestamp: Math.floor(Date.now() / 1000),
          notes: notesToExport,
          label: backupLabel || undefined,
        };

        // Simulate async encryption
        await new Promise(resolve => setTimeout(resolve, 1000));

        const encrypted = btoa(JSON.stringify(backupData));
        setEncryptedBackup(encrypted);
        setSuccess(`Successfully encrypted ${notesToExport.length} note(s)`);
      } catch (error) {
        setErrors([`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      } finally {
        setIsEncrypting(false);
      }
    } else {
      // JSON export
      const jsonData = JSON.stringify(
        {
          version: 1,
          timestamp: Math.floor(Date.now() / 1000),
          notes: notesToExport,
          metadata: {
            label: backupLabel || undefined,
            count: notesToExport.length,
          },
        },
        null,
        2
      );

      downloadFile(jsonData, `privacylayer-backup-${Date.now()}.json`, 'application/json');
      setSuccess(`Exported ${notesToExport.length} note(s) as JSON`);
    }
  }, [notes, selectedNotes, password, confirmPassword, passwordStrength, exportFormat, backupLabel]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
    setTimeout(() => setSuccess(null), 2000);
  };

  const generateQRCode = async () => {
    const notesToExport = notes.filter((_, i) => selectedNotes.has(i));
    if (notesToExport.length === 0) {
      setErrors(['Please select at least one note']);
      return;
    }

    // For QR, we'll use a simple format
    const qrData = JSON.stringify(notesToExport);
    setEncryptedBackup(qrData);
    setExportFormat('qr');
    setSuccess(`Generated QR code for ${notesToExport.length} note(s)`);
  };

  const printBackup = () => {
    const notesToExport = notes.filter((_, i) => selectedNotes.has(i));
    if (notesToExport.length === 0) {
      setErrors(['Please select at least one note']);
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PrivacyLayer Note Backup</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            .note { border: 1px solid #ccc; padding: 10px; margin: 10px 0; page-break-inside: avoid; }
            .label { font-weight: bold; margin-bottom: 5px; }
            code { word-break: break-all; font-size: 10px; }
            .warning { background: #fff3cd; padding: 10px; margin: 20px 0; border-left: 4px solid #ffc107; }
          </style>
        </head>
        <body>
          <h1>PrivacyLayer Note Backup</h1>
          <p>Generated: ${new Date().toISOString()}</p>
          <p>Notes: ${notesToExport.length}</p>
          ${backupLabel ? `<p>Label: ${backupLabel}</p>` : ''}
          <div class="warning">
            <strong>⚠️ WARNING:</strong> Keep this document secure. These notes provide access to your privacy deposits.
            Never share your notes with anyone.
          </div>
          ${notesToExport
            .map(
              (note, i) => `
            <div class="note">
              <div class="label">Note #${i + 1}</div>
              <div>Denomination: ${note.denomination}</div>
              <div>Nullifier: <code>${note.nullifier}</code></div>
              <div>Secret: <code>${note.secret}</code></div>
              <div>Commitment: <code>${note.commitment}</code></div>
            </div>
          `
            )
            .join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary-400" />
        Backup Notes
      </h2>

      <div className="space-y-6">
        {/* Note Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-300">
              Select Notes to Backup ({selectedNotes.size}/{notes.length})
            </label>
            <button
              onClick={selectAllNotes}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              {selectedNotes.size === notes.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notes.map((note, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedNotes.has(index)
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
                onClick={() => toggleNoteSelection(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border ${
                        selectedNotes.has(index)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-slate-500'
                      }`}
                    >
                      {selectedNotes.has(index) && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {note.denomination} XLM
                    </span>
                  </div>
                  <code className="text-xs text-slate-400">
                    {note.commitment.slice(0, 10)}...
                  </code>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setExportFormat('encrypted')}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                exportFormat === 'encrypted'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              Encrypted
            </button>
            <button
              onClick={() => setExportFormat('json')}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                exportFormat === 'json'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <FileJson className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => setExportFormat('qr')}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                exportFormat === 'qr'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
          </div>
        </div>

        {/* Password Fields (for encrypted backup) */}
        {exportFormat === 'encrypted' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                Encryption Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter strong password"
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

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i < passwordStrength.score
                            ? passwordStrength.isStrong
                              ? 'bg-green-500'
                              : 'bg-amber-500'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-xs text-slate-400">
                      {passwordStrength.feedback.join(' • ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Backup Label */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Backup Label (optional)
          </label>
          <input
            type="text"
            value={backupLabel}
            onChange={e => setBackupLabel(e.target.value)}
            placeholder="e.g., 'Savings', 'Trading'"
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

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

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={isEncrypting || selectedNotes.size === 0}
            className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isEncrypting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Encrypting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {exportFormat === 'encrypted' ? 'Create Encrypted Backup' : 'Export JSON'}
              </>
            )}
          </button>

          {exportFormat === 'qr' && (
            <button
              onClick={generateQRCode}
              disabled={selectedNotes.size === 0}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Generate QR
            </button>
          )}

          <button
            onClick={printBackup}
            disabled={selectedNotes.size === 0}
            className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        {/* Encrypted Backup Result */}
        {encryptedBackup && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                {exportFormat === 'qr' ? 'QR Code Data' : 'Encrypted Backup'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(encryptedBackup)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    downloadFile(
                      encryptedBackup,
                      `privacylayer-backup-${Date.now()}.bak`,
                      'application/octet-stream'
                    )
                  }
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <code className="text-xs text-primary-300 break-all max-h-32 overflow-y-auto block">
              {encryptedBackup.slice(0, 200)}
              {encryptedBackup.length > 200 && '...'}
            </code>
          </motion.div>
        )}

        {/* Info Notice */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Security Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300/80">
              <li>Never share your backup or password</li>
              <li>Store backups in multiple secure locations</li>
              <li>Use strong, unique passwords</li>
              <li>Test decryption after backup</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}