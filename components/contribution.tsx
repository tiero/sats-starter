import { MouseEventHandler, useState } from "react"

enum Size {
  TO_BE_SELECTED,
  SMALL,
  MEDIUM,
  LARGE
}

enum Status {
  FORM,
  INVOICE,
  RESULT
}

const sizeToAmount = {
  [Size.TO_BE_SELECTED]: 0,
  [Size.SMALL]: 10,
  [Size.MEDIUM]: 25,
  [Size.LARGE]: 100,
}

interface ContributionProps {
  title: string;
  onCancel: MouseEventHandler
}

export default function Contribution({ onCancel, title }: ContributionProps) {
  const [size, setSize] = useState<Size>(Size.TO_BE_SELECTED);
  const [status, setStatus] = useState<Status>(Status.FORM);

  const renderContent = () => {
    console.log(status)
    switch (status) {
      case Status.FORM:
        return renderForm();
      case Status.INVOICE:
        return renderInvoice();
      default:
        return <></>;
    }
  }

  const renderForm = () => {
    return (
      <div className="container">
        <div className="buttons are-medium">
          <button className="button" onClick={() => setSize(Size.SMALL)}>💸 ${sizeToAmount[Size.SMALL]}</button>
          <button className="button" onClick={() => setSize(Size.MEDIUM)}>💰 ${sizeToAmount[Size.MEDIUM]}</button>
          <button className="button" onClick={() => setSize(Size.LARGE)}>🤑 ${sizeToAmount[Size.LARGE]}</button>
        </div>
        <div className="content">
          <div className="columns" style={{ display: 'flex', flexDirection: 'row' }}>
            <div className="column mr-3">
              <h1 className="title">
                Total
              </h1>
            </div>
            <div className="column is-half">
              <h1 className="title">
                ${sizeToAmount[size]}
              </h1>
            </div>
          </div>
        </div>
        <hr />
        <div className="buttons are-medium mt-4">
        <button className="button is-primary" onClick={() => setStatus(Status.INVOICE)}>Fund</button>
        <button className="button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    )
  }

  const renderInvoice = () => {
    return (
      <>
        <p className="subtile">Copy invoice</p> 
      </>
    )
  }

  return (
    <div className="modal is-active">
      <div className="modal-background" />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Contribute to {title}</p>
        </header>
        <section className="modal-card-body">
          {renderContent()}
        </section>
      </div>
      <button className="modal-close is-large" aria-label="close" onClick={onCancel}></button>
    </div>
  )
}