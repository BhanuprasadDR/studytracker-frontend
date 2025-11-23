import React, { useState, useEffect } from 'react';
import { Settings, Calendar, CheckCircle } from 'lucide-react';
import { RevisionSettings } from '../types';
import Modal from './Modal';

interface RevisionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RevisionSettings;
  onSave: (settings: RevisionSettings) => void;
}

const RevisionSettingsModal: React.FC<RevisionSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [tempSettings, setTempSettings] = useState<RevisionSettings>(settings);
  const [optionalRevisions, setOptionalRevisions] = useState({
    revision5: false,
    revision6: false,
    revision7: false,
    revision8: false
  });

  useEffect(() => {
    if (isOpen) {
      setTempSettings(settings);
      // Check which optional revisions are currently enabled
      setOptionalRevisions({
        revision5: settings.numberOfRevisions >= 5,
        revision6: settings.numberOfRevisions >= 6,
        revision7: settings.numberOfRevisions >= 7,
        revision8: settings.numberOfRevisions >= 8
      });
    }
  }, [isOpen, settings]);

  const handleOptionalRevisionChange = (revisionKey: string, enabled: boolean) => {
    setOptionalRevisions(prev => ({ ...prev, [revisionKey]: enabled }));
    
    // Update temp settings based on selected optional revisions
    const newOptionalRevisions = { ...optionalRevisions, [revisionKey]: enabled };
    const enabledOptionalCount = Object.values(newOptionalRevisions).filter(Boolean).length;
    const totalRevisions = 4 + enabledOptionalCount; // 4 mandatory + optional ones
    
    // Build intervals array: first 4 are mandatory, then add optional ones in order
    const intervals = [1, 3, 7, 14]; // Mandatory intervals
    if (newOptionalRevisions.revision5) intervals.push(24);
    if (newOptionalRevisions.revision6) intervals.push(39);
    if (newOptionalRevisions.revision7) intervals.push(54);
    if (newOptionalRevisions.revision8) intervals.push(81);
    
    setTempSettings({
      numberOfRevisions: totalRevisions,
      intervals: intervals
    });
  };

  const handleSave = () => {
    // Important: Save settings first, then let the auto-move logic handle session movement
    onSave(tempSettings);
    onClose();
  };

  const handleCancel = () => {
    setTempSettings(settings);
    setOptionalRevisions({
      revision5: settings.numberOfRevisions >= 5,
      revision6: settings.numberOfRevisions >= 6,
      revision7: settings.numberOfRevisions >= 7,
      revision8: settings.numberOfRevisions >= 8
    });
    onClose();
  };

  const resetToDefaults = () => {
    setTempSettings({
      numberOfRevisions: 4,
      intervals: [1, 3, 7, 14]
    });
    setOptionalRevisions({
      revision5: false,
      revision6: false,
      revision7: false,
      revision8: false
    });
  };

  const optionalRevisionsData = [
    { key: 'revision5', label: 'Revision 5', days: 24, description: '24 days after study' },
    { key: 'revision6', label: 'Revision 6', days: 39, description: '39 days after study' },
    { key: 'revision7', label: 'Revision 7', days: 54, description: '54 days after study' },
    { key: 'revision8', label: 'Revision 8', days: 81, description: '81 days after study' }
  ];
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Revision Settings"
      size="lg"
    >
      <div className="space-y-6">
        {/* Optional Revisions */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Optional Additional Revisions</h4>
          <div className="space-y-3">
            {optionalRevisionsData.map((revision) => (
              <div key={revision.key} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id={revision.key}
                  checked={optionalRevisions[revision.key as keyof typeof optionalRevisions]}
                  onChange={(e) => handleOptionalRevisionChange(revision.key, e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                />
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mr-3">
                  {revision.key.replace('revision', '')}
                </div>
                <div className="flex-1">
                  <label htmlFor={revision.key} className="font-medium text-gray-900 cursor-pointer">
                    {revision.label}
                  </label>
                  <div className="text-sm text-gray-600">{revision.description}</div>
                </div>
                <div className="text-purple-600 font-medium text-sm">
                  {optionalRevisions[revision.key as keyof typeof optionalRevisions] ? 'Enabled' : 'Optional'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Configuration Display */}
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div>
            <h4 className="text-lg font-medium text-gray-900">Current Configuration</h4>
            <p className="text-sm text-gray-600">Currently set to {tempSettings.numberOfRevisions} revision{tempSettings.numberOfRevisions !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={resetToDefaults}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Reset to Default (4 Revisions)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save & Update All Sessions
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RevisionSettingsModal;