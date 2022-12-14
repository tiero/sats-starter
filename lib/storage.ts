// swaps

export interface Data {
  projects: Project[];
}

export interface Project {
  title: string;
  contribution: Contribution;
}

export interface Contribution {
  sats: number;
  txid: string;
  privateKey: string;
}

const initialData = { projects: [] };

export const localStorageKey = "sats-starter-data";

function saveData(data: Data): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(localStorageKey, JSON.stringify(data));
}

function getData(): Data {
  if (typeof window === "undefined") return initialData;
  const stored = localStorage.getItem(localStorageKey);
  return stored ? JSON.parse(stored) : initialData;
}

export function addProjectToStore(project: Project): void {
  if (typeof window === "undefined") return;

  const data = getData();
  data.projects.push(project);
  saveData(data);
}
