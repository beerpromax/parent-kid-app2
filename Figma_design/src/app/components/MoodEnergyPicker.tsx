import React from 'react';
import { MoodTag, EnergyTag } from '../../lib/types';
import { MOOD_DETAILS, ENERGY_DETAILS } from './GrowthEntryCard';
import { Button } from './ui/button';

interface MoodEnergyPickerProps {
  selectedMood?: MoodTag;
  onMoodChange: (mood?: MoodTag) => void;
  selectedEnergy?: EnergyTag;
  onEnergyChange: (energy?: EnergyTag) => void;
}

export const MoodEnergyPicker: React.FC<MoodEnergyPickerProps> = ({
  selectedMood,
  onMoodChange,
  selectedEnergy,
  onEnergyChange
}) => {
  return (
    <div className="space-y-4">
      {/* Mood Selector Row */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground block">
          How was the mood? <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MOOD_DETAILS).map(([tag, details]) => {
            const isSelected = selectedMood === tag;
            const moodTag = tag as MoodTag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onMoodChange(isSelected ? undefined : moodTag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
                  isSelected
                    ? `${details.bg} ${details.text} border-current ring-1 ring-current`
                    : 'bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-sm leading-none">{details.emoji}</span>
                <span>{details.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Energy Selector Row */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground block">
          What was the energy level? <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ENERGY_DETAILS).map(([tag, details]) => {
            const isSelected = selectedEnergy === tag;
            const energyTag = tag as EnergyTag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onEnergyChange(isSelected ? undefined : energyTag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
                  isSelected
                    ? `${details.bg} ${details.text} border-current ring-1 ring-current`
                    : 'bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{details.emoji.split(' ')[0]}</span>
                <span>{details.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
