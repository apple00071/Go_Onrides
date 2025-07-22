'use client';

import React from 'react';
import type { SubmittedDocuments } from '@/types/bookings';

interface DocumentsChecklistProps {
  documents: SubmittedDocuments;
  onDocumentsChange?: (documents: SubmittedDocuments) => void;
  readOnly?: boolean;
}

export default function DocumentsChecklist({ documents, onDocumentsChange, readOnly = false }: DocumentsChecklistProps) {
  const handleChange = (key: keyof SubmittedDocuments, value: boolean | string) => {
    if (readOnly || !onDocumentsChange) return;

    onDocumentsChange({
      ...documents,
      [key]: value
    });
  };

  const standardDocuments = [
    { key: 'original_aadhar' as const, label: 'Original Aadhar Card' },
    { key: 'original_dl' as const, label: 'Original Driving License' },
    { key: 'passport' as const, label: 'Passport' },
    { key: 'voter_id' as const, label: 'Voter ID' },
  ];

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Physical Documents Submitted</h4>
      <div className="space-y-4">
        {/* Standard Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standardDocuments.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={key}
                checked={Boolean(documents[key])}
                onChange={(e) => handleChange(key, e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={key} className="text-sm text-gray-700">
                {label}
              </label>
            </div>
          ))}
        </div>

        {/* Other Document */}
        <div className="space-y-2">
          <label htmlFor="other_document" className="block text-sm font-medium text-gray-700">
            Other Document (if any)
          </label>
          <input
            type="text"
            id="other_document"
            value={typeof documents.other_document === 'string' ? documents.other_document : ''}
            onChange={(e) => handleChange('other_document', e.target.value)}
            placeholder="Enter document name"
            disabled={readOnly}
            className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
} 