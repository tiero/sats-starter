import Image from 'next/image';

interface ProjectCardProps {
  title: string;
  author: string;
  description: string;
  onContributionClick: (title: string) => void;
}

export default function ProjectCard({ title, author, description, onContributionClick }: ProjectCardProps) {
  return (
    <div className="card m-6" style={{ maxWidth: '320px' }}>
      <div className="card-image">
        <figure className="image is-4by3">
          <Image
            src="https://bulma.io/images/placeholders/1280x960.png"
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
          <p className="subtitle">
            {description}
          </p>
        </div>
      </div>
      <footer className="card-footer mt-3">
        <button className="button is-primary" onClick={() => onContributionClick(title)}>
          Contribute
        </button>
      </footer>
    </div>

  )
}