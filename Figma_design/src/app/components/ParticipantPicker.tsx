import React, { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { X, Plus, UserPlus } from 'lucide-react';

interface ParticipantPickerProps {
  selectedProfileIds: string[];
  onProfileIdsChange: (profileIds: string[]) => void;
  selectedNames: string[];
  onNamesChange: (names: string[]) => void;
}

export const ParticipantPicker: React.FC<ParticipantPickerProps> = ({
  selectedProfileIds,
  onProfileIdsChange,
  selectedNames,
  onNamesChange
}) => {
  const { profiles } = useProfile();
  const [inputValue, setInputValue] = useState('');

  const toggleProfile = (id: string) => {
    if (selectedProfileIds.includes(id)) {
      onProfileIdsChange(selectedProfileIds.filter((pid) => pid !== id));
    } else {
      onProfileIdsChange([...selectedProfileIds, id]);
    }
  };

  const handleAddName = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!selectedNames.includes(trimmed)) {
      onNamesChange([...selectedNames, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddName();
    }
  };

  const removeName = (name: string) => {
    onNamesChange(selectedNames.filter((n) => n !== name));
  };

  return (
    <div className="space-y-4">
      {/* Profiles list */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground block">
          Who participated?
        </label>
        <div className="flex flex-wrap gap-2.5">
          {profiles.map((profile) => {
            const isSelected = selectedProfileIds.includes(profile.id);
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => toggleProfile(profile.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all shadow-xs ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-primary font-bold ring-1 ring-primary'
                    : 'bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Avatar
                  className="w-5 h-5 text-[10px] select-none"
                  style={{ backgroundColor: profile.color || '#ff8b3d' }}
                >
                  <AvatarFallback className="bg-transparent text-white font-bold flex items-center justify-center">
                    {profile.emoji || profile.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{profile.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Free-text extras input */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground block">
          Additional Participants <span className="text-[10px] text-muted-foreground font-normal">(Friends, relatives...)</span>
        </label>
        
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type name and press Enter or comma..."
            className="text-xs h-9 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddName}
            className="h-9 px-3 font-semibold cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Custom chips */}
        {selectedNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 bg-muted border border-border/80 text-muted-foreground text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded-full"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeName(name)}
                  className="p-0.5 hover:bg-black/10 rounded-full cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
