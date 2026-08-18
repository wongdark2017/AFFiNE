import { getStoreManager } from '@affine/core/blocksuite/manager/store';
import { ImportCommitService } from '@affine/core/desktop/dialogs/import/commit-service';
import { commitNativeImport } from '@affine/core/desktop/dialogs/import/native-backend';
import {
  preflightWebFilesImport,
  preflightWebMultiZipImport,
  preflightWebZipImport,
} from '@affine/core/desktop/dialogs/import/web-limits';
import { DebugLogger } from '@affine/debug';
import { snapshotFile } from '@blocksuite/affine/shared/utils';
import {
  BearTransformer,
  type ImportWarning,
  MarkdownTransformer,
  NotionHtmlTransformer,
  ObsidianTransformer,
  Unzip,
} from '@blocksuite/affine/widgets/linked-doc';
import { Service } from '@toeverything/infra';

import type { ExplorerIconService } from '../../explorer-icon/services/explorer-icon';
import type { OrganizeService } from '../../organize';
import type { TagService } from '../../tag';
import type { WorkspaceService } from '../../workspace';
import { getAFFiNEWorkspaceSchema } from '../../workspace';

const logger = new DebugLogger('import');

export type ImportRunContext = {
  signal?: AbortSignal;
  onProgress?: (progress: { completed: number; total: number }) => void;
  /**
   * When set, imported content is placed under this organize folder instead
   * of the organize root.
   */
  targetFolderId?: string;
};

export class ImportService extends Service {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly organizeService: OrganizeService,
    private readonly explorerIconService: ExplorerIconService,
    private readonly tagService: TagService
  ) {
    super();
  }

  async importMarkdownZip(file: File, context?: ImportRunContext) {
    if (!BUILD_CONFIG.isElectron) {
      await preflightWebZipImport(file);
    }
    return this.importSingleMarkdownZip(file, context);
  }

  /**
   * Imports multiple markdown zip files sequentially. Each zip is imported
   * with its own commit service, so the result is identical to importing the
   * zips one by one manually. A zip that fails to import is reported as a
   * warning and does not stop the remaining zips.
   */
  async importMarkdownZips(files: File[], context?: ImportRunContext) {
    const first = files[0];
    if (files.length === 1 && first) {
      // Preserve the single-zip behavior, including native intra-zip progress.
      return this.importMarkdownZip(first, context);
    }
    if (!BUILD_CONFIG.isElectron) {
      await preflightWebMultiZipImport(files);
    }

    const docIds: string[] = [];
    const warnings: ImportWarning[] = [];
    let rootFolderId: string | undefined;
    const total = files.length;
    let completed = 0;
    context?.onProgress?.({ completed, total });

    // Progress is reported at zip granularity; intra-zip progress from the
    // native session would make the progress label jump back and forth.
    const perZipContext: ImportRunContext = {
      signal: context?.signal,
      targetFolderId: context?.targetFolderId,
    };

    for (const file of files) {
      throwIfAborted(context?.signal);
      try {
        const result = await this.importSingleMarkdownZip(file, perZipContext);
        docIds.push(...result.docIds);
        warnings.push(...result.warnings);
        rootFolderId ??= result.rootFolderId;
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        logger.error(`Failed to import markdown zip: ${file.name}`, error);
        warnings.push({
          code: 'zip_import_failed',
          sourcePath: file.name,
          message: `Failed to import ${file.name}: ${errorMessage(error)}`,
        });
      }
      completed += 1;
      context?.onProgress?.({ completed, total });
    }

    if (!docIds.length) {
      const firstFailure = warnings.find(
        warning => warning.code === 'zip_import_failed'
      );
      throw new Error(
        firstFailure?.message ??
          'No importable documents were found in the selected files.'
      );
    }

    return { docIds, rootFolderId, warnings };
  }

  private async importSingleMarkdownZip(
    file: File,
    context?: ImportRunContext
  ) {
    const collection = this.workspaceService.workspace.docCollection;
    const commitService = this.createCommitService({
      organize: true,
      targetFolderId: context?.targetFolderId,
    });
    if (BUILD_CONFIG.isElectron) {
      return commitNativeImport('markdownZip', file, commitService, context);
    }

    const snapshot = await snapshotFile(file);
    const { batch } = await MarkdownTransformer.planMarkdownZip({
      collection,
      schema: getAFFiNEWorkspaceSchema(),
      imported: snapshot,
      extensions: getStoreManager().config.init().value.get('store'),
    });
    return commitService.commitBatch(batch);
  }

  async importNotionZip(file: File, context?: ImportRunContext) {
    const collection = this.workspaceService.workspace.docCollection;
    const commitService = this.createCommitService({
      organize: true,
      explorerIcon: true,
      targetFolderId: context?.targetFolderId,
    });
    if (BUILD_CONFIG.isElectron) {
      return commitNativeImport('notionZip', file, commitService, context);
    }

    await preflightWebZipImport(file);
    const snapshot = await snapshotFile(file);
    const format = await detectNotionZipFormat(snapshot);
    if (format === 'markdown') {
      const { batch } = await MarkdownTransformer.planNotionMarkdownZip({
        collection,
        schema: getAFFiNEWorkspaceSchema(),
        imported: snapshot,
        extensions: getStoreManager().config.init().value.get('store'),
      });
      return commitService.commitBatch(batch);
    }
    const { batch } = await NotionHtmlTransformer.planNotionHtmlZip({
      collection,
      schema: getAFFiNEWorkspaceSchema(),
      imported: snapshot,
      extensions: getStoreManager().config.init().value.get('store'),
    });
    return commitService.commitBatch(batch);
  }

  async importObsidianVault(files: File[], context?: ImportRunContext) {
    const collection = this.workspaceService.workspace.docCollection;
    const commitService = this.createCommitService({
      // Obsidian imports do not organize by default; only mount into the
      // organize tree when a target folder is requested.
      organize: !!context?.targetFolderId,
      explorerIcon: true,
      targetFolderId: context?.targetFolderId,
    });
    if (!BUILD_CONFIG.isElectron) {
      await preflightWebFilesImport(files);
    }
    if (BUILD_CONFIG.isElectron) {
      return commitNativeImport('obsidian', files, commitService, context);
    }
    const { files: snapshots, warnings } = await snapshotReadableFiles(files);
    if (!snapshots.length) {
      throw new Error('No readable files were found in the selected folder.');
    }

    const { batch } = await ObsidianTransformer.planObsidianVault({
      collection,
      schema: getAFFiNEWorkspaceSchema(),
      importedFiles: snapshots,
      extensions: getStoreManager().config.init().value.get('store'),
    });
    batch.warnings = [...(batch.warnings ?? []), ...warnings];
    return commitService.commitBatch(batch);
  }

  async importBearBackup(file: File, context?: ImportRunContext) {
    const collection = this.workspaceService.workspace.docCollection;
    const commitService = this.createCommitService({
      organize: true,
      tag: true,
      targetFolderId: context?.targetFolderId,
    });
    if (BUILD_CONFIG.isElectron) {
      return commitNativeImport('bearZip', file, commitService, context);
    }

    await preflightWebZipImport(file);
    const snapshot = await snapshotFile(file);
    const { batch } = await BearTransformer.planBearBackup({
      collection,
      schema: getAFFiNEWorkspaceSchema(),
      imported: snapshot,
      extensions: getStoreManager().config.init().value.get('store'),
    });
    return commitService.commitBatch(batch);
  }

  async importOneNote(file: File, context?: ImportRunContext) {
    if (!BUILD_CONFIG.isElectron) {
      throw new Error('OneNote import is only available in the desktop app.');
    }
    const commitService = this.createCommitService({
      organize: true,
      targetFolderId: context?.targetFolderId,
    });
    return commitNativeImport('oneNote', file, commitService, context);
  }

  private createCommitService(options: {
    organize?: boolean;
    explorerIcon?: boolean;
    tag?: boolean;
    targetFolderId?: string;
  }) {
    return new ImportCommitService({
      collection: this.workspaceService.workspace.docCollection,
      schema: getAFFiNEWorkspaceSchema(),
      extensions: getStoreManager().config.init().value.get('store'),
      organizeService: options.organize ? this.organizeService : undefined,
      explorerIconService: options.explorerIcon
        ? this.explorerIconService
        : undefined,
      tagService: options.tag ? this.tagService : undefined,
      targetFolderId: options.targetFolderId,
      logger,
    });
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Import cancelled', 'AbortError');
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message || error.name
    : 'Unknown error occurred';
}

async function detectNotionZipFormat(file: File): Promise<'markdown' | 'html'> {
  const unzip = new Unzip();
  await unzip.load(file);
  let hasHtml = false;
  for (const entry of unzip) {
    const lower = entry.path.toLowerCase();
    if (lower.endsWith('.md')) return 'markdown';
    if (lower.endsWith('.html') && !lower.endsWith('/index.html')) {
      hasHtml = true;
    }
  }
  if (hasHtml) return 'html';
  throw new Error('No Notion Markdown or HTML pages found in the archive');
}

async function snapshotReadableFiles(files: File[]) {
  const snapshots: File[] = [];
  const warnings: ImportWarning[] = [];
  for (const file of files) {
    try {
      snapshots.push(await snapshotFile(file));
    } catch (error) {
      const sourcePath = file.webkitRelativePath || file.name;
      const reason = error instanceof Error ? error.message : String(error);
      warnings.push({
        code: 'file-unreadable',
        message: `Skipped unreadable file: ${sourcePath}. ${reason}`,
        sourcePath,
      });
    }
  }
  return { files: snapshots, warnings };
}
