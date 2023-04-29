import Head from "next/head";
import { useState } from "react";
import ProjectCard from "../components/card";
import Contribution from "../components/contribution";
import { basePath } from "../next.config";

import { address } from "liquidjs-lib";
import { projects } from "../config.json";

import { getParamsByScript, getProjectByTitle } from "../lib/storage";
import { buildDepositContract } from "../lib/contract";
import { ElectrumWS } from "ws-electrumx-client";
import { electrumURLForNetwork } from "../lib/constants";

import {Project} from "../lib/types";

export default function Home() {
  const [selected, setSelected] = useState<Project | null>(null);
  const [contributionModalIsVisible, setContributionModalAsVisible] =
    useState(false);

  const showModal = (project: Project) => {
    setSelected(project);
    setContributionModalAsVisible(true);
  };

  const hideModal = () => {
    setSelected(null);
    setContributionModalAsVisible(false);
  };

  const onContributionClick = (project: Project) => {
    showModal(project);
  };

  const onGoalReached = async (title: string) => {
    console.log(`Goal reached for ${title}`);
    const project = getProjectByTitle(title);
    if (!project) throw new Error("Project not found");
    const params = getParamsByScript(project.contribution.scriptHex);
    const { zkp, contract } = await buildDepositContract(params);
    const electrum = new ElectrumWS(
      electrumURLForNetwork("testnet"),
    );
    const unspents = await electrum.request("blockchain.scripthash.listunspent",);

    //const hex = goalReached(contract,)
  };


  return (
    <>
      <Head>
        <title>⚡️ Sats Starter</title>
        <meta
          name="description"
          content="Launch your crowdfunding campaign without intermediaries"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <section className="hero is-medium is-primary">
        <div className="hero-body">
          <h1 className="title">⚡️ Sats Starter</h1>
          <p className="subtitle">
            Launch your crowdfunding campaign without intermediaries
          </p>
        </div>
      </section>
      <section className="section">
        <h1 className="title">Latest projects</h1>
        <div className="container">
          <div className="columns">
            {
              projects.map(project => (
                <div className="column">
                  <ProjectCard
                    project={project}
                    //beneficiary={address.toOutputScript(project.beneficiaryAddress).toString("hex")}
                    onContributionClick={onContributionClick}
                    onGoalReached={onGoalReached}
                  />
                </div>
              ))
            }
          </div>
        </div>
      </section>
      {contributionModalIsVisible && selected ? (
        <Contribution
          title={selected.title}
          timeframe={timeframe}
          onCancel={hideModal}
        />
      ) : null}
    </>
  );
}
