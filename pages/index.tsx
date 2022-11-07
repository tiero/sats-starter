import Head from "next/head";
import { useState } from "react";
import ProjectCard from "../components/card";
import Contribution from "../components/contribution";

export default function Home() {
  const [selected, setSelected] = useState("");
  const [contributionModalIsVisible, setContributionModalAsVisible] =
    useState(false);

  const showModal = (title: string) => {
    setSelected(title);
    setContributionModalAsVisible(true);
  };

  const hideModal = () => {
    setSelected("");
    setContributionModalAsVisible(false);
  };

  const onContributionClick = (title: any) => {
    showModal(title);
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
            <div className="column is-3">
              <ProjectCard
                title="💸 My Project "
                description="plx need money"
                author="tiero"
                onContributionClick={onContributionClick}
              />
            </div>
            <div className="column is-3">
              <ProjectCard
                title="🚗 new car"
                description="plx need new car"
                author="tiero"
                onContributionClick={onContributionClick}
              />
            </div>
          </div>
        </div>
      </section>
      {contributionModalIsVisible ? (
        <Contribution title={selected} onCancel={hideModal} />
      ) : null}
    </>
  );
}
