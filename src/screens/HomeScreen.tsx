import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
} from 'react-native';
import { ThemedAlert as Alert } from '../services/alertService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from '../components/common/Button';
import { IconButton } from '../components/common/IconButton';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { AppIcon, IconName } from '../components/icons/AppIcons';
import { Project, ExportResult } from '../types/project';
import { useAppNavigation } from '../navigation/navigationContext';
import { ProjectStorage } from '../storage/projectStorage';
import { SharingService } from '../services/sharingService';
import { HapticsService } from '../services/hapticsService';
import { formatDuration } from '../utils/timeUtils';
import { formatFileSize } from '../utils/fileUtils';
import { BrandLogo } from '../components/common/BrandLogo';

interface QuickToolItem {
  id: string;
  name: string;
  icon: IconName;
  tagline: string;
}

const QUICK_TOOLS: QuickToolItem[] = [
  { id: 'trim', name: 'Trim Video', icon: 'scissors', tagline: 'Cut & slice' },
  {
    id: 'merge',
    name: 'Merge Videos',
    icon: 'merge',
    tagline: 'Combine clips',
  },
  { id: 'music', name: 'Add Music', icon: 'music', tagline: 'Soundtracks' },
  {
    id: 'speed',
    name: 'Video Speed',
    icon: 'speed',
    tagline: 'Slow-mo & fast',
  },
  {
    id: 'crop',
    name: 'Crop for Reels',
    icon: 'crop',
    tagline: '9:16 vertical',
  },
  {
    id: 'compress',
    name: 'Compress Video',
    icon: 'compress',
    tagline: 'Shrink file size',
  },
];

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [exportsList, setExportsList] = useState<ExportResult[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'exports'>(
    'projects',
  );

  // Rename modal
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [targetProject, setTargetProject] = useState<Project | null>(null);
  const [renameText, setRenameText] = useState('');

  const loadData = useCallback(async () => {
    try {
      const projList = await ProjectStorage.getAllProjects();
      const expList = await ProjectStorage.getAllExports();
      setProjects(projList);
      setExportsList(expList);
    } catch {
      Alert.alert(
        'Library Unavailable',
        'Saved projects could not be read. Please try again.',
      );
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewProject = () => {
    HapticsService.medium();
    navigation.navigate('MediaPicker');
  };

  const handleQuickTool = (tool: QuickToolItem) => {
    HapticsService.light();
    navigation.navigate('MediaPicker', { quickToolMode: tool.id });
  };

  const handleOpenProject = (project: Project) => {
    HapticsService.light();
    navigation.navigate('Editor', { project });
  };

  const handleDuplicateProject = async (id: string) => {
    HapticsService.light();
    try {
      await ProjectStorage.duplicateProject(id);
    } catch {
      Alert.alert('Save Failed', 'Could not duplicate this project.');
      return;
    }
    loadData();
  };

  const handleDeleteProject = (project: Project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            HapticsService.snap();
            try {
              await ProjectStorage.deleteProject(project.id);
            } catch {
              Alert.alert('Delete Failed', 'Could not delete this project.');
              return;
            }
            loadData();
          },
        },
      ],
    );
  };

  const handleOpenRename = (project: Project) => {
    setTargetProject(project);
    setRenameText(project.name);
    setRenameModalVisible(true);
  };

  const handleSaveRename = async () => {
    if (targetProject && renameText.trim()) {
      try {
        await ProjectStorage.renameProject(targetProject.id, renameText.trim());
      } catch {
        Alert.alert('Save Failed', 'Could not rename this project.');
        return;
      }
      setRenameModalVisible(false);
      loadData();
    }
  };

  const handleDeleteExport = (item: ExportResult) => {
    Alert.alert('Delete Export', `Delete "${item.projectName}" from exports?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          HapticsService.snap();
          try {
            await ProjectStorage.deleteExport(item.id);
          } catch {
            Alert.alert('Delete Failed', 'Could not delete this export.');
            return;
          }
          loadData();
        },
      },
    ]);
  };

  const handleShareExport = async (item: ExportResult) => {
    HapticsService.light();
    await SharingService.shareVideo(item.outputPath, item.projectName);
  };

  const formatEditedTime = (timestamp: number) => {
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <BrandLogo size="md" showTagline={true} />
        <IconButton
          name="sparkles"
          size={40}
          iconSize={20}
          color={colors.accent}
          onPress={() => {
            HapticsService.light();
            Alert.alert(
              'ClipVero',
              'Powerful Video Editing Made Simple.\nCREATE · EDIT · SHARE',
            );
          }}
        />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* + New Project Banner */}
        <View style={styles.heroSection}>
          <Pressable onPress={handleNewProject} style={styles.newProjectCard}>
            <View style={styles.newProjectIconCircle}>
              <AppIcon name="plus" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.newProjectTitle}>+ New Project</Text>
            <Text style={styles.newProjectSubtitle}>
              Powerful Video Editing Made Simple
            </Text>
          </Pressable>
        </View>

        {/* Quick Tools Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Tools</Text>
        </View>
        <View style={styles.quickToolsGrid}>
          {QUICK_TOOLS.map(tool => (
            <Pressable
              key={tool.id}
              onPress={() => handleQuickTool(tool)}
              style={styles.toolCard}
            >
              <View style={styles.toolIconWrapper}>
                <AppIcon name={tool.icon} size={20} color={colors.accent} />
              </View>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolTagline}>{tool.tagline}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tabs: Recent Projects vs Recent Exports */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => {
              HapticsService.light();
              setActiveTab('projects');
            }}
            style={[
              styles.tabButton,
              activeTab === 'projects' && styles.tabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'projects' && styles.tabTextActive,
              ]}
            >
              Recent Projects ({projects.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              HapticsService.light();
              setActiveTab('exports');
            }}
            style={[
              styles.tabButton,
              activeTab === 'exports' && styles.tabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'exports' && styles.tabTextActive,
              ]}
            >
              Recent Exports ({exportsList.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        {activeTab === 'projects' ? (
          projects.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <AppIcon name="sparkles" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No Projects Yet</Text>
              <Text style={styles.emptyStateDesc}>
                Tap + New Project to start your first edit
              </Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {projects.map(proj => {
                const totalDur = proj.clips.reduce(
                  (acc, c) => acc + c.duration,
                  0,
                );
                return (
                  <Card
                    key={proj.id}
                    onPress={() => handleOpenProject(proj)}
                    style={styles.projectCard}
                  >
                    <View style={styles.projectThumbWrapper}>
                      {proj.thumbnailUri ? (
                        <Image
                          source={{ uri: proj.thumbnailUri }}
                          style={styles.projectThumb}
                        />
                      ) : (
                        <View style={styles.thumbPlaceholder}>
                          <AppIcon
                            name="play"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}
                      <View style={styles.durationTag}>
                        <Text style={styles.durationTagText}>
                          {formatDuration(totalDur)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.projectMeta}>
                      <Text style={styles.projectName} numberOfLines={1}>
                        {proj.name}
                      </Text>
                      <Text style={styles.projectTime}>
                        Edited {formatEditedTime(proj.updatedAt)}
                      </Text>
                    </View>

                    <View style={styles.projectCardActions}>
                      <IconButton
                        name="text"
                        size={28}
                        iconSize={14}
                        onPress={() => handleOpenRename(proj)}
                        color={colors.textSecondary}
                      />
                      <IconButton
                        name="copy"
                        size={28}
                        iconSize={14}
                        onPress={() => handleDuplicateProject(proj.id)}
                        color={colors.textSecondary}
                      />
                      <IconButton
                        name="trash"
                        size={28}
                        iconSize={14}
                        onPress={() => handleDeleteProject(proj)}
                        color={colors.error}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )
        ) : exportsList.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <AppIcon name="export" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Exports Yet</Text>
            <Text style={styles.emptyStateDesc}>
              Exported videos will appear here ready to share
            </Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {exportsList.map(exp => (
              <View key={exp.id} style={styles.exportCard}>
                {exp.thumbnailUri ? (
                  <Image
                    source={{ uri: exp.thumbnailUri }}
                    style={styles.exportThumb}
                  />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <AppIcon
                      name="play"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <View style={styles.exportInfo}>
                  <Text style={styles.exportTitle} numberOfLines={1}>
                    {exp.projectName}
                  </Text>
                  <Text style={styles.exportMeta}>
                    {formatDuration(exp.duration)} • {exp.resolution} •{' '}
                    {formatFileSize(exp.fileSizeBytes)}
                  </Text>
                  <Text style={styles.exportDate}>
                    {new Date(exp.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.exportActionsRow}>
                  <IconButton
                    name="share"
                    size={36}
                    iconSize={18}
                    color={colors.accent}
                    onPress={() => handleShareExport(exp)}
                  />
                  <IconButton
                    name="trash"
                    size={36}
                    iconSize={18}
                    color={colors.error}
                    onPress={() => handleDeleteExport(exp)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        onClose={() => setRenameModalVisible(false)}
        title="Rename Project"
        type="center"
      >
        <TextInput
          value={renameText}
          onChangeText={setRenameText}
          placeholder="Project name"
          placeholderTextColor={colors.textMuted}
          style={styles.renameInput}
          autoFocus
        />
        <View style={styles.renameActions}>
          <Button
            title="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => setRenameModalVisible(false)}
          />
          <Button
            title="Save"
            variant="primary"
            size="sm"
            onPress={handleSaveRename}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  brandTitle: {
    ...typography.h1,
    fontSize: 26,
    color: colors.text,
  },
  brandTagline: {
    ...typography.captionBold,
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  heroSection: {
    marginVertical: spacing.sm,
  },
  newProjectCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  newProjectIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  newProjectTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  newProjectSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  sectionHeaderRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  quickToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toolCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toolIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  toolName: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
  },
  toolTagline: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },
  emptyStateBox: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyStateDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  cardsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  projectCard: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectThumbWrapper: {
    width: 60,
    height: 70,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  projectThumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationTag: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  durationTagText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  projectMeta: {
    flex: 1,
    marginLeft: spacing.md,
  },
  projectName: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 14,
  },
  projectTime: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  projectCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportThumb: {
    width: 60,
    height: 70,
    borderRadius: borderRadius.md,
  },
  exportInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  exportTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  exportMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  exportDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  exportActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  renameInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
