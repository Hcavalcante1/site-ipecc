/** Links oficiais das redes sociais (topbar e rodapé). */

export type PublicSocialLink = {
  id: string;
  href: string;
  label: string;
};

export const PUBLIC_SOCIAL_LINKS: PublicSocialLink[] = [
  {
    id: "instagram",
    href: "https://www.instagram.com/ipecc.sp/",
    label: "Instagram",
  },
  {
    id: "facebook",
    href: "https://www.facebook.com/profile.php?id=61580740405079",
    label: "Facebook",
  },
  {
    id: "youtube",
    href: "https://www.youtube.com/@InstitutoPaulistaIPECC",
    label: "YouTube",
  },
  {
    id: "linkedin",
    href: "https://www.linkedin.com/in/instituto-paulista-ipecc-9037b73b6/",
    label: "LinkedIn",
  },
  {
    id: "tiktok",
    href: "https://www.tiktok.com/@ipecc.sp",
    label: "TikTok",
  },
];
