import Head from "next/head";
import { useState } from "react";
import ProjectCard from "../components/card";
import Contribution from "../components/contribution";

export default function Home() {
  const [selected, setSelected] = useState<{title: string; beneficiary: string} | null>(null);
  const [contributionModalIsVisible, setContributionModalAsVisible] =
    useState(false);

  const showModal = (title: string, beneficiary: string) => {
    setSelected({title, beneficiary});
    setContributionModalAsVisible(true);
  };

  const hideModal = () => {
    setSelected(null);
    setContributionModalAsVisible(false);
  };

  const onContributionClick = (title: string, beneficiary: string) => {
    showModal(title, beneficiary);
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
                beneficiary="00143801cbe7007c4ce139ef7a48f492f239f700c315"
                onContributionClick={onContributionClick}
              />
            </div>
            <div className="column is-3">
              <ProjectCard
                title="🚗 new car"
                description="plx need new car"
                author="tiero"
                beneficiary="00143801cbe7007c4ce139ef7a48f492f239f700c315"
                onContributionClick={onContributionClick}
              />
            </div>
          </div>
        </div>
      </section>
      {contributionModalIsVisible && selected ? (
        <Contribution title={selected.title} beneficiary={selected.beneficiary} onCancel={hideModal} />
      ) : null}
    </>
  );
}
