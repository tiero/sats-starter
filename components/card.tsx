import Image from "next/image";
import { Project } from "../lib/types";

interface ProjectCardProps {
  project: Project;
  onContributionClick: (project: Project) => void;
  onGoalReached: (title: string) => void;
}

export default function ProjectCard({
  project,
  onContributionClick,
  onGoalReached,
}: ProjectCardProps) {

  const { author, title, description, imagePath } = project;
  return (
    <div className="card" style={{ maxWidth: "320px" }}>
      <div className="card-image">
        <figure className="image is-4by3">
          <Image
            src={imagePath}
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
      <div className="buttons">
        <button
          className="button is-primary"
          onClick={() => onContributionClick(project)}
        >
          Contribute
        </button>
        <button
          className="button is-success"
          onClick={() => onGoalReached(title)}
        >
          Goal reached
        </button>
      </div>
    </div>
  );
}
