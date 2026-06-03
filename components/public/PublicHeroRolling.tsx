import type { ReactNode } from "react";

type PublicHeroRollingProps = {
  bgImage: string;
  title: string;
  text?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
};

export default function PublicHeroRolling({
  bgImage,
  title,
  text,
  ariaLabel,
  children,
}: PublicHeroRollingProps) {
  return (
    <section className="hero-rolling" aria-label={ariaLabel ?? title}>
      <div
        className="hero-rolling__inner"
        style={{
          ["--hero-bg-image" as string]: `url("${bgImage}")`,
        }}
      >
        <h1 className="hero__title">{title}</h1>
        {text ? <p className="hero__text">{text}</p> : null}
        {children}
      </div>
    </section>
  );
}
