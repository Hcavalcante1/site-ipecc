import RequireAdminModulo from "../components/RequireAdminModulo";

export default function DigitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAdminModulo modulo="digital">{children}</RequireAdminModulo>;
}
