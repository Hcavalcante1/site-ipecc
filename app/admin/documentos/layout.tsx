import RequireAdminModulo from "../components/RequireAdminModulo";

export default function DocumentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAdminModulo modulo="documentos">{children}</RequireAdminModulo>
  );
}
