import Image from "next/image";

interface ProjectCardProps {
  title: string;
  author: string;
  beneficiary: string;
  description: string;
  imageSrc: string;
  onContributionClick: (title: string, beneficiary: string) => void;
}

export default function ProjectCard({
  title,
  author,
  beneficiary,
  description,
  imageSrc,
  onContributionClick,
}: ProjectCardProps) {
  return (
    <div className="card" style={{ maxWidth: "320px" }}>
      <div className="card-image">
        <figure className="image is-4by3">
          <Image
            src={imageSrc}
            width={480}
            height={320}
            alt="Random unsplash image"
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
      <div className="columns is-centered">
        <div className="column is-half">
          <button
            className="button is-primary"
            onClick={() => onContributionClick(title, beneficiary)}
          >
            Contribute
          </button>
        </div>
      </div>
    </div>
  );
}
