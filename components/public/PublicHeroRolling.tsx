type PublicHeroRollingProps = {
  bgImage: string;
  title: string;
  text?: string;
  ariaLabel?: string;
};

export default function PublicHeroRolling({
  bgImage,
  title,
  text,
  ariaLabel,
}: PublicHeroRollingProps) {
  return (
    <section className="hero-rolling" aria-label={ariaLabel}>
      <div
        className="hero-rolling__inner"
        style={{
          ["--hero-bg-image" as string]: `url("${bgImage}")`,
        }}
      >
        <h1 className="hero__title">{title}</h1>
        {text ? <p className="hero__text">{text}</p> : null}
      </div>
    </section>
  );
}
