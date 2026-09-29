import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { FilterId } from '../../types/project';
import { FILTER_PRESETS } from './filterPresets';
import { HapticsService } from '../../services/hapticsService';

interface FilterSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  activeFilterId: FilterId;
  onSelectFilter: (filterId: FilterId) => void;
}

export const FilterSelectorModal: React.FC<FilterSelectorModalProps> = ({
  visible,
  onClose,
  activeFilterId,
  onSelectFilter,
}) => {
  return (
    <Modal visible={visible} onClose={onClose} title="Filters">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_PRESETS.map(filter => {
          const isSelected = activeFilterId === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => {
                HapticsService.light();
                onSelectFilter(filter.id);
              }}
              style={[
                styles.filterCard,
                isSelected && styles.selectedFilterCard,
              ]}
            >
              <View
                style={[
                  styles.colorPreview,
                  filter.colorOverlay
                    ? { backgroundColor: filter.colorOverlay }
                    : { backgroundColor: colors.surfaceHighlight },
                ]}
              />
              <Text
                style={[
                  styles.filterName,
                  isSelected && styles.selectedFilterName,
                ]}
                numberOfLines={1}
              >
                {filter.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  filterCard: {
    width: 76,
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedFilterCard: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surfaceElevated,
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterName: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedFilterName: {
    color: colors.text,
    fontWeight: '600',
  },
});
