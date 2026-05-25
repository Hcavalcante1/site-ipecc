import type { MenuOptionId } from "./types";

export type MenuOption = {
  id: MenuOptionId;
  key: string;
  label: string;
  path: string;
};

export const MENU_OPTIONS: MenuOption[] = [
  { id: "projetos", key: "1", label: "Projetos", path: "/projetos" },
  { id: "editais", key: "2", label: "Editais e chamadas", path: "/editais" },
  { id: "propostas", key: "3", label: "Enviar proposta", path: "/propostas" },
  {
    id: "transparencia",
    key: "4",
    label: "Transparência",
    path: "/transparencia",
  },
  { id: "eventos", key: "5", label: "Eventos", path: "/eventos" },
  { id: "equipe", key: "6", label: "Falar com a equipe", path: "/contato" },
];

const KEY_TO_ID = Object.fromEntries(
  MENU_OPTIONS.map((o) => [o.key, o.id])
) as Record<string, MenuOptionId>;

const ID_TO_OPTION = Object.fromEntries(
  MENU_OPTIONS.map((o) => [o.id, o])
) as Record<MenuOptionId, MenuOption>;

export function resolveMenuOption(
  input: string
): MenuOption | undefined {
  const t = input.trim().toLowerCase();
  const id = KEY_TO_ID[t];
  if (id) return ID_TO_OPTION[id];

  return MENU_OPTIONS.find(
    (o) =>
      t === o.id ||
      t.includes(o.label.toLowerCase()) ||
      (t.includes("equipe") && o.id === "equipe") ||
      (t.includes("atendente") && o.id === "equipe")
  );
}

export function menuPromptLines(): string[] {
  return [
    "Como posso ajudar?",
    ...MENU_OPTIONS.map((o) => `${o.key} — ${o.label}`),
    "_Digite o número ou *menu* para voltar._",
  ];
}
