/** Live env snapshot the header renders in the right column */
export interface HeaderEnv {
  cwd: string;
  gitDirty: number;
  gitBranch: string | undefined;

  /** Combined display name, e.g. `"Model (Provider)"` (provider embedded) */
  modelName: string | undefined;
}
