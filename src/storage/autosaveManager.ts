/**
 * Autosave Manager
 * Automatically debounces project saves to prevent data loss without causing disk thrashing
 */

import { Project } from '../types/project';
import { ProjectStorage } from './projectStorage';

export class AutosaveManager {
  private static pendingProject: Project | null = null;
  private static saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private static debounceDelayMs = 600;

  /**
   * Schedule debounced save for the project
   */
  public static scheduleSave(project: Project) {
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
      this.pendingProject = null;
      await ProjectStorage.saveProject(proj);
    }
  }

  /**
   * Discards pending save (if user discards edits)
   */
  public static cancel() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.pendingProject = null;
  }
}
