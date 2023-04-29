// swaps

import { Argument } from "@ionio-lang/ionio";

export interface Data {
  projects: SelectedProject[];
  scripts: ScriptHexToParams;
}

export interface SelectedProject {
  title: string;
  contribution: Contribution;
}


export interface ScriptHexToParams {
  [key: string]: {[name: string]: Argument};
}

export interface Contribution {
  sats: number;
  txid: string;
  privateKey: string;
  scriptHex: string;
}

const initialData = { projects: [], scripts: {} };

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

export function addProjectToStore(project: SelectedProject): void {
  if (typeof window === "undefined") return;

  const data = getData();
  data.projects.push(project);
  saveData(data);
}

export function getProjectByTitle (id: string): SelectedProject | undefined {
  const data = getData();
  return data.projects.find((project) => project.title === id);
}


export function getScripts() {
  const data = getData();
  return data.scripts;
}

export function getParamsByScript(scriptHex: string) {
  const data = getData();
  return data.scripts[scriptHex];
}

export function addScriptToStore(script: string, params: {[name: string]: Argument}){
  if (typeof window === "undefined") return;

  const data = getData();
  data.scripts = {...data.scripts, [script]: params};
  saveData(data);
}
