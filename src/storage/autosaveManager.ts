/**
 * Autosave Manager
 * Automatically debounces project saves to prevent data loss without causing disk thrashing
 */

import { Project } from '../types/project';
import { ProjectStorage } from './projectStorage';
import { ThemedAlert } from '../services/alertService';

export class AutosaveManager {
  private static pendingProject: Project | null = null;
  private static saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private static debounceDelayMs = 600;
  private static revision = 0;

  /**
   * Schedule debounced save for the project
   */
  public static scheduleSave(project: Project) {
    this.revision += 1;
    this.pendingProject = project;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      await this.flush();
    }, this.debounceDelayMs);
  }

  /**
   * Immediately persist pending project changes
   */
  public static async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    if (this.pendingProject) {
      const proj = this.pendingProject;
      const revision = this.revision;
      this.pendingProject = null;
      try {
        await ProjectStorage.saveProject(proj);
      } catch {
        if (!this.pendingProject && this.revision === revision) this.pendingProject = proj;
        ThemedAlert.error(
          'Save Failed',
          'Your latest edits could not be saved. Check device storage and try again.',
        );
      }
    }
  }

  /**
   * Discards pending save (if user discards edits)
   */
  public static cancel() {
    this.revision += 1;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.pendingProject = null;
  }
}
