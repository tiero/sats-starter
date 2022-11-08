import Image from "next/image";

interface ProjectCardProps {
  title: string;
  author: string;
  beneficiary: string;
  description: string;
  onContributionClick: (title: string, beneficiary: string) => void;
}

export default function ProjectCard({
  title,
  author,
  beneficiary,
  description,
  onContributionClick,
}: ProjectCardProps) {
  return (
    <div className="card" style={{ maxWidth: "320px" }}>
      <div className="card-image">
        <figure className="image is-4by3">
          <Image
            src="/images/1280x960.png"
            width={480}
            height={320}
            alt="Placeholder image"
          />
        </figure>
      </div>
      <div className="card-content">
        <div className="media">
          <div className="media-content">
            <p className="title is-4">{title}</p>
            <p className="subtitle is-6">@{author}</p>
          </div>
        </div>
        <div className="content">
          <p className="subtitle">{description}</p>
        </div>
      </div>
      <footer className="card-footer">
        <button
          className="button is-primary"
          onClick={() => onContributionClick(title, beneficiary)}
        >
          Contribute
        </button>
      </footer>
    </div>
  );
}
