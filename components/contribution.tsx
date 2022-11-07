import { MouseEventHandler, useState } from "react";
import { fiatToSatoshis } from "bitcoin-conversion";
import Payment from "./payment";

interface ContributionProps {
  title: string;
  onCancel: MouseEventHandler;
}

enum Size {
  TO_BE_SELECTED,
  SMALL,
  MEDIUM,
  LARGE,
}

enum Stage {
  FORM,
  INVOICE,
  RESULT,
}

const sizeToAmount = {
  [Size.TO_BE_SELECTED]: 0,
  [Size.SMALL]: 15,
  [Size.MEDIUM]: 50,
  [Size.LARGE]: 100,
};

export default function Contribution({ onCancel, title }: ContributionProps) {
  const [sats, setSats] = useState<number>(0);
  const [size, setSize] = useState<Size>(Size.TO_BE_SELECTED);
  const [stage, setStage] = useState<Stage>(Stage.FORM);

  const onSizeChange = async (size: Size) => {
    const sats = await fiatToSatoshis(sizeToAmount[size], "USD");
    setSats(parseInt(sats.toString()));
    setSize(size);
  };

  const renderContent = () => {
    switch (stage) {
      case Stage.FORM:
        return renderForm();
      case Stage.INVOICE:
        return (
          <Payment
            sats={sats}
            network="testnet"
            onFailure={console.error}
            onSuccess={console.log}
          />
        );
      default:
        return <></>;
    }
  };

  const renderForm = () => {
    return (
      <div className="container">
        <div className="buttons are-medium">
          <button className="button" onClick={() => onSizeChange(Size.SMALL)}>
            💸 ${sizeToAmount[Size.SMALL]}
          </button>
          <button className="button" onClick={() => onSizeChange(Size.MEDIUM)}>
            💰 ${sizeToAmount[Size.MEDIUM]}
          </button>
          <button className="button" onClick={() => onSizeChange(Size.LARGE)}>
            🤑 ${sizeToAmount[Size.LARGE]}
          </button>
        </div>
        <div className="content">
          <div className="columns is-vcentered">
            <div className="column">
              <h1 className="title">Total ${sizeToAmount[size]}</h1>
              <p className="subtitle">{sats} sats</p>
            </div>
          </div>
        </div>
        <hr />
        <div className="buttons are-medium mt-4">
          <button
            className="button is-primary"
            onClick={() => setStage(Stage.INVOICE)}
          >
            Fund
          </button>
          <button className="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="modal is-active">
      <div className="modal-background" />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Contribute to {title}</p>
        </header>
        <section className="modal-card-body">{renderContent()}</section>
      </div>
      <button
        className="modal-close is-large"
        aria-label="close"
        onClick={onCancel}
      ></button>
    </div>
  );
}
