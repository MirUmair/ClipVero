/**
 * Clipvero Project Storage
 * Persistent local storage for editing projects and exported videos
 * Non-destructive metadata-based storage
 */

import { Project, ExportResult } from '../types/project';
import { NativeModules } from 'react-native';

const { ClipveroMediaEngine } = NativeModules;

const PROJECTS_KEY = 'clipvero_projects_list';
const EXPORTS_KEY = 'clipvero_exports_list';

// In-memory fallback cache (used in Jest or if native storage fails)
let inMemoryProjects: Record<string, Project> = {};
let inMemoryExports: Record<string, ExportResult> = {};

export class ProjectStorage {
  /**
   * Reads raw string from persistence (native file storage or memory)
   */
  private static async readString(key: string): Promise<string | null> {
    if (ClipveroMediaEngine?.readFile) {
      try {
        const content = await ClipveroMediaEngine.readFile(`${key}.json`);
        return content;
      } catch {
        // Fall back to memory
      }
    }
    return null;
  }

  /**
   * Writes string to persistence (native file storage or memory)
   */
  private static async writeString(
    key: string,
    content: string,
  ): Promise<void> {
    if (ClipveroMediaEngine?.saveFile) {
      try {
        await ClipveroMediaEngine.saveFile(`${key}.json`, content);
        return;
      } catch (e) {
        console.warn('Native write failed, using memory store:', e);
      }
    }
  }

  /**
   * Fetch all saved projects sorted by updatedAt descending
   */
  public static async getAllProjects(): Promise<Project[]> {
    try {
      const data = await this.readString(PROJECTS_KEY);
      if (data) {
        const list: Project[] = JSON.parse(data);
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    } catch (e) {
      console.warn('Failed to parse saved projects:', e);
    }

    return Object.values(inMemoryProjects).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }

  /**
   * Get single project by ID
   */
  public static async getProject(id: string): Promise<Project | null> {
    const list = await this.getAllProjects();
    const found = list.find(p => p.id === id);
    if (found) return found;
    return inMemoryProjects[id] || null;
  }

  /**
   * Save or update an existing project (non-destructive)
   */
  public static async saveProject(project: Project): Promise<void> {
    const updated: Project = {
      ...project,
      updatedAt: Date.now(),
    };

    inMemoryProjects[updated.id] = updated;

    try {
      const list = await this.getAllProjects();
      const index = list.findIndex(p => p.id === updated.id);
      if (index >= 0) {
        list[index] = updated;
      } else {
        list.unshift(updated);
      }
      await this.writeString(PROJECTS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to persist project:', e);
    }
  }

  /**
   * Delete project by ID
   */
  public static async deleteProject(id: string): Promise<void> {
    delete inMemoryProjects[id];
    try {
      const list = await this.getAllProjects();
      const filtered = list.filter(p => p.id !== id);
      await this.writeString(PROJECTS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete project:', e);
    }
  }

  /**
   * Duplicate project with a new ID and updated timestamp
   */
  public static async duplicateProject(id: string): Promise<Project | null> {
    const existing = await this.getProject(id);
    if (!existing) return null;

    const duplicated: Project = {
      ...JSON.parse(JSON.stringify(existing)),
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${existing.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveProject(duplicated);
    return duplicated;
  }

  /**
   * Rename an existing project
   */
  public static async renameProject(
    id: string,
    newName: string,
  ): Promise<Project | null> {
    const project = await this.getProject(id);
    if (!project) return null;

    project.name = newName.trim();
    project.updatedAt = Date.now();
    await this.saveProject(project);
    return project;
  }

  // --- Exports Storage ---

  public static async getAllExports(): Promise<ExportResult[]> {
    try {
      const data = await this.readString(EXPORTS_KEY);
      if (data) {
        const list: ExportResult[] = JSON.parse(data);
        return list.sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch (e) {
      console.warn('Failed to parse exports:', e);
    }

    return Object.values(inMemoryExports).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }

  public static async saveExport(result: ExportResult): Promise<void> {
    inMemoryExports[result.id] = result;
    try {
      const list = await this.getAllExports();
      const index = list.findIndex(e => e.id === result.id);
      if (index >= 0) {
        list[index] = result;
      } else {
        list.unshift(result);
      }
      await this.writeString(EXPORTS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save export result:', e);
    }
  }

  public static async deleteExport(id: string): Promise<void> {
    delete inMemoryExports[id];
    try {
      const list = await this.getAllExports();
      const filtered = list.filter(e => e.id !== id);
      await this.writeString(EXPORTS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete export:', e);
    }
  }

  /**
   * Clears in-memory storage (useful for unit tests)
   */
  public static clearMemoryCache() {
    inMemoryProjects = {};
    inMemoryExports = {};
  }
}
