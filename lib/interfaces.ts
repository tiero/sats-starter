export interface Project {
  title: string;
  contribution: Contribution;
}

export interface Contribution {
  sats: number;
  txid: string;
}